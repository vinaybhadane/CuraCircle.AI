import { dbService } from '../db/database';
import { Medication, Role } from '../types';
import { AuthService } from './auth.service';
import { circleClock } from '@/lib/time';
import { isScheduledOn } from '@/lib/schedule';

export class MedicationService {
  public static getMedications(profileId: string, activeOnly: boolean = false): Medication[] {
    const db = dbService.getDb();
    let meds = db.medications.filter((m) => m.profileId === profileId);
    if (activeOnly) {
      meds = meds.filter((m) => m.active);
    }
    // Sort by morning schedule time ascending
    return meds.sort((a, b) => {
      const timeA = a.scheduledTimes[0] || '00:00';
      const timeB = b.scheduledTimes[0] || '00:00';
      return timeA.localeCompare(timeB);
    });
  }

  public static getMedicationById(id: string): Medication | undefined {
    const db = dbService.getDb();
    return db.medications.find((m) => m.id === id);
  }

  public static addMedication(
    profileId: string,
    data: Omit<Medication, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>,
    actorName: string,
    actorRole: Role
  ): Medication {
    const db = dbService.getDb();
    const newMed: Medication = {
      ...data,
      id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      profileId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.medications.push(newMed);
    dbService.save();

    AuthService.recordAudit(
      profileId,
      actorRole,
      'MEDICATION_ADDED',
      `Added medication ${newMed.name} (${newMed.dosage}) scheduled at [${newMed.scheduledTimes.join(', ')}] by ${actorName}.`
    );

    return newMed;
  }

  public static updateMedication(
    id: string,
    updates: Partial<Omit<Medication, 'id' | 'profileId' | 'createdAt'>>,
    actorName: string,
    actorRole: Role
  ): Medication | null {
    const db = dbService.getDb();
    const index = db.medications.findIndex((m) => m.id === id);
    if (index === -1) return null;

    const existing = db.medications[index];
    const updated: Medication = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    db.medications[index] = updated;

    const today = circleClock(existing.profileId).date;
    // Preserve completed history; rebuild future pending doses at the edited times.
    db.doseLogs = db.doseLogs.filter((dose) => dose.medicationId !== id || dose.scheduledDate < today || dose.status === 'TAKEN' || dose.status === 'SKIPPED' || (isScheduledOn(updated, dose.scheduledDate) && updated.scheduledTimes.includes(dose.scheduledTime)));
    // Keep pending labels in sync with prescription edits.
    for (const dose of db.doseLogs) {
      if (dose.medicationId === id && dose.scheduledDate >= today && !['TAKEN', 'SKIPPED'].includes(dose.status)) {
        if (updates.name) dose.medicationName = updates.name;
        if (updates.dosage) dose.dosage = updates.dosage;
      }
    }

    dbService.save();

    AuthService.recordAudit(
      updated.profileId,
      actorRole,
      'MEDICATION_UPDATED',
      `Updated medication ${updated.name} (${updated.dosage}) by ${actorName}.`
    );

    return updated;
  }

  public static deleteMedication(id: string, actorName: string, actorRole: Role): boolean {
    const db = dbService.getDb();
    const index = db.medications.findIndex((m) => m.id === id);
    if (index === -1) return false;

    const med = db.medications[index];
    db.medications.splice(index, 1);
    // Remove future reminders while retaining completed and historical records.
    const today = circleClock(med.profileId).date;
    db.doseLogs = db.doseLogs.filter((d) => d.medicationId !== id || d.scheduledDate < today || ['TAKEN', 'SKIPPED', 'MISSED'].includes(d.status));
    dbService.save();

    AuthService.recordAudit(
      med.profileId,
      actorRole,
      'MEDICATION_DELETED',
      `Removed medication ${med.name} from active care profile by ${actorName}.`
    );

    return true;
  }

  public static updateRefillCount(id: string, newCount: number): Medication | null {
    const db = dbService.getDb();
    const med = db.medications.find((m) => m.id === id);
    if (!med) return null;

    med.pillCountCurrent = Math.max(0, newCount);
    med.updatedAt = new Date().toISOString();
    dbService.save();

    return med;
  }
}
