import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '../db/database';
import { createCircle, OnboardingSchema } from '../services/circle.service';
import { setIdentity, findMembership, type SessionIdentity } from '../auth/session';
import { GET as sessionGET, POST as sessionPOST } from '@/app/api/auth/session/route';
import { GET as adherenceGET, POST as adherencePOST } from '@/app/api/adherence/route';
import { GET as cronGET } from '@/app/api/scheduler/tick/route';
import { AdherenceService } from '../services/adherence.service';
import { MedicationService } from '../services/medication.service';
import { AppointmentService } from '../services/appointment.service';
import { AppointmentCreateSchema, DateOnlySchema, MedicationCreateSchema } from '../validations/schemas';
import { circleClock } from '../time';

const identity: SessionIdentity = { uid: 'regression-owner', email: 'owner@example.com', name: 'Owner', isDemo: false };
function setupCircle() {
  const { profile } = createCircle(identity, OnboardingSchema.parse({ role: 'ELDER', memberName: 'Owner', patientName: 'Patient', patientAge: 65, timezone: 'Asia/Kolkata' }));
  const med = { ...dbService.getDb().medications[0], id: 'med_regression', profileId: profile.id, pillCountCurrent: 10, startDate: '2026-01-01' };
  dbService.getDb().medications.push(med); dbService.save();
  return { profile, med };
}
function request(path: string, body?: unknown, user = identity) {
  const token = setIdentity(NextResponse.json({}), user).cookies.get('curacircle_token')!.value;
  return new NextRequest(`http://localhost:3000${path}`, { method: body ? 'POST' : 'GET', headers: { cookie: `curacircle_token=${token}`, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('Missing dose and account access regressions', () => {
  it('records a current scheduled dose even if the legacy worker never persisted its generated log', async () => {
    const { profile, med } = setupCircle();
    const doseId = `dose_${med.id}_${circleClock(profile.id).date}_08:00`;
    const response = await adherencePOST(request('/api/adherence', { doseId, action: 'TAKEN' }));
    expect(response.status).toBe(200);
    expect((await response.json()).dose.status).toBe('TAKEN');
    expect(dbService.getDb().medications.find((m) => m.id === med.id)?.pillCountCurrent).toBe(9);
    expect((await adherencePOST(request('/api/adherence', { doseId, action: 'TAKEN' }))).status).toBe(200);
    expect(dbService.getDb().medications.find((m) => m.id === med.id)?.pillCountCurrent).toBe(9);
  });
  it('rejects fabricated, cross-circle and excluded doses without changing inventory', async () => {
    const { profile, med } = setupCircle();
    const dose = AdherenceService.getDosesForDate(profile.id, circleClock(profile.id).date)[0];
    dose.excluded = true; dbService.save();
    for (const doseId of [dose.id, dbService.getDb().doseLogs[0].id, `dose_${med.id}_${circleClock(profile.id).date}_03:17`]) {
      expect((await adherencePOST(request('/api/adherence', { doseId, action: 'TAKEN' }))).status).toBe(404);
    }
    expect(dbService.getDb().medications.find((m) => m.id === med.id)?.pillCountCurrent).toBe(10);
  });
  it('never restores removed membership or makes the visitor the patient owner from stale JWT claims', () => {
    const before = JSON.stringify(dbService.getDb());
    expect(findMembership({ ...identity, profileId: 'missing-circle', role: 'ELDER' })).toBeUndefined();
    expect(JSON.stringify(dbService.getDb())).toBe(before);
  });
  it('never exposes unrelated circle names to an account without membership', async () => {
    const response = await sessionGET(request('/api/auth/session'));
    expect((await response.json()).circles).toEqual([]);
    const switchResponse = await sessionPOST(request('/api/auth/session', { profileId: 'arbitrary-circle' }));
    expect(switchResponse.status).toBe(403);
  });
  it('rejects invalid dates before generating dose logs', async () => {
    setupCircle();
    const count = dbService.getDb().doseLogs.length;
    expect((await adherenceGET(request('/api/adherence?date=2026-02-30'))).status).toBe(400);
    expect(dbService.getDb().doseLogs).toHaveLength(count);
  });
});

describe('Schedule and reminder regressions', () => {
  it('expires a snooze and clears old skip/snooze details after a taken action', () => {
    const { profile } = setupCircle();
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-16T02:40:00Z'));
    const dose = AdherenceService.getDosesForDate(profile.id, circleClock(profile.id).date)[0];
    AdherenceService.logDoseAction(dose.id, 'SNOOZED', { actorName: 'Patient', actorRole: 'ELDER', snoozeMinutes: 15 });
    vi.setSystemTime(new Date('2026-11-16T02:56:00Z'));
    AdherenceService.detectMissedDoses(profile.id);
    expect(dose.status).toBe('PENDING');
    AdherenceService.logDoseAction(dose.id, 'TAKEN', { actorName: 'Patient', actorRole: 'ELDER' });
    expect(dose.snoozeMinutes).toBeUndefined();
  });
  it('rebuilds pending doses when frequency changes while preserving completed history', () => {
    const { profile, med } = setupCircle();
    const date = '2026-12-02';
    const dose = AdherenceService.getDosesForDate(profile.id, date)[0];
    MedicationService.updateMedication(med.id, { frequency: 'WEEKLY', startDate: '2026-12-01' }, 'Owner', 'ELDER');
    expect(AdherenceService.getDosesForDate(profile.id, date)).toEqual([]);
    expect(dbService.getDb().doseLogs.some((log) => log.id === dose.id)).toBe(false);
  });
  it('preserves taken doses when a medicine is removed', () => {
    const { profile, med } = setupCircle();
    const dose = AdherenceService.getDosesForDate(profile.id, circleClock(profile.id).date)[0];
    AdherenceService.logDoseAction(dose.id, 'TAKEN', { actorName: 'Patient', actorRole: 'ELDER' });
    MedicationService.deleteMedication(med.id, 'Owner', 'ELDER');
    expect(AdherenceService.getDosesForDate(profile.id, dose.scheduledDate)).toContainEqual(expect.objectContaining({ id: dose.id, status: 'TAKEN' }));
  });
  it('resets appointment reminders when the appointment is rescheduled', () => {
    const apt = dbService.getDb().appointments[0]; apt.remindersSent = { reminder24h: true, reminder2h: true }; dbService.save();
    const updated = AppointmentService.updateAppointment(apt.id, { appointmentDateTime: '2026-12-15T09:00:00Z' }, 'Owner', 'ELDER');
    expect(updated?.remindersSent).toEqual({});
  });
  it('rejects impossible calendar dates, duplicate times and invalid appointment timestamps', () => {
    expect(DateOnlySchema.safeParse('2026-02-30').success).toBe(false);
    expect(DateOnlySchema.safeParse('2024-02-29').success).toBe(true);
    expect(MedicationCreateSchema.safeParse({ ...dbService.getDb().medications[0], scheduledTimes: ['08:00', '08:00'] }).success).toBe(false);
    expect(AppointmentCreateSchema.safeParse({ ...dbService.getDb().appointments[0], appointmentDateTime: 'not-a-real-date' }).success).toBe(false);
  });
  it('rejects a multibyte cron secret without throwing a buffer-length error', async () => {
    vi.stubEnv('CRON_SECRET', 'abc');
    const response = await cronGET(new NextRequest('http://localhost/api/scheduler/tick', { headers: { authorization: 'Bearer ééé' } }));
    expect(response.status).toBe(401);
  });
});
