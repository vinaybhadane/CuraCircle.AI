import { describe, it, expect } from 'vitest';
import { MedicationService } from '../services/medication.service';
import { dbService } from '../db/database';

describe('MedicationService CRUD & Management', () => {
  it('retrieves active medications sorted by schedule time', () => {
    const profile = dbService.getDb().profiles[0];
    const meds = MedicationService.getMedications(profile.id, true);

    expect(meds.length).toBeGreaterThan(0);
    expect(meds[0].scheduledTimes[0]).toBeDefined();
  });

  it('adds a new medication and records audit log', () => {
    const profile = dbService.getDb().profiles[0];
    const initialMedsCount = MedicationService.getMedications(profile.id).length;

    const newMed = MedicationService.addMedication(
      profile.id,
      {
        name: 'Omeprazole',
        genericName: 'Omeprazole Magnesium',
        dosage: '20 mg',
        form: 'CAPSULE',
        color: '#a855f7',
        shape: 'Purple capsule',
        instructions: 'Take 1 capsule before breakfast for acid reflux prevention.',
        purpose: 'Acid reflux and stomach lining protection.',
        foodRequirement: 'BEFORE_MEAL',
        frequency: 'DAILY',
        scheduledTimes: ['07:30'],
        active: true,
        pillCountCurrent: 28,
        pillCountRefillThreshold: 7,
        prescribedBy: 'Dr. Evelyn Reed, MD',
        startDate: '2026-11-01'
      },
      'Nurse David',
      'PRIMARY_CAREGIVER'
    );

    expect(newMed.id).toBeDefined();
    expect(newMed.name).toBe('Omeprazole');

    const updatedMeds = MedicationService.getMedications(profile.id);
    expect(updatedMeds.length).toBe(initialMedsCount + 1);

    // Verify audit entry exists
    const auditLogs = dbService.getDb().auditLogs;
    const addedAudit = auditLogs.find((a) => a.action === 'MEDICATION_ADDED' && a.details.includes('Omeprazole'));
    expect(addedAudit).toBeDefined();
  });

  it('updates an existing medication details', () => {
    const profile = dbService.getDb().profiles[0];
    const med = MedicationService.getMedications(profile.id)[0];

    const updated = MedicationService.updateMedication(
      med.id,
      { instructions: 'Take with warm water strictly after breakfast.' },
      'Nurse David',
      'PRIMARY_CAREGIVER'
    );

    expect(updated).not.toBeNull();
    expect(updated?.instructions).toBe('Take with warm water strictly after breakfast.');
  });

  it('adjusts pill refill counts correctly', () => {
    const profile = dbService.getDb().profiles[0];
    const med = MedicationService.getMedications(profile.id)[0];

    const adjusted = MedicationService.updateRefillCount(med.id, 50);
    expect(adjusted?.pillCountCurrent).toBe(50);
  });
});
