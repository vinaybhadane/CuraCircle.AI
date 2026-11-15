import { randomUUID } from 'crypto';
import { dbService } from '@/lib/db/database';
import { EmailService } from './email.service';
import type { CareCircleMember, CareCircleProfile } from '@/lib/types';

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
}
export class NotificationService {
  static add(profileId: string, memberId: string, title: string, message: string) {
    const db = dbService.getDb();
    db.notifications.unshift({ id: `notification_${randomUUID()}`, profileId, memberId, title, message, createdAt: new Date().toISOString() });
    dbService.save();
  }
  static async invite(profile: CareCircleProfile, member: CareCircleMember) {
    const title = `You joined ${profile.elderName}’s care circle`;
    const message = 'Sign in with Google using this email address to view notifications and add or modify the patient’s schedule.';
    return EmailService.dispatchEmail(profile.id, member.email, member.name, title,
      `<p>Hello ${escapeHtml(member.name)},</p><p>${escapeHtml(title)}.</p><p>${escapeHtml(message)}</p>`, 'MEMBER_INVITED');
  }
  static async scheduleChanged(profile: CareCircleProfile, actor: string, summary: string) {
    const db = dbService.getDb();
    const medications = db.medications.filter((m) => m.profileId === profile.id && m.active);
    const html = `<p>${escapeHtml(actor)} ${escapeHtml(summary)} for ${escapeHtml(profile.elderName)}.</p><ul>${medications.map((m) => `<li>${escapeHtml(m.name)} (${escapeHtml(m.dosage)}): ${escapeHtml(m.scheduledTimes.join(', '))} — ${escapeHtml(m.instructions)}</li>`).join('')}</ul><p>Times are in ${escapeHtml(profile.timezone || 'UTC')}. Sign in with Google to view or edit the schedule.</p>`;
    await Promise.all(db.members.filter((m) => m.profileId === profile.id && m.role !== 'ELDER').map((member) =>
      EmailService.dispatchEmail(profile.id, member.email, member.name, `Schedule updated for ${profile.elderName}`, html, 'SCHEDULE_UPDATED')));
  }
}
