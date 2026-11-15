import type { Medication } from './types';

export function isScheduledOn(medication: Medication, date: string): boolean {
  if (!medication.active || medication.frequency === 'AS_NEEDED' || date < medication.startDate || (medication.endDate && date > medication.endDate)) return false;
  const days = Math.round((Date.parse(date) - Date.parse(medication.startDate)) / 86400000);
  if (!Number.isFinite(days)) return false;
  return !(medication.frequency === 'EVERY_OTHER_DAY' && days % 2 !== 0) && !(medication.frequency === 'WEEKLY' && days % 7 !== 0);
}
