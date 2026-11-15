import { z } from 'zod';

export const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Invalid calendar date');

export const LoginSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required'),
  passcode: z.string().min(4, 'Passcode must be at least 4 digits').max(12, 'Passcode max length 12')
});

export const MedicationCreateSchema = z.object({
  name: z.string().min(2, 'Medication name is required'),
  genericName: z.string().optional(),
  dosage: z.string().min(1, 'Dosage is required (e.g., 10 mg)'),
  form: z.enum(['TABLET', 'CAPSULE', 'LIQUID', 'INHALER', 'INJECTION', 'PATCH']),
  color: z.string().default('#0284c7'),
  shape: z.string().default('Round tablet'),
  instructions: z.string().min(3, 'Clear instructions are required'),
  purpose: z.string().min(2, 'Therapeutic purpose is required'),
  foodRequirement: z.enum(['BEFORE_MEAL', 'AFTER_MEAL', 'WITH_FOOD', 'EMPTY_STOMACH', 'NO_RESTRICTION']),
  frequency: z.enum(['DAILY', 'TWICE_DAILY', 'THREE_TIMES_DAILY', 'FOUR_TIMES_DAILY', 'EVERY_OTHER_DAY', 'WEEKLY', 'AS_NEEDED']),
  scheduledTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid 24h time format (HH:MM)')).min(1, 'At least one scheduled time is required').max(24).refine((times) => new Set(times).size === times.length, 'Each reminder time must be unique'),
  active: z.boolean().default(true),
  pillCountCurrent: z.number().int().nonnegative().default(0),
  pillCountRefillThreshold: z.number().int().nonnegative().default(7),
  prescribedBy: z.string().default('Physician'),
  startDate: DateOnlySchema.default(() => new Date().toISOString().split('T')[0]),
  endDate: DateOnlySchema.optional(),
  notes: z.string().optional()
});

export const DoseLogSchema = z.object({
  doseId: z.string().min(1, 'Dose ID is required'),
  action: z.enum(['TAKEN', 'SKIPPED', 'SNOOZED']),
  skipReason: z.string().optional(),
  snoozeMinutes: z.number().int().min(5).max(120).optional(),
  notes: z.string().optional()
});

export const AppointmentCreateSchema = z.object({
  doctorName: z.string().min(2, 'Doctor name is required'),
  specialty: z.string().min(2, 'Specialty is required'),
  clinicName: z.string().min(2, 'Clinic name is required'),
  address: z.string().min(5, 'Address is required'),
  contactPhone: z.string().optional(),
  appointmentDateTime: z.string().datetime({ offset: true, message: 'A valid date-time with timezone is required' }),
  reasonForVisit: z.string().min(3, 'Reason for visit is required'),
  accompaniedByMemberId: z.string().optional(),
  accompaniedByName: z.string().optional(),
  status: z.enum(['UPCOMING', 'COMPLETED', 'CANCELLED', 'RESCHEDULED']).default('UPCOMING'),
  preVisitQuestions: z.array(z.string()).default([]),
  doctorNotes: z.string().optional()
});

export const CompanionChatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  elderName: z.string().default('Patient'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    text: z.string()
  })).default([])
});

export const ScanPrescriptionSchema = z.object({
  imageBase64: z.string().min(10, 'Prescription file required').max(7_000_000, 'File must be 5 MB or smaller'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']).default('image/jpeg')
});

export const EmergencySOSSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required'),
  reason: z.string().default('Emergency SOS button pressed')
});
