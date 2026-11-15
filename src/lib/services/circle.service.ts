import { randomUUID } from 'crypto';
import { z } from 'zod';
import { dbService } from '@/lib/db/database';
import { ApiError, type SessionIdentity } from '@/lib/auth/session';
import type { CareCircleMember, Role } from '@/lib/types';

export const MemberInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  phone: z.string().trim().max(30).optional().default(''),
  role: z.enum(['FAMILY_MEMBER', 'PRIMARY_CAREGIVER', 'CLINICIAN']).default('FAMILY_MEMBER'),
  permissions: z.object({ receiveMissedAlerts: z.boolean().default(true), receiveUpcomingAlerts: z.boolean().default(true) }).optional(),
});
export const OnboardingSchema = z.object({
  role: z.enum(['ELDER', 'FAMILY_MEMBER']),
  memberName: z.string().trim().min(2).max(100),
  patientName: z.string().trim().min(2).max(100),
  patientEmail: z.string().trim().email().optional().or(z.literal('')),
  patientAge: z.number().int().min(1).max(120),
  primaryCondition: z.string().trim().max(500).default(''),
  allergies: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  timezone: z.string().refine((value) => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } }, 'Invalid timezone'),
  familyMembers: z.array(MemberInputSchema.extend({ role: z.literal('FAMILY_MEMBER').default('FAMILY_MEMBER') })).min(2, 'Add at least two family members.').max(20),
});
export function permissionsFor(_role: Role): CareCircleMember['permissions'] {
  return { canEditMeds: true, canLogAdherence: true, canManageAppointments: true, receiveMissedAlerts: true, receiveUpcomingAlerts: true };
}
export function createCircle(identity: SessionIdentity, input: z.infer<typeof OnboardingSchema>) {
  const db = dbService.getDb();
  if (db.profiles.some((p) => p.ownerUid === identity.uid)) throw new ApiError('Your patient profile is already set up.', 409);
  const patientEmail = (input.role === 'ELDER' ? identity.email : input.patientEmail || '').toLowerCase();
  if (!patientEmail) throw new ApiError('Enter the patient’s Google email so they can access their schedule.');
  if (input.role === 'FAMILY_MEMBER' && patientEmail === identity.email) throw new ApiError('Use the patient’s own Google email.');
  const emails = [identity.email, ...(input.role === 'FAMILY_MEMBER' ? [patientEmail] : []), ...input.familyMembers.map((m) => m.email)];
  if (new Set(emails).size !== emails.length) throw new ApiError('Use a different email for each person, including the patient and yourself.');
  const profileId = `circle_${randomUUID()}`;
  const now = new Date().toISOString();
  const first = input.familyMembers[0];
  const profile = { id: profileId, ownerUid: identity.uid, isDemo: false, onboardingCompleted: true,
    timezone: input.timezone, elderName: input.patientName, elderAge: input.patientAge,
    primaryCondition: input.primaryCondition, allergies: input.allergies,
    emergencyContact: { name: first.name, email: first.email, phone: first.phone, relationship: 'Family member' },
    elderPasscodeHash: '', caregiverPasscodeHash: '', familyPasscodeHash: '', createdAt: now, updatedAt: now };
  const owner: CareCircleMember = { id: `member_${randomUUID()}`, profileId, firebaseUid: identity.uid,
    name: input.memberName, email: identity.email, role: input.role, permissions: permissionsFor(input.role) };
  const members: CareCircleMember[] = [owner, ...input.familyMembers.map((m) => ({ ...m, id: `member_${randomUUID()}`, profileId, permissions: permissionsFor(m.role) }))];
  if (input.role === 'FAMILY_MEMBER') members.push({ id: `member_${randomUUID()}`, profileId, name: input.patientName, email: patientEmail, role: 'ELDER', permissions: permissionsFor('ELDER') });
  db.profiles.push(profile);
  db.members.push(...members);
  dbService.save();
  return { profile, members, owner };
}
