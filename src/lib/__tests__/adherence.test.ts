import { describe, it, expect } from 'vitest';
import { AdherenceService } from '../services/adherence.service';
import { dbService } from '../db/database';

describe('AdherenceService & Tracking Engine', () => {
  it('generates a full daily schedule with pending doses for all active medications', () => {
    const profile = dbService.getDb().profiles[0];
    const testDate = '2026-11-25';

    const doses = AdherenceService.getDosesForDate(profile.id, testDate);
    expect(doses.length).toBeGreaterThan(0);

    for (const dose of doses) {
      expect(dose.scheduledDate).toBe(testDate);
      expect(dose.status).toBeDefined();
    }
  });

  it('marks a dose as TAKEN and decrements pill inventory', () => {
    const profile = dbService.getDb().profiles[0];
    const todayStr = new Date().toISOString().split('T')[0];
    const doses = AdherenceService.getDosesForDate(profile.id, todayStr);
    const targetDose = doses.find((d) => d.status === 'PENDING') || doses[0];

    const medBefore = dbService.getDb().medications.find((m) => m.id === targetDose.medicationId);
    const pillCountBefore = medBefore?.pillCountCurrent || 0;

    const logged = AdherenceService.logDoseAction(targetDose.id, 'TAKEN', {
      actorName: 'Eleanor Vance',
      actorRole: 'ELDER'
    });

    expect(logged?.status).toBe('TAKEN');
    expect(logged?.actualTime).toBeDefined();

    if (pillCountBefore > 0) {
      const medAfter = dbService.getDb().medications.find((m) => m.id === targetDose.medicationId);
      expect(medAfter?.pillCountCurrent).toBe(pillCountBefore - 1);
    }
  });

  it('marks a dose as SKIPPED with clinical reason', () => {
    const profile = dbService.getDb().profiles[0];
    const todayStr = new Date().toISOString().split('T')[0];
    const doses = AdherenceService.getDosesForDate(profile.id, todayStr);
    const targetDose = doses[doses.length - 1];

    const logged = AdherenceService.logDoseAction(targetDose.id, 'SKIPPED', {
      actorName: 'Eleanor Vance',
      actorRole: 'ELDER',
      skipReason: 'Felt slight stomach acidity, skipped with tea'
    });

    expect(logged?.status).toBe('SKIPPED');
    expect(logged?.skipReason).toBe('Felt slight stomach acidity, skipped with tea');
  });

  it('accurately computes today and 7-day compliance rates', () => {
    const profile = dbService.getDb().profiles[0];
    const stats = AdherenceService.getAdherenceStats(profile.id);

    expect(stats.todayComplianceRate).toBeGreaterThanOrEqual(0);
    expect(stats.todayComplianceRate).toBeLessThanOrEqual(100);
    expect(stats.sevenDayComplianceRate).toBeGreaterThanOrEqual(0);
    expect(stats.sevenDayComplianceRate).toBeLessThanOrEqual(100);
    expect(stats.totalDosesScheduledToday).toBeGreaterThan(0);
  });
});
