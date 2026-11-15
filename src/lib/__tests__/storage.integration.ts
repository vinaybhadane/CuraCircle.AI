import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService, dbService } from '../db/database';
import { FirestoreStore } from '../db/firestore-store';
import { GET, POST } from '@/app/api/adherence/route';
import { setIdentity } from '../auth/session';

const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new Error('These tests require a localhost FIRESTORE_EMULATOR_HOST; they never access production.');
const projectId = `demo-curacircle-${process.pid}`;
const app = initializeApp({ projectId }, projectId);
const firestore = getFirestore(app);
const first = new DatabaseService(new FirestoreStore(firestore));
const second = new DatabaseService(new FirestoreStore(firestore));
const fixture = dbService.createSeedData();
fixture.profiles[0].ownerUid = 'storage-owner';
fixture.members[0].firebaseUid = 'storage-owner';
fixture.medications[0].pillCountCurrent = 10;
fixture.doseLogs = [];
fixture.auditLogs = [];

beforeEach(async () => {
  const response = await fetch(`http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`, { method: 'DELETE' });
  expect(response.ok).toBe(true);
  await first.runExclusive(async () => { Object.assign(first.getDb(), structuredClone(fixture)); first.save(); });
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => { await firestore.terminate(); await deleteApp(app); });

describe('Real Firestore persistence across isolated API workers', () => {
  it('GET schedule on worker A, take on worker B, and retry after a cold start preserve one dose and one inventory decrement', async () => {
    let active = first;
    vi.spyOn(dbService, 'getDb').mockImplementation(() => active.getDb());
    vi.spyOn(dbService, 'save').mockImplementation(() => active.save());
    vi.spyOn(dbService, 'runExclusive').mockImplementation((operation, scope) => active.runExclusive(operation, scope));
    const token = setIdentity(NextResponse.json({}), { uid: 'storage-owner', email: fixture.members[0].email, name: 'Patient', isDemo: false, profileId: fixture.profiles[0].id }).cookies.get('curacircle_token')!.value;
    const request = (body?: unknown) => new NextRequest('http://localhost/api/adherence', { method: body ? 'POST' : 'GET', headers: { cookie: `curacircle_token=${token}`, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const schedule = await GET(request()); expect(schedule.status).toBe(200);
    const dose = (await schedule.json()).doses.find((d: { medicationId: string }) => d.medicationId === fixture.medications[0].id);
    active = second;
    const taken = await POST(request({ doseId: dose.id, action: 'TAKEN' }));
    expect(taken.status).toBe(200); expect((await taken.json()).dose.status).toBe('TAKEN');
    active = new DatabaseService(new FirestoreStore(firestore));
    expect((await POST(request({ doseId: dose.id, action: 'TAKEN' }))).status).toBe(200);
    await active.runExclusive(async () => {
      expect(active.getDb().medications.find((m) => m.id === fixture.medications[0].id)?.pillCountCurrent).toBe(9);
      expect(active.getDb().doseLogs.filter((d) => d.id === dose.id)).toHaveLength(1);
      expect(active.getDb().auditLogs.filter((a) => a.action === 'DOSE_MARKED_TAKEN' && a.details.includes(dose.medicationName))).toHaveLength(1);
    });
  });
  it('serializes simultaneous changes from different workers without losing either update', async () => {
    await Promise.all([first, second].map((worker) => worker.runExclusive(async () => {
      const med = worker.getDb().medications.find((m) => m.id === fixture.medications[0].id)!;
      await new Promise((resolve) => setTimeout(resolve, 50));
      med.pillCountCurrent--; worker.save();
    })));
    await second.runExclusive(async () => expect(second.getDb().medications.find((m) => m.id === fixture.medications[0].id)?.pillCountCurrent).toBe(8));
  });
  it('persists deletions and does not resurrect removed records on another worker', async () => {
    await first.runExclusive(async () => { first.getDb().medications = []; first.save(); });
    await second.runExclusive(async () => expect(second.getDb().medications).toEqual([]));
  });
  it('scopes reads without deleting unloaded collections or another circle', async () => {
    await first.runExclusive(async () => {
      first.getDb().medications.push({ ...fixture.medications[0], id: 'other-med', profileId: 'other-circle' });
      first.getDb().auditLogs.push({ id: 'old-audit', profileId: fixture.profiles[0].id, action: 'EXISTING', actorName: 'Owner', actorRole: 'ELDER', details: 'Old event', timestamp: new Date().toISOString() });
    });
    await second.runExclusive(async () => {
      expect(second.getDb().medications.some((m) => m.id === 'other-med')).toBe(false);
      expect(second.getDb().auditLogs).toEqual([]);
      second.getDb().medications = [];
    }, { profileId: fixture.profiles[0].id, tables: ['profiles', 'members', 'medications'] });
    await first.runExclusive(async () => {
      expect(first.getDb().medications.map((m) => m.id)).toEqual(['other-med']);
      expect(first.getDb().auditLogs.map((a) => a.id)).toEqual(['old-audit']);
    });
  });
  it('rolls back a failed operation and releases its lease', async () => {
    await expect(first.runExclusive(async () => { first.getDb().medications = []; first.save(); throw new Error('test failure'); })).rejects.toThrow('test failure');
    await second.runExclusive(async () => expect(second.getDb().medications).toHaveLength(fixture.medications.length));
  });
  it('does not persist partially mutated state from an API error response', async () => {
    await first.runExclusive(async () => { first.getDb().medications = []; return NextResponse.json({ error: 'Invalid' }, { status: 400 }); });
    await second.runExclusive(async () => expect(second.getDb().medications).toHaveLength(fixture.medications.length));
  });
  it('refuses an expired worker commit and keeps the stored records intact', async () => {
    await expect(first.runExclusive(async () => {
      first.getDb().medications = [];
      await firestore.collection('_curacircleLocks').doc('care-circle').update({ expiresAt: 0 });
    })).rejects.toThrow('timed out');
    await second.runExclusive(async () => expect(second.getDb().medications).toHaveLength(fixture.medications.length));
  });
});
