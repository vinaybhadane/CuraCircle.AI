import { dbService } from '../db/database';
import { circleClock } from '../time';
import { AdherenceService } from './adherence.service';
import { MedicationService } from './medication.service';
import { AppointmentService } from './appointment.service';

// Reuse the request's storage snapshot instead of making separate API reads.
export function dashboardSnapshot(profileId: string, memberId: string) {
  const date = circleClock(profileId).date;
  AdherenceService.getDosesForDate(profileId, date);
  AdherenceService.detectMissedDoses(profileId);
  const notifications = dbService.getDb().notifications.filter((n) => n.profileId === profileId && n.memberId === memberId);
  return {
    medications: MedicationService.getMedications(profileId),
    doses: AdherenceService.getDosesForDate(profileId, date),
    stats: AdherenceService.getAdherenceStats(profileId),
    appointments: AppointmentService.getAppointments(profileId),
    notifications, unreadCount: notifications.filter((n) => !n.readAt).length,
  };
}
