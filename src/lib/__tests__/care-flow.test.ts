import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { createCircle, OnboardingSchema } from '../services/circle.service';
import { readIdentity, setIdentity, type SessionIdentity } from '../auth/session';
import { dbService } from '../db/database';
import { MedicationCreateSchema } from '../validations/schemas';
import { GET as getMedications, PUT as updateMedication } from '@/app/api/medications/route';
import { POST as addMember, DELETE as removeMember } from '@/app/api/members/route';
import { GET as getNotifications, PATCH as readNotifications } from '@/app/api/notifications/route';
import { DELETE as excludeDose } from '@/app/api/adherence/route';
import { POST as applyPrescription } from '@/app/api/prescriptions/apply/route';
import { POST as scanPrescription } from '@/app/api/gemini/scan-prescription/route';
import { scheduleWithGemini } from '../services/prescription.service';
import { AdherenceService } from '../services/adherence.service';
import { POST as googleSession, GET as getSession, DELETE as signOutSession } from '@/app/api/auth/session/route';
import { EmailService } from '../services/email.service';
import { POST as completeOnboarding } from '@/app/api/onboarding/route';

const generate = vi.hoisted(() => vi.fn());
const verifyToken = vi.hoisted(() => vi.fn());
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateContent: generate }; } }));
vi.mock('@/lib/firebase/admin', () => ({ getAdminAuth: () => ({ verifyIdToken: verifyToken }) }));
const owner: SessionIdentity = { uid: 'google-patient', email: 'patient@example.com', name: 'Google account name', isDemo: false };
const input = { role: 'ELDER' as const, memberName: 'Manual Patient', patientName: 'Manual Patient', patientAge: 65, timezone: 'Asia/Kolkata',
  familyMembers: [{ name: 'Family One', email: 'one@example.com' }, { name: 'Family Two', email: 'two@example.com' }] };
function create() { return createCircle(owner, OnboardingSchema.parse(input)); }
function request(path: string, identity?: SessionIdentity, body?: unknown, method = 'GET') {
  const token = identity ? setIdentity(NextResponse.json({}), identity).cookies.get('curacircle_token')!.value : '';
  return new NextRequest(`http://localhost:3000${path}`, { method,
    headers: { cookie: `curacircle_token=${token}`, ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
function medication(name = 'Prescription Medicine') {
  return MedicationCreateSchema.parse({ name, dosage: '5 mg', form: 'TABLET', instructions: 'Take one tablet at 08:00', purpose: 'Not stated in prescription',
    foodRequirement: 'NO_RESTRICTION', frequency: 'DAILY', scheduledTimes: ['08:00'], startDate: '2026-11-15' });
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); generate.mockReset(); verifyToken.mockReset(); });

describe('Google care circle onboarding and authorization', () => {
  it('reports missing production session configuration without exposing secrets', async () => {
    vi.stubEnv('JWT_SECRET', '');
    const response = await googleSession(request('/api/auth/session', undefined, { idToken: 'google-token' }, 'POST'));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'AUTH_CONFIGURATION_ERROR', error: expect.stringContaining('JWT_SECRET') });
    expect(verifyToken).not.toHaveBeenCalled();
  });
  it('reports a server configuration error rather than an expired session for an existing cookie', async () => {
    const signedRequest = request('/api/auth/session', owner);
    vi.stubEnv('JWT_SECRET', '');
    const response = await getSession(signedRequest);
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('AUTH_CONFIGURATION_ERROR');
  });
  it('isolates Google verification failures from session checks and sign-out', async () => {
    verifyToken.mockRejectedValueOnce(Object.assign(new Error('SDK dependency import failed'), { code: 'ERR_REQUIRE_ESM' }));
    const response = await googleSession(request('/api/auth/session', undefined, { idToken: 'google-token' }, 'POST'));
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('AUTH_SERVICE_UNAVAILABLE');
    expect((await getSession(request('/api/auth/session'))).status).toBe(401);
    expect((await signOutSession(request('/api/auth/session', undefined, undefined, 'DELETE'))).status).toBe(200);
  });
  it('continues to reject an invalid Google token as an authentication failure', async () => {
    verifyToken.mockRejectedValueOnce(Object.assign(new Error('Invalid token'), { code: 'auth/invalid-id-token' }));
    expect((await googleSession(request('/api/auth/session', undefined, { idToken: 'invalid' }, 'POST'))).status).toBe(401);
  });
  it('completes onboarding using the existing signed Google session cookie', async () => {
    const response = await completeOnboarding(request('/api/onboarding', owner, input, 'POST'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.profile.elderName).toBe(input.patientName);
    const token = response.cookies.get('curacircle_token')?.value;
    expect(token).toBeTruthy();
    const restored = await getSession(new NextRequest('http://localhost:3000/api/auth/session', { headers: { cookie: `curacircle_token=${token}` } }));
    expect((await restored.json()).needsOnboarding).toBe(false);
  });
  it('renews the signed cookie when selecting an authorized patient circle', async () => {
    const { profile } = create();
    const response = await googleSession(request('/api/auth/session', owner, { profileId: profile.id }, 'POST'));
    expect(response.status).toBe(200);
    expect(response.cookies.get('curacircle_token')?.value).toBeTruthy();
  });
  it('does not expose JWT timing claims as application identity fields', () => {
    expect(Object.keys(readIdentity(request('/api/auth/session', owner))).sort()).toEqual(Object.keys(owner).sort());
  });
  it('resumes an already saved onboarding without duplicate family members or invitations', async () => {
    const { profile } = create();
    const db = dbService.getDb();
    const memberCount = db.members.length;
    const emailCount = db.dispatchedEmails.length;
    const response = await completeOnboarding(request('/api/onboarding', owner, input, 'POST'));
    expect(response.status).toBe(200);
    expect((await response.json()).profile.id).toBe(profile.id);
    expect(dbService.getDb().members).toHaveLength(memberCount);
    expect(dbService.getDb().dispatchedEmails).toHaveLength(emailCount);
    expect(response.cookies.get('curacircle_token')?.value).toBeTruthy();
  });
  it('verifies Google ID tokens on the server and rejects anonymous Firebase identities', async () => {
    verifyToken.mockResolvedValueOnce({ uid: owner.uid, email: owner.email, email_verified: true, firebase: { sign_in_provider: 'anonymous' } });
    expect((await googleSession(request('/api/auth/session', undefined, { idToken: 'anonymous-token' }, 'POST'))).status).toBe(403);
    verifyToken.mockResolvedValueOnce({ uid: owner.uid, email: owner.email, email_verified: true, firebase: { sign_in_provider: 'google.com' } });
    const response = await googleSession(request('/api/auth/session', undefined, { idToken: 'google-token' }, 'POST'));
    expect(response.status).toBe(200);
    expect((await response.json()).needsOnboarding).toBe(true);
    expect(response.cookies.get('curacircle_token')?.value).toBeTruthy();
  });
  it('never returns patient data or shared PINs to an unauthenticated visitor', async () => {
    const response = await getSession(request('/api/auth/session'));
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.profile).toBeUndefined(); expect(data.suggestedPasscodes).toBeUndefined();
  });
  it('omits passcode hashes from authenticated profile responses', async () => {
    create();
    const data = await (await getSession(request('/api/auth/session', owner))).json();
    expect(data.profile.elderPasscodeHash).toBeUndefined();
    expect(data.profile.caregiverPasscodeHash).toBeUndefined();
  });
  it('allows flexible family members and rejects duplicate emails', () => {
    expect(OnboardingSchema.safeParse({ ...input, familyMembers: input.familyMembers.slice(0, 1) }).success).toBe(true);
    expect(() => createCircle(owner, OnboardingSchema.parse({ ...input, familyMembers: [input.familyMembers[0], input.familyMembers[0]] }))).toThrow('different email');
  });
  it('creates only manually entered patient details with no medicines or fake statistics', () => {
    const { profile } = create();
    expect(profile.elderName).toBe('Manual Patient');
    expect(profile.allergies).toEqual([]);
    expect(dbService.getDb().medications.filter((m) => m.profileId === profile.id)).toEqual([]);
    expect(AdherenceService.getAdherenceStats(profile.id)).toMatchObject({ totalDosesScheduledToday: 0, currentStreakDays: 0, sevenDayComplianceRate: 0 });
  });
  it('rejects unauthenticated reads and another patient’s profile ID', async () => {
    create();
    expect((await getMedications(request('/api/medications'))).status).toBe(401);
    expect((await getMedications(request('/api/medications?profileId=profile_eleanor_vance_01', owner))).status).toBe(403);
  });
  it('links a verified invited family email and lets family edit, while ignoring spoofed roles', async () => {
    const { profile } = create();
    const db = dbService.getDb();
    db.medications.push({ ...medication(), id: 'owned-medicine', profileId: profile.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); dbService.save();
    const family = { uid: 'google-family', email: 'one@example.com', name: 'Family One', isDemo: false };
    const response = await updateMedication(request('/api/medications', family, { id: 'owned-medicine', updates: { scheduledTimes: ['09:00'], profileId: 'profile_eleanor_vance_01' }, actorRole: 'CLINICIAN', actorName: 'Spoofed actor' }, 'PUT'));
    expect(response.status).toBe(200);
    expect(dbService.getDb().medications.find((m) => m.id === 'owned-medicine')).toMatchObject({ profileId: profile.id, scheduledTimes: ['09:00'] });
    expect(dbService.getDb().auditLogs.find((a) => a.profileId === profile.id && a.action === 'MEDICATION_UPDATED')?.actorRole).toBe('FAMILY_MEMBER');
    expect(dbService.getDb().notifications.some((n) => n.profileId === profile.id && n.title.includes('Schedule updated'))).toBe(true);
  });
  it('rejects record IDs from another circle and uninvited users', async () => {
    create();
    expect((await updateMedication(request('/api/medications', owner, { id: 'med_lisinopril', updates: { dosage: '99 mg' } }, 'PUT'))).status).toBe(404);
    expect((await getMedications(request('/api/medications', { ...owner, uid: 'stranger', email: 'stranger@example.com' }))).status).toBe(409);
  });
  it('limits invitations to the profile owner and protects owner and elder from deletion', async () => {
    const { members } = create();
    expect((await removeMember(request(`/api/members?id=${members[0].id}`, owner, undefined, 'DELETE'))).status).toBe(400);
    expect((await addMember(request('/api/members', { ...owner, uid: 'family', email: 'one@example.com' }, { name: 'New Member', email: 'new@example.com' }, 'POST'))).status).toBe(403);
  });
  it('returns and marks read only the signed-in member’s notifications', async () => {
    const { profile, members } = create();
    dbService.getDb().notifications.push(...members.slice(0, 2).map((m, i) => ({ id: `notification_${i}`, profileId: profile.id, memberId: m.id, title: 'Care update', message: 'Updated', createdAt: new Date().toISOString() }))); dbService.save();
    const data = await (await getNotifications(request('/api/notifications', owner))).json();
    expect(data.notifications.map((n: { id: string }) => n.id)).toEqual(['notification_0']);
    await readNotifications(request('/api/notifications', owner, {}, 'PATCH'));
    expect(dbService.getDb().notifications.find((n) => n.id === 'notification_0')?.readAt).toBeTruthy();
    expect(dbService.getDb().notifications.find((n) => n.id === 'notification_1')?.readAt).toBeUndefined();
  });
});

describe('Email delivery reporting', () => {
  it('records a provider rejection as failed, while retaining the in-app alert', async () => {
    const { profile, members } = create();
    vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('BREVO_API_KEY', 'test-provider-key'); vi.stubEnv('SMTP_HOST', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    const email = await EmailService.dispatchEmail(profile.id, members[1].email, members[1].name, 'Care update', '<p>Schedule changed</p>', 'SCHEDULE_UPDATED');
    expect(email.status).toBe('FAILED');
    expect(dbService.getDb().notifications.some((n) => n.memberId === members[1].id && n.title === 'Care update')).toBe(true);
  });
});

describe('Gemini prescription scheduling', () => {
  it('removes a single day’s dose without recreating it on refresh', async () => {
    const { profile } = create();
    dbService.getDb().medications.push({ ...medication(), startDate: '2020-01-01', id: 'excluded', profileId: profile.id, createdAt: '', updatedAt: '' }); dbService.save();
    const doses = AdherenceService.getDosesForDate(profile.id, '2026-11-15');
    expect((await excludeDose(request(`/api/adherence?id=${encodeURIComponent(doses[0].id)}`, owner, undefined, 'DELETE'))).status).toBe(200);
    expect(AdherenceService.getDosesForDate(profile.id, '2026-11-15')).toHaveLength(0);
    expect(AdherenceService.getDosesForDate(profile.id, '2026-11-16')).toHaveLength(1);
  });
  it('fails honestly with no API key and creates no medication', async () => {
    const { profile } = create(); vi.stubEnv('GEMINI_API_KEY', '');
    const response = await scanPrescription(request('/api/gemini/scan-prescription', owner, { imageBase64: 'aGVsbG9wcmVzY3JpcHRpb24=', mimeType: 'image/png' }, 'POST'));
    expect(response.status).toBe(503);
    expect(dbService.getDb().medications.filter((m) => m.profileId === profile.id)).toHaveLength(0);
  });
  it('uses Gemini to extract all medicines and validates the result', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    generate.mockResolvedValue({ text: JSON.stringify({ medications: [medication('Medicine One'), medication('Medicine Two')], warnings: [] }) });
    const result = await scheduleWithGemini('base64-image', 'image/png', { name: 'Manual Patient', timezone: 'Asia/Kolkata', today: '2026-11-15' });
    expect(result.medications).toHaveLength(2);
    expect(generate.mock.calls[0][0].contents[0].parts[1]).toEqual({ inlineData: { data: 'base64-image', mimeType: 'image/png' } });
    expect(generate.mock.calls[0][0].config.responseMimeType).toBe('application/json');
  });
  it('does not substitute a predefined medicine when Gemini fails or returns invalid data', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    generate.mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(scheduleWithGemini('image', 'image/png', { name: 'Patient', timezone: 'UTC', today: '2026-11-15' })).rejects.toThrow('No schedule was created');
    generate.mockResolvedValueOnce({ text: JSON.stringify({ medications: [{ name: 'Incomplete' }], warnings: [] }) });
    await expect(scheduleWithGemini('image', 'image/png', { name: 'Patient', timezone: 'UTC', today: '2026-11-15' })).rejects.toThrow('valid schedule');
  });
  it('saves a Gemini draft once and notifies both family members', async () => {
    const { profile, members } = create();
    dbService.getDb().prescriptionDrafts.push({ id: 'gemini-draft', profileId: profile.id, medications: [medication('First Medicine'), medication('Second Medicine')], warnings: [], createdAt: new Date().toISOString() }); dbService.save();
    expect((await applyPrescription(request('/api/prescriptions/apply', owner, { draftId: 'gemini-draft' }, 'POST'))).status).toBe(200);
    expect((await applyPrescription(request('/api/prescriptions/apply', owner, { draftId: 'gemini-draft' }, 'POST'))).status).toBe(200);
    expect(dbService.getDb().medications.filter((m) => m.profileId === profile.id)).toHaveLength(2);
    const notices = dbService.getDb().notifications.filter((n) => n.profileId === profile.id);
    expect(notices).toHaveLength(2);
    expect(new Set(notices.map((n) => n.memberId))).toEqual(new Set(members.slice(1).map((m) => m.id)));
    expect(dbService.getDb().dispatchedEmails.filter((e) => e.profileId === profile.id).every((e) => e.status === 'SIMULATED')).toBe(true);
  });
  it('does not keep old dose times after a family member changes the schedule', async () => {
    const { profile } = create();
    dbService.getDb().medications.push({ ...medication(), startDate: '2020-01-01', id: 'rescheduled', profileId: profile.id, createdAt: '', updatedAt: '' }); dbService.save();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    AdherenceService.getDosesForDate(profile.id, today);
    await updateMedication(request('/api/medications', owner, { id: 'rescheduled', updates: { scheduledTimes: ['23:59'] } }, 'PUT'));
    expect(AdherenceService.getDosesForDate(profile.id, today).map((d) => d.scheduledTime)).toEqual(['23:59']);
  });
});


describe('Family reminder delivery', () => {
  it('uses the patient timezone, alerts both family members and deduplicates a repeat tick', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-15T02:15:00Z'));
    const { profile, members } = create();
    dbService.getDb().medications.push({ ...medication(), id: 'upcoming', profileId: profile.id, createdAt: '', updatedAt: '' }); dbService.save();
    await EmailService.runNotificationChecks(profile.id);
    await EmailService.runNotificationChecks(profile.id);
    const reminders = dbService.getDb().dispatchedEmails.filter((e) => e.profileId === profile.id && e.triggerType === 'UPCOMING_DOSE');
    expect(reminders).toHaveLength(3);
    expect(new Set(reminders.map((e) => e.to))).toEqual(new Set(members.map((m) => m.email)));
  });
  it('escalates a dose already marked missed by the adherence endpoint', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-15T04:00:00Z'));
    const { profile, members } = create();
    dbService.getDb().medications.push({ ...medication(), id: 'missed', profileId: profile.id, createdAt: '', updatedAt: '' }); dbService.save();
    AdherenceService.getDosesForDate(profile.id, '2026-11-15');
    AdherenceService.detectMissedDoses(profile.id);
    await EmailService.runNotificationChecks(profile.id);
    const reminders = dbService.getDb().dispatchedEmails.filter((e) => e.profileId === profile.id && e.triggerType === 'MISSED_DOSE_ESCALATION');
    expect(reminders).toHaveLength(2);
    expect(new Set(reminders.map((e) => e.to))).toEqual(new Set(members.slice(1).map((m) => m.email)));
  });
});
