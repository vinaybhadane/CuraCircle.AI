import nodemailer from 'nodemailer';
import { dbService } from '../db/database';
import { DispatchedEmail, Medication, DoctorAppointment, DoseLog, CareCircleProfile } from '../types';
import { AuthService } from './auth.service';
import { randomUUID } from 'crypto';
import { circleClock } from '@/lib/time';
import { AdherenceService } from './adherence.service';
import { cleanNotificationText } from '@/lib/utils/sanitize';

export class EmailService {
  private static checks = new Map<string, Promise<{ upcomingDoseEmailsSent: number; missedDoseEmailsSent: number; appointmentEmailsSent: number; refillEmailsSent: number }>>();
  private static transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

  private static getTransporter(): ReturnType<typeof nodemailer.createTransport> | null {
    if (this.transporter) return this.transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.NODE_ENV !== 'test') {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        connectionTimeout: 8000,
        socketTimeout: 10000,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      return this.transporter;
    }

    return null;
  }

  /**
   * Internal sender helper that dispatches via SMTP if available
   * and always records in persistent DB outbox for live inspection
   */
  public static async dispatchEmail(
    profileId: string,
    to: string,
    toName: string,
    subject: string,
    htmlBody: string,
    triggerType: DispatchedEmail['triggerType'],
    meta?: Record<string, unknown>
  ): Promise<DispatchedEmail> {
    const db = dbService.getDb();
    const id = `email_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let status: 'SENT' | 'SIMULATED' | 'FAILED' = 'SIMULATED';

    const isPreview = process.env.NODE_ENV === 'test' || Boolean(db.profiles.find((p) => p.id === profileId)?.isDemo);
    const brevoApiKey = isPreview ? undefined : process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM || 'alerts@example.invalid';
    const senderName = process.env.BREVO_SENDER_NAME || 'CuraCircle Health Alerts';

    // 1. First Priority: Brevo REST API (Fastest & direct deliverability)
    if (brevoApiKey) {
      try {
        const brevoPayload = {
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to, name: toName }],
          subject,
          htmlContent: htmlBody
        };

        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(brevoPayload)
          , signal: AbortSignal.timeout(10000)
        });

        if (res.ok) {
          const resData = await res.json().catch(() => ({}));
          status = 'SENT';
          if (!meta) meta = {};
          meta.brevoMessageId = resData.messageId;
          console.log(`[Brevo] Email accepted by the provider, messageId: ${resData.messageId}`);
        } else {
          console.warn('[Brevo] Delivery rejected:', res.status);
          status = 'FAILED';
          meta = { ...meta, deliveryError: `Email provider rejected the request (${res.status}).` };
        }
      } catch (brevoErr) {
        console.error('[Brevo] Email request failed.');
        status = 'FAILED';
        meta = { ...meta, deliveryError: 'Email provider could not be reached.' };
      }
    }

    // 2. Secondary: SMTP Transport fallback
    if (status !== 'SENT') {
      const transporter = isPreview ? null : this.getTransporter();
      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"${senderName}" <${senderEmail}>`,
            to: `"${toName}" <${to}>`,
            subject,
            html: htmlBody
          });
          status = 'SENT';
        } catch (err) {
          console.error('SMTP transmission error:', err);
          status = 'FAILED';
        }
      }
    }

    const emailRecord: DispatchedEmail = {
      id,
      profileId,
      to,
      toName,
      subject,
      htmlBody,
      sentAt: new Date().toISOString(),
      triggerType,
      status,
      meta
    };

    db.dispatchedEmails.unshift(emailRecord);
    const recipient = db.members.find((m) => m.profileId === profileId && m.email.toLowerCase() === to.toLowerCase());
    if (recipient) db.notifications.unshift({ id: `notification_${randomUUID()}`, profileId, memberId: recipient.id,
      title: subject, message: cleanNotificationText(htmlBody).slice(0, 500), createdAt: emailRecord.sentAt });
    if (db.dispatchedEmails.length > 300) {
      db.dispatchedEmails = db.dispatchedEmails.slice(0, 300);
    }
    dbService.save();

    AuthService.recordAudit(
      profileId,
      'PRIMARY_CAREGIVER',
      `EMAIL_DISPATCHED_${triggerType}`,
      `Email "${subject}" for ${toName} (${to}): ${status}.`
    );

    return emailRecord;
  }

  /**
   * 1. Proactive Upcoming Dose Reminder (sent 15-30m before dose)
   */
  public static async sendUpcomingDoseReminder(
    profile: CareCircleProfile,
    med: Medication,
    dose: DoseLog,
    recipientEmail: string,
    recipientName: string
  ): Promise<DispatchedEmail> {
    const subject = `[CuraCircle] Upcoming Dose Reminder: ${med.name} (${med.dosage}) at ${dose.scheduledTime}`;
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; }
          .card { background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 28px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; }
          .badge { display: inline-block; background-color: #e0f2fe; color: #0369a1; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 14px; }
          .pill-box { background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #0284c7; }
          .instruction { font-size: 16px; font-weight: 500; color: #0f172a; }
          .footer { margin-top: 24px; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <span class="badge">PROACTIVE MEDICATION REMINDER</span>
            <h2 style="color: #0369a1; margin: 12px 0 4px 0;">Upcoming Dose for ${profile.elderName}</h2>
            <p style="margin: 0; color: #64748b;">Scheduled Time: <strong>${dose.scheduledTime}</strong> Today</p>
          </div>
          <p>Hello ${recipientName},</p>
          <p>This is a proactive reminder from CuraCircle to ensure ${profile.elderName}'s healthcare routine stays on track:</p>
          
          <div class="pill-box">
            <h3 style="margin-top: 0; color: #0f172a;">${med.name} &bull; ${med.dosage}</h3>
            <p style="margin: 4px 0;"><strong>Form & Appearance:</strong> ${med.form} (${med.shape || 'Standard'})</p>
            <p style="margin: 4px 0;"><strong>Food Requirement:</strong> ${med.foodRequirement.replace('_', ' ')}</p>
            <p class="instruction"><strong>Instructions:</strong> ${med.instructions}</p>
          </div>

          <p>Once taken, please log the dose in the CuraCircle platform or use the one-tap Elder Voice Companion.</p>
          
          <div class="footer">
            <p>Dispatched automatically by CuraCircle Smart Healthcare Engine &bull; Patient ID: ${profile.id}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.dispatchEmail(profile.id, recipientEmail, recipientName, subject, htmlBody, 'UPCOMING_DOSE', {
      medicationId: med.id,
      doseId: dose.id,
      scheduledTime: dose.scheduledTime
    });
  }

  /**
   * 2. Proactive Missed Dose Escalation (sent to family members when dose is overdue > 30 mins)
   */
  public static async sendMissedDoseEscalation(
    profile: CareCircleProfile,
    med: Medication,
    dose: DoseLog,
    recipientEmail: string,
    recipientName: string
  ): Promise<DispatchedEmail> {
    const subject = `[URGENT] Missed Dose Alert: ${profile.elderName} missed ${med.name} (${dose.scheduledTime})`;
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #fff1f2; margin: 0; padding: 24px; }
          .card { background-color: #ffffff; border-radius: 12px; border: 2px solid #e11d48; padding: 28px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 15px -3px rgba(225, 29, 72, 0.1); }
          .badge-alert { display: inline-block; background-color: #ffe4e6; color: #be123c; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 14px; }
          .action-box { background-color: #fff1f2; border-radius: 8px; padding: 18px; margin: 20px 0; border-left: 4px solid #e11d48; }
          .btn { display: inline-block; background-color: #e11d48; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-right: 12px; }
          .footer { margin-top: 24px; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="badge-alert">&bull; ESCALATED ADHERENCE ALERT</span>
          <h2 style="color: #be123c; margin: 12px 0 4px 0;">Action Required: Medication Missed</h2>
          <p style="margin: 0; color: #64748b;">Elder: <strong>${profile.elderName}</strong> (Age ${profile.elderAge})</p>
          
          <div class="action-box">
            <h3 style="margin-top: 0; color: #be123c;">${med.name} - ${med.dosage}</h3>
            <p style="margin: 4px 0;"><strong>Scheduled Time:</strong> ${dose.scheduledTime} (Over 30 minutes overdue)</p>
            <p style="margin: 4px 0;"><strong>Clinical Purpose:</strong> ${med.purpose}</p>
            <p style="margin: 4px 0;"><strong>Instructions:</strong> ${med.instructions}</p>
          </div>

          <p>Dear ${recipientName},</p>
          <p>Our smart monitoring system detected that ${profile.elderName} has not confirmed taking this critical dose. As a designated Care Circle family guardian, please check in on them to ensure their safety and well-being.</p>
          
          <div style="margin: 24px 0;">
            <p><strong>Elder Phone:</strong> <a href="tel:${profile.emergencyContact.phone}">${profile.emergencyContact.phone}</a></p>
            <p><strong>Care circle contact:</strong> ${profile.emergencyContact.name} &bull; ${profile.emergencyContact.phone || 'Phone not provided'}</p>
          </div>

          <div class="footer">
            <p>Automated Care Circle Escalation &bull; CuraCircle Health AI Guardian</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.dispatchEmail(profile.id, recipientEmail, recipientName, subject, htmlBody, 'MISSED_DOSE_ESCALATION', {
      medicationId: med.id,
      doseId: dose.id,
      scheduledTime: dose.scheduledTime
    });
  }

  /**
   * 3. Proactive Doctor Appointment Reminders (24h or 2h before)
   */
  public static async sendAppointmentReminder(
    profile: CareCircleProfile,
    apt: DoctorAppointment,
    reminderType: '24h' | '2h',
    recipientEmail: string,
    recipientName: string
  ): Promise<DispatchedEmail> {
    const formattedDate = new Date(apt.appointmentDateTime).toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const subject = `[CuraCircle] Upcoming Doctor Visit: ${apt.doctorName} (${reminderType === '24h' ? 'Tomorrow' : 'In 2 Hours'})`;
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; }
          .card { background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 28px; max-width: 600px; margin: 0 auto; }
          .badge { display: inline-block; background-color: #ede9fe; color: #6d28d9; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 14px; }
          .detail-box { background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 18px 0; }
          .questions { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="badge">APPOINTMENT REMINDER (${reminderType.toUpperCase()})</span>
          <h2 style="color: #5b21b6; margin: 12px 0 4px 0;">${apt.doctorName} &bull; ${apt.specialty}</h2>
          <p style="margin: 0; font-size: 17px; font-weight: bold; color: #0f172a;">${formattedDate}</p>
          
          <div class="detail-box">
            <p style="margin: 4px 0;"><strong>Clinic / Hospital:</strong> ${apt.clinicName}</p>
            <p style="margin: 4px 0;"><strong>Address:</strong> ${apt.address}</p>
            <p style="margin: 4px 0;"><strong>Reason for Visit:</strong> ${apt.reasonForVisit}</p>
            <p style="margin: 4px 0;"><strong>Designated Escort:</strong> ${apt.accompaniedByName || 'Self'}</p>
            ${apt.doctorNotes ? `<p style="margin: 4px 0; color: #b45309;"><strong>Doctor Instructions:</strong> ${apt.doctorNotes}</p>` : ''}
          </div>

          ${
            apt.preVisitQuestions && apt.preVisitQuestions.length > 0
              ? `
            <div class="questions">
              <h4 style="margin-top: 0; color: #166534;">AI-Suggested Questions to Ask the Doctor:</h4>
              <ul style="margin-bottom: 0; padding-left: 20px; color: #14532d;">
                ${apt.preVisitQuestions.map((q) => `<li>${q}</li>`).join('')}
              </ul>
            </div>
          `
              : ''
          }

          <p>Please remember to bring current medication bottles and insurance cards.</p>
        </div>
      </body>
      </html>
    `;

    return this.dispatchEmail(profile.id, recipientEmail, recipientName, subject, htmlBody, 'APPOINTMENT_REMINDER', {
      appointmentId: apt.id,
      reminderType,
      dateTime: apt.appointmentDateTime
    });
  }

  /**
   * 4. Proactive Low Inventory / Refill Alert
   */
  public static async sendLowInventoryAlert(
    profile: CareCircleProfile,
    med: Medication,
    recipientEmail: string,
    recipientName: string
  ): Promise<DispatchedEmail> {
    const subject = `[CuraCircle] Prescription Refill Needed: ${med.name} (${med.pillCountCurrent} doses left)`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; padding: 24px; background: #fffbeb; border-radius: 8px; border: 1px solid #fde68a;">
        <h2 style="color: #b45309;">Prescription Refill Alert</h2>
        <p>Hello ${recipientName},</p>
        <p><strong>${profile.elderName}</strong> is running low on <strong>${med.name} (${med.dosage})</strong>.</p>
        <p>Remaining pill count: <strong>${med.pillCountCurrent} tablets</strong> (Refill threshold: ${med.pillCountRefillThreshold}).</p>
        <p>Prescribed by: <strong>${med.prescribedBy}</strong>.</p>
        <p>Please contact the pharmacy or prescribing physician to request a refill promptly.</p>
      </div>
    `;

    return this.dispatchEmail(profile.id, recipientEmail, recipientName, subject, htmlBody, 'LOW_INVENTORY', {
      medicationId: med.id,
      pillCount: med.pillCountCurrent
    });
  }

  /**
   * 5. One-Touch Emergency SOS Broadcast
   */
  public static async sendEmergencySOS(
    profile: CareCircleProfile,
    reason: string = 'One-Touch Emergency SOS button pressed by Elder'
  ): Promise<DispatchedEmail[]> {
    const db = dbService.getDb();
    const results: DispatchedEmail[] = [];
    const subject = `[EMERGENCY SOS] Urgent Assistance Needed for ${profile.elderName}!`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; padding: 28px; background: #450a0a; color: #ffffff; border-radius: 12px;">
        <h1 style="color: #f87171; margin-top: 0;">EMERGENCY SOS ALERT</h1>
        <p style="font-size: 18px;"><strong>${profile.elderName}</strong> triggered an emergency SOS alert.</p>
        <div style="background: #7f1d1d; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Event Details:</strong> ${reason}</p>
          <p style="margin: 4px 0;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p style="margin: 4px 0;"><strong>Primary Conditions:</strong> ${profile.primaryCondition}</p>
          <p style="margin: 4px 0;"><strong>Known Allergies:</strong> ${profile.allergies.join(', ')}</p>
          <p style="margin: 4px 0;"><strong>Blood Type:</strong> ${profile.bloodType || 'Not provided'}</p>
        </div>
        <p style="font-size: 16px;">Please call immediately: <a href="tel:${profile.emergencyContact.phone}" style="color: #fecdd3; font-weight: bold;">${profile.emergencyContact.phone}</a></p>
      </div>
    `;

    // Dispatch to all circle members who receive alerts
    const targetMembers = db.members.filter(
      (m) => m.profileId === profile.id && m.role !== 'ELDER' && m.email
    );

    for (const member of targetMembers) {
      const email = await this.dispatchEmail(
        profile.id,
        member.email,
        member.name,
        subject,
        htmlBody,
        'EMERGENCY_SOS',
        { elderName: profile.elderName, reason }
      );
      results.push(email);
    }

    AuthService.recordAudit(
      profile.id,
      'ELDER',
      'EMERGENCY_SOS_TRIGGERED',
      `Emergency SOS broadcast sent to ${targetMembers.length} care circle members.`
    );

    return results;
  }

  /**
   * Autonomous Scheduler Tick:
   * Inspects all active doses, appointments, and inventory thresholds,
   * proactively dispatching necessary reminders.
   */
  public static async runNotificationChecks(profileId: string) {
    const existing = this.checks.get(profileId);
    if (existing) return existing;
    const pending = this.runChecks(profileId);
    this.checks.set(profileId, pending);
    try { return await pending; }
    finally { this.checks.delete(profileId); }
  }

  private static async runChecks(profileId: string): Promise<{
    upcomingDoseEmailsSent: number;
    missedDoseEmailsSent: number;
    appointmentEmailsSent: number;
    refillEmailsSent: number;
  }> {
    const db = dbService.getDb();
    const profile = db.profiles.find((p) => p.id === profileId);
    if (!profile) {
      return { upcomingDoseEmailsSent: 0, missedDoseEmailsSent: 0, appointmentEmailsSent: 0, refillEmailsSent: 0 };
    }

    const { date: todayStr, minutes: nowTotalMinutes } = circleClock(profileId);
    const now = new Date();
    AdherenceService.getDosesForDate(profileId, todayStr);

    let upcomingCount = 0;
    let missedCount = 0;
    let appointmentCount = 0;
    let refillCount = 0;

    const familyAndCaregivers = db.members.filter(
      (m) => m.profileId === profileId && ['PRIMARY_CAREGIVER', 'FAMILY_MEMBER', 'CLINICIAN'].includes(m.role)
    );

    // 1. Check Doses Today
    const todayDoses = db.doseLogs.filter((d) => d.profileId === profileId && d.scheduledDate === todayStr && !d.excluded);

    for (const dose of todayDoses) {
      if (dose.status === 'SNOOZED') {
        if (dose.actualTime && Date.now() < Date.parse(dose.actualTime) + (dose.snoozeMinutes || 15) * 60000) continue;
        dose.status = 'PENDING';
      }
      const [h, m] = dose.scheduledTime.split(':').map(Number);
      const scheduledTotalMinutes = h * 60 + m;
      const med = db.medications.find((m) => m.id === dose.medicationId);
      if (!med) continue;

      // Upcoming dose check: within next 30 minutes (difference between 0 and 30)
      const diffToScheduled = scheduledTotalMinutes - nowTotalMinutes;
      if (diffToScheduled >= 0 && diffToScheduled <= 30 && !dose.reminderSentAt && dose.status === 'PENDING') {
        const recipients = db.members.filter((m) => m.profileId === profileId && m.permissions.receiveUpcomingAlerts);
        for (const recipient of recipients) {
          const delivered = await this.sendUpcomingDoseReminder(profile, med, dose, recipient.email, recipient.name);
          if (delivered.status === 'SENT') upcomingCount++;
        }
        dose.reminderSentAt = new Date().toISOString();
      }

      // Missed dose check: past scheduled by > 30 minutes and not yet escalated
      const overdueMinutes = nowTotalMinutes - scheduledTotalMinutes;
      if (overdueMinutes > 30 && ['PENDING', 'MISSED', 'SNOOZED'].includes(dose.status) && !dose.missedAlertEscalatedAt) {
        dose.status = 'MISSED';
        dose.missedAlertEscalatedAt = new Date().toISOString();
        missedCount++;

        // Escalate to family members
        for (const guardian of familyAndCaregivers) {
          if (guardian.permissions.receiveMissedAlerts) {
            await this.sendMissedDoseEscalation(profile, med, dose, guardian.email, guardian.name);
          }
        }
      }
    }

    // 2. Check Upcoming Appointments
    const appointments = db.appointments.filter((a) => a.profileId === profileId && a.status === 'UPCOMING');

    for (const apt of appointments) {
      const aptTime = new Date(apt.appointmentDateTime).getTime();
      const diffHours = (aptTime - now.getTime()) / (1000 * 60 * 60);

      // 24-hour reminder
      if (diffHours > 0 && diffHours <= 26 && !apt.remindersSent.reminder24h) {
        for (const guardian of familyAndCaregivers.filter((m) => m.permissions.receiveUpcomingAlerts)) {
          await this.sendAppointmentReminder(profile, apt, '24h', guardian.email, guardian.name);
        }
        apt.remindersSent.reminder24h = true;
        appointmentCount++;
      }

      // 2-hour reminder
      if (diffHours > 0 && diffHours <= 3 && !apt.remindersSent.reminder2h) {
        for (const guardian of familyAndCaregivers.filter((m) => m.permissions.receiveUpcomingAlerts)) {
          await this.sendAppointmentReminder(profile, apt, '2h', guardian.email, guardian.name);
        }
        apt.remindersSent.reminder2h = true;
        appointmentCount++;
      }
    }

    // 3. Check Low Inventory Refills
    const activeMeds = db.medications.filter((m) => m.profileId === profileId && m.active);
    for (const med of activeMeds) {
      if (med.pillCountRefillThreshold > 0 && med.pillCountCurrent <= med.pillCountRefillThreshold) {
        for (const guardian of familyAndCaregivers.filter((m) => m.permissions.receiveMissedAlerts)) {
          const alreadyNotified = db.dispatchedEmails.some((e) => e.profileId === profileId && e.to === guardian.email && e.triggerType === 'LOW_INVENTORY' && e.meta?.medicationId === med.id && e.sentAt.slice(0, 10) === now.toISOString().slice(0, 10));
          if (!alreadyNotified) { await this.sendLowInventoryAlert(profile, med, guardian.email, guardian.name); refillCount++; }
        }
      }
    }

    dbService.save();

    return {
      upcomingDoseEmailsSent: upcomingCount,
      missedDoseEmailsSent: missedCount,
      appointmentEmailsSent: appointmentCount,
      refillEmailsSent: refillCount
    };
  }
}
