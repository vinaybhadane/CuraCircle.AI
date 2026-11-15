import { dbService } from '../db/database';
import { DoseLog, DoseStatus, AdherenceStats, Role } from '../types';
import { AuthService } from './auth.service';
import { circleClock } from '@/lib/time';
import { isScheduledOn } from '@/lib/schedule';

export class AdherenceService {
  /**
   * Generates or retrieves the dose schedule for a given date (YYYY-MM-DD)
   */
  public static getDosesForDate(profileId: string, dateStr: string): DoseLog[] {
    const db = dbService.getDb();
    const activeMeds = db.medications.filter((m) => m.profileId === profileId && m.active);

    // Get existing logs for this date
    const existingLogs = db.doseLogs.filter(
      (log) => log.profileId === profileId && log.scheduledDate === dateStr && (['TAKEN', 'SKIPPED'].includes(log.status) || activeMeds.some((m) => m.id === log.medicationId && m.scheduledTimes.includes(log.scheduledTime) && isScheduledOn(m, dateStr)))
    );

    const logMap = new Map<string, DoseLog>();
    for (const log of existingLogs) {
      logMap.set(`${log.medicationId}_${log.scheduledTime}`, log);
    }

    let modified = false;

    // Ensure every scheduled time for each active med has a log entry
    for (const med of activeMeds) {
      if (!isScheduledOn(med, dateStr)) continue;
      for (const time of med.scheduledTimes) {
        const key = `${med.id}_${time}`;
        if (!logMap.has(key)) {
          const newLog: DoseLog = {
            id: `dose_${med.id}_${dateStr}_${time}`,
            profileId,
            medicationId: med.id,
            medicationName: med.name,
            dosage: med.dosage,
            scheduledTime: time,
            scheduledDate: dateStr,
            status: 'PENDING'
          };
          db.doseLogs.push(newLog);
          logMap.set(key, newLog);
          modified = true;
        }
      }
    }

    if (modified) {
      dbService.save();
    }

    const allDosesForDate = Array.from(logMap.values()).filter((log) => !log.excluded);

    // Sort by scheduled time ascending
    return allDosesForDate.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  }

  /**
   * Logs an action taken on a specific dose (TAKEN, SKIPPED, SNOOZED)
   */
  public static logDoseAction(
    doseId: string,
    action: DoseStatus,
    options: {
      actorName: string;
      actorRole: Role;
      actorMemberId?: string;
      skipReason?: string;
      snoozeMinutes?: number;
      notes?: string;
    }
  ): DoseLog | null {
    const db = dbService.getDb();
    const dose = db.doseLogs.find((d) => d.id === doseId);
    if (!dose || dose.excluded) return null;

    if (dose.status === 'TAKEN') return dose;
    delete dose.skipReason;
    delete dose.snoozeMinutes;
    dose.status = action;
    dose.actualTime = new Date().toISOString();
    dose.takenByMemberId = options.actorMemberId;
    dose.takenByRole = options.actorRole;

    if (action === 'SKIPPED') {
      dose.skipReason = options.skipReason || 'Unspecified reason';
    } else if (action === 'SNOOZED') {
      dose.snoozeMinutes = options.snoozeMinutes || 15;
    }

    if (options.notes) {
      dose.notes = options.notes;
    }

    // Decrement pill count if TAKEN
    if (action === 'TAKEN') {
      const med = db.medications.find((m) => m.id === dose.medicationId);
      if (med && med.pillCountCurrent > 0) {
        med.pillCountCurrent = Math.max(0, med.pillCountCurrent - 1);
        med.updatedAt = new Date().toISOString();
      }
    }

    dbService.save();

    AuthService.recordAudit(
      dose.profileId,
      options.actorRole,
      `DOSE_MARKED_${action}`,
      `Dose ${dose.medicationName} (${dose.dosage}) scheduled for ${dose.scheduledTime} marked as ${action} by ${options.actorName}.${options.skipReason ? ` Reason: ${options.skipReason}` : ''}`
    );

    return dose;
  }

  /**
   * Identifies pending doses that have passed their scheduled time + grace period
   * and marks them as MISSED
   */
  public static detectMissedDoses(profileId: string, gracePeriodMinutes: number = 30): DoseLog[] {
    const db = dbService.getDb();
    const { date: todayStr, minutes: nowTotalMinutes } = circleClock(profileId);

    const missed: DoseLog[] = [];

    const todayDoses = db.doseLogs.filter(
      (d) => d.profileId === profileId && d.scheduledDate === todayStr && !d.excluded && ['PENDING', 'SNOOZED'].includes(d.status)
    );

    for (const dose of todayDoses) {
      if (dose.status === 'SNOOZED') {
        if (dose.actualTime && Date.now() < Date.parse(dose.actualTime) + (dose.snoozeMinutes || 15) * 60000) continue;
        dose.status = 'PENDING';
        dbService.save();
      }
      const [h, m] = dose.scheduledTime.split(':').map(Number);
      const scheduledTotalMinutes = h * 60 + m;

      if (nowTotalMinutes > scheduledTotalMinutes + gracePeriodMinutes) {
        dose.status = 'MISSED';
        missed.push(dose);

        AuthService.recordAudit(
          profileId,
          'ELDER',
          'DOSE_MISSED_AUTO_DETECT',
          `Automated safety monitor flagged ${dose.medicationName} scheduled at ${dose.scheduledTime} as MISSED (+${gracePeriodMinutes}m grace period exceeded).`
        );
      }
    }

    if (missed.length > 0) {
      dbService.save();
    }

    return missed;
  }

  /**
   * Calculates comprehensive adherence statistics
   */
  public static getAdherenceStats(profileId: string): AdherenceStats {
    const db = dbService.getDb();
    const todayStr = circleClock(profileId).date;
    const todayDoses = this.getDosesForDate(profileId, todayStr);

    const totalDosesScheduledToday = todayDoses.length;
    const dosesTakenToday = todayDoses.filter((d) => d.status === 'TAKEN').length;
    const dosesSkippedToday = todayDoses.filter((d) => d.status === 'SKIPPED').length;
    const dosesMissedToday = todayDoses.filter((d) => d.status === 'MISSED').length;

    const evaluatedToday = dosesTakenToday + dosesSkippedToday + dosesMissedToday;
    const todayComplianceRate = evaluatedToday > 0 ? Math.round((dosesTakenToday / evaluatedToday) * 100) : 0;

    // 7-day adherence calculation
    const sevenDaysAgo = new Date(`${todayStr}T12:00:00Z`);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const pastSevenDaysLogs = db.doseLogs.filter(
      (d) => d.profileId === profileId && !d.excluded && d.scheduledDate >= sevenDaysAgoStr && d.scheduledDate <= todayStr
    );

    const totalSevenDayTaken = pastSevenDaysLogs.filter((d) => d.status === 'TAKEN').length;
    const totalSevenDayDecided = pastSevenDaysLogs.filter((d) => ['TAKEN', 'SKIPPED', 'MISSED'].includes(d.status)).length;
    const sevenDayComplianceRate = totalSevenDayDecided > 0 ? Math.round((totalSevenDayTaken / totalSevenDayDecided) * 100) : 0;

    // Calculate streak (consecutive days with 100% or >= 80% adherence)
    let currentStreakDays = 0;
    for (let offset = 0; offset < 365; offset++) {
      const day = new Date(`${todayStr}T12:00:00Z`);
      day.setUTCDate(day.getUTCDate() - offset);
      const logs = db.doseLogs.filter((d) => d.profileId === profileId && !d.excluded && d.scheduledDate === day.toISOString().slice(0, 10));
      if (!logs.length || logs.some((d) => d.status !== 'TAKEN')) break;
      currentStreakDays++;
    }

    return {
      todayComplianceRate,
      sevenDayComplianceRate,
      totalDosesScheduledToday,
      dosesTakenToday,
      dosesSkippedToday,
      dosesMissedToday,
      currentStreakDays
    };
  }
}
