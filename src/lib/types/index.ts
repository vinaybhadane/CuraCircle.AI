export type Role = 'ELDER' | 'PRIMARY_CAREGIVER' | 'FAMILY_MEMBER' | 'CLINICIAN';

export interface CareCircleProfile {
  id: string;
  ownerUid?: string;
  isDemo?: boolean;
  timezone?: string;
  onboardingCompleted?: boolean;
  elderName: string;
  elderAge: number;
  elderPhoto?: string;
  primaryCondition: string;
  allergies: string[];
  bloodType?: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
  };
  elderPasscodeHash: string; // Hashed PIN for Elder mode
  caregiverPasscodeHash: string; // Hashed PIN for Caregiver mode
  familyPasscodeHash: string; // Hashed PIN for Family mode
  createdAt: string;
  updatedAt: string;
}

export interface CareCircleMember {
  id: string;
  firebaseUid?: string;
  profileId: string;
  name: string;
  role: Role;
  email: string;
  phone?: string;
  avatar?: string;
  permissions: {
    canEditMeds: boolean;
    canLogAdherence: boolean;
    canManageAppointments: boolean;
    receiveMissedAlerts: boolean;
    receiveUpcomingAlerts: boolean;
  };
}

export type MedicationForm = 'TABLET' | 'CAPSULE' | 'LIQUID' | 'INHALER' | 'INJECTION' | 'PATCH';
export type FoodRequirement = 'BEFORE_MEAL' | 'AFTER_MEAL' | 'WITH_FOOD' | 'EMPTY_STOMACH' | 'NO_RESTRICTION';
export type MedicationFrequency = 'DAILY' | 'TWICE_DAILY' | 'THREE_TIMES_DAILY' | 'FOUR_TIMES_DAILY' | 'EVERY_OTHER_DAY' | 'WEEKLY' | 'AS_NEEDED';

export interface Medication {
  id: string;
  profileId: string;
  name: string;
  genericName?: string;
  dosage: string; // e.g. "500 mg"
  form: MedicationForm;
  color: string; // Visual pill indicator
  shape: string; // e.g. "round", "oval", "capsule"
  instructions: string; // e.g. "Take with a full glass of water after breakfast"
  purpose: string; // e.g. "Blood pressure control"
  foodRequirement: FoodRequirement;
  frequency: MedicationFrequency;
  scheduledTimes: string[]; // 24-hr format ["08:00", "20:00"]
  active: boolean;
  pillCountCurrent: number;
  pillCountRefillThreshold: number;
  prescribedBy: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DoseStatus = 'TAKEN' | 'SKIPPED' | 'SNOOZED' | 'MISSED' | 'PENDING';

export interface DoseLog {
  id: string;
  excluded?: boolean;
  profileId: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string; // "08:00"
  scheduledDate: string; // "YYYY-MM-DD"
  actualTime?: string; // ISO string when action taken
  status: DoseStatus;
  takenByMemberId?: string;
  takenByRole?: Role;
  skipReason?: string;
  snoozeMinutes?: number;
  notes?: string;
  reminderSentAt?: string;
  missedAlertEscalatedAt?: string;
}

export interface DoctorAppointment {
  id: string;
  profileId: string;
  doctorName: string;
  specialty: string;
  clinicName: string;
  address: string;
  contactPhone?: string;
  appointmentDateTime: string; // ISO format e.g. "2026-11-20T10:30:00.000Z"
  reasonForVisit: string;
  accompaniedByMemberId?: string;
  accompaniedByName?: string;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  preVisitQuestions: string[];
  doctorNotes?: string;
  remindersSent: {
    reminder24h?: boolean;
    reminder2h?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export type SeverityLevel = 'SEVERE' | 'MODERATE' | 'MILD' | 'SAFE';

export interface DrugInteractionResult {
  medicationA: string;
  medicationB: string;
  severity: SeverityLevel;
  description: string;
  mechanism: string;
  caregiverGuidance: string;
  foodWarnings?: string[];
}

export interface DispatchedEmail {
  id: string;
  profileId: string;
  to: string;
  toName: string;
  subject: string;
  htmlBody: string;
  sentAt: string;
  triggerType: 'UPCOMING_DOSE' | 'MISSED_DOSE_ESCALATION' | 'APPOINTMENT_REMINDER' | 'LOW_INVENTORY' | 'EMERGENCY_SOS' | 'MEMBER_INVITED' | 'SCHEDULE_UPDATED';
  status: 'SENT' | 'SIMULATED' | 'FAILED';
  meta?: Record<string, unknown>;
}

export interface CareNotification {
  id: string;
  profileId: string;
  memberId: string;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
}

export interface AuditLog {
  id: string;
  profileId: string;
  timestamp: string;
  actorName: string;
  actorRole: Role;
  action: string;
  details: string;
}

export interface AdherenceStats {
  todayComplianceRate: number; // 0 - 100
  sevenDayComplianceRate: number; // 0 - 100
  totalDosesScheduledToday: number;
  dosesTakenToday: number;
  dosesSkippedToday: number;
  dosesMissedToday: number;
  currentStreakDays: number;
}
