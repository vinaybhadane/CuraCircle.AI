import { dbService } from './db/database';

export function circleClock(profileId: string, now = new Date()) {
  const timezone = dbService.getDb().profiles.find((p) => p.id === profileId)?.timezone || 'UTC';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return { date: `${part('year')}-${part('month')}-${part('day')}`, minutes: Number(part('hour')) * 60 + Number(part('minute')) };
}
