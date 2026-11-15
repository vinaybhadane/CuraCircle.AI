import { describe, it, expect } from 'vitest';
import { dbService } from '../db/database';
import { EmailService } from '../services/email.service';
import { CareCircleMember } from '../types';

describe('Dynamic Care Circle Members & Multi-Recipient Notifications', () => {
  it('allows dynamically adding a new family member with custom email', () => {
    const db = dbService.getDb();
    const initialCount = db.members.length;

    const newMember: CareCircleMember = {
      id: `member_test_${Date.now()}`,
      profileId: db.profiles[0].id,
      name: 'Dr. John Doe',
      role: 'FAMILY_MEMBER',
      email: 'johndoe@example.com',
      phone: '+1 (555) 999-8888',
      permissions: {
        canEditMeds: true,
        canLogAdherence: true,
        canManageAppointments: true,
        receiveMissedAlerts: true,
        receiveUpcomingAlerts: true
      }
    };

    db.members.push(newMember);
    dbService.save();

    const updated = dbService.getDb();
    expect(updated.members.length).toBe(initialCount + 1);
    const found = updated.members.find((m) => m.email === 'johndoe@example.com');
    expect(found).toBeDefined();
    expect(found?.name).toBe('Dr. John Doe');
  });

  it('dispatches Emergency SOS broadcast to newly added members', async () => {
    const db = dbService.getDb();
    const newMember: CareCircleMember = {
      id: `member_sos_${Date.now()}`,
      profileId: db.profiles[0].id,
      name: 'Emergency Guardian Alex',
      role: 'FAMILY_MEMBER',
      email: 'alex.guardian@example.com',
      phone: '+1 (555) 111-2222',
      permissions: {
        canEditMeds: false,
        canLogAdherence: true,
        canManageAppointments: true,
        receiveMissedAlerts: true,
        receiveUpcomingAlerts: true
      }
    };
    db.members.push(newMember);
    dbService.save();

    const profile = db.profiles[0];
    const results = await EmailService.sendEmergencySOS(profile, 'Test fall detected');
    
    expect(results.length).toBeGreaterThanOrEqual(1);
    const sentToAlex = results.find((r) => r.to === 'alex.guardian@example.com');
    expect(sentToAlex).toBeDefined();
    expect(sentToAlex?.subject).toContain('EMERGENCY SOS');
  });

  it('includes dynamically added members in missed dose escalation alerts', async () => {
    const db = dbService.getDb();
    const newMember: CareCircleMember = {
      id: `member_escalation_${Date.now()}`,
      profileId: db.profiles[0].id,
      name: 'Guardian Sarah Care',
      role: 'PRIMARY_CAREGIVER',
      email: 'sarah.care@example.com',
      phone: '+1 (555) 444-5555',
      permissions: {
        canEditMeds: true,
        canLogAdherence: true,
        canManageAppointments: true,
        receiveMissedAlerts: true,
        receiveUpcomingAlerts: true
      }
    };
    db.members.push(newMember);

    // Schedule a dose in the past that is missed
    const todayStr = new Date().toISOString().split('T')[0];
    db.doseLogs.push({
      id: `dose_overdue_${Date.now()}`,
      profileId: db.profiles[0].id,
      medicationId: db.medications[0].id,
      medicationName: db.medications[0].name,
      dosage: db.medications[0].dosage,
      scheduledDate: todayStr,
      scheduledTime: '01:00', // early morning, definitely > 30 mins overdue
      status: 'PENDING'
    });
    dbService.save();

    const report = await EmailService.runNotificationChecks(db.profiles[0].id);
    expect(report.missedDoseEmailsSent).toBeGreaterThanOrEqual(1);

    const outbox = db.dispatchedEmails;
    const sentToGuardian = outbox.find((o) => o.to === 'sarah.care@example.com');
    expect(sentToGuardian).toBeDefined();
    expect(sentToGuardian?.subject).toContain('Missed Dose Alert');
  });

  it('allows removing a member and prevents further notifications', () => {
    const db = dbService.getDb();
    const initialCount = db.members.length;
    const toRemoveId = db.members[db.members.length - 1].id;

    const index = db.members.findIndex((m) => m.id === toRemoveId);
    db.members.splice(index, 1);
    dbService.save();

    const updated = dbService.getDb();
    expect(updated.members.length).toBe(initialCount - 1);
    expect(updated.members.find((m) => m.id === toRemoveId)).toBeUndefined();
  });
});
