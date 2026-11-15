import { describe, it, expect } from 'vitest';
import { EmailService } from '../services/email.service';
import { dbService } from '../db/database';
import { cleanNotificationText } from '../utils/sanitize';

describe('EmailService & Proactive Notification Scheduler', () => {
  it('dispatches an upcoming dose reminder and logs to outbox', async () => {
    const profile = dbService.getDb().profiles[0];
    const med = dbService.getDb().medications[0];
    const dose = dbService.getDb().doseLogs[0];

    const email = await EmailService.sendUpcomingDoseReminder(
      profile,
      med,
      dose,
      'eleanor.vance@curacircle.health',
      'Eleanor Vance'
    );

    expect(email.id).toBeDefined();
    expect(email.subject).toContain('Upcoming Dose Reminder');
    expect(email.triggerType).toBe('UPCOMING_DOSE');
    expect(email.htmlBody).toContain(med.name);

    // Verify stored in outbox
    const outbox = dbService.getDb().dispatchedEmails;
    expect(outbox.some((e) => e.id === email.id)).toBe(true);
  });

  it('dispatches an urgent missed dose escalation to family guardians', async () => {
    const profile = dbService.getDb().profiles[0];
    const med = dbService.getDb().medications[0];
    const dose = dbService.getDb().doseLogs[0];

    const email = await EmailService.sendMissedDoseEscalation(
      profile,
      med,
      dose,
      'sarah.vance@curacircle.health',
      'Sarah Vance'
    );

    expect(email.id).toBeDefined();
    expect(email.subject).toContain('[URGENT]');
    expect(email.triggerType).toBe('MISSED_DOSE_ESCALATION');
    expect(email.htmlBody).toContain('Action Required');
  });

  it('dispatches an emergency SOS broadcast to all guardians', async () => {
    const profile = dbService.getDb().profiles[0];
    const emails = await EmailService.sendEmergencySOS(profile, 'Test SOS Trigger');

    expect(emails.length).toBeGreaterThan(0);
    for (const e of emails) {
      expect(e.triggerType).toBe('EMERGENCY_SOS');
      expect(e.subject).toContain('EMERGENCY SOS');
    }
  });

  it('evaluates proactive scheduler tick without errors', async () => {
    const profile = dbService.getDb().profiles[0];
    const summary = await EmailService.runNotificationChecks(profile.id);

    expect(summary).toBeDefined();
    expect(typeof summary.upcomingDoseEmailsSent).toBe('number');
    expect(typeof summary.missedDoseEmailsSent).toBe('number');
    expect(typeof summary.appointmentEmailsSent).toBe('number');
    expect(typeof summary.refillEmailsSent).toBe('number');
  });

  it('sanitizes notification messages by stripping style tags, CSS rules and HTML entities', () => {
    const rawWithCss = `
      <style>body { font-family: sans-serif; } .card { color: red; }</style>
      <div class="card">&bull; ESCALATED ADHERENCE ALERT Action Required: Medication Missed</div>
    `;
    const cleaned = cleanNotificationText(rawWithCss);
    expect(cleaned).not.toContain('font-family');
    expect(cleaned).not.toContain('.card');
    expect(cleaned).not.toContain('<style>');
    expect(cleaned).toContain('• ESCALATED ADHERENCE ALERT Action Required: Medication Missed');
  });
});
