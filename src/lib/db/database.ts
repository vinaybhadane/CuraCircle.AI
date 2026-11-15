import fs from 'fs';
import path from 'path';
import os from 'os';
import bcrypt from 'bcryptjs';
import {
  CareCircleProfile,
  CareCircleMember,
  Medication,
  DoseLog,
  DoctorAppointment,
  DispatchedEmail,
  AuditLog,
  CareNotification
} from '../types';
import { FirestoreService } from '../services/firestore.service';

export interface DatabaseSchema {
  prescriptionDrafts: { id: string; profileId: string; medications: Omit<Medication, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>[]; warnings: string[]; createdAt: string; appliedAt?: string }[];
  profiles: CareCircleProfile[];
  members: CareCircleMember[];
  medications: Medication[];
  doseLogs: DoseLog[];
  appointments: DoctorAppointment[];
  dispatchedEmails: DispatchedEmail[];
  auditLogs: AuditLog[];
  notifications: CareNotification[];
}

// Vercel Serverless & Local Filesystem Dual-Path Support
const isVercel = Boolean(process.env.VERCEL);
const PRIMARY_DATA_DIR = process.env.CURACIRCLE_DATA_DIR || path.join(process.cwd(), 'data');
const TMP_DATA_DIR = path.join(os.tmpdir(), 'curacircle_data');

class DatabaseService {
  private cache: DatabaseSchema | null = null;
  private activeDbFile: string;
  private modifiedAt = 0;

  constructor() {
    this.activeDbFile = this.resolveDbFile();
  }

  // Serialize API mutations across Next.js route workers on this persistent disk.
  // The lock also protects asynchronous email/scheduler updates from lost writes.
  public async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const lockPath = `${this.activeDbFile}.lock`;
    const startedAt = Date.now();
    while (true) {
      try { fs.mkdirSync(lockPath); break; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        if (fs.existsSync(lockPath) && Date.now() - fs.statSync(lockPath).mtimeMs > 120000) {
          try { fs.rmdirSync(lockPath); } catch { /* Another worker recovered it. */ }
        }
        if (Date.now() - startedAt > 60000) throw new Error('Care circle is busy. Please retry.');
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
    }
    try { return await operation(); }
    finally { try { fs.rmdirSync(lockPath); } catch { /* Lock has already been removed. */ } }
  }

  private resolveDbFile(): string {
    // If running on Vercel, use /tmp which is the only writable directory in serverless lambdas
    if (isVercel && !process.env.CURACIRCLE_DATA_DIR) {
      try {
        if (!fs.existsSync(TMP_DATA_DIR)) {
          fs.mkdirSync(TMP_DATA_DIR, { recursive: true });
        }
        return path.join(TMP_DATA_DIR, 'curacircle_store.json');
      } catch (e) {
        console.warn('Could not create tmp dir on Vercel, using memory-only store', e);
        return path.join(os.tmpdir(), 'curacircle_store.json');
      }
    }

    try {
      if (!fs.existsSync(PRIMARY_DATA_DIR)) {
        fs.mkdirSync(PRIMARY_DATA_DIR, { recursive: true });
      }
      return path.join(PRIMARY_DATA_DIR, 'curacircle_store.json');
    } catch {
      return path.join(os.tmpdir(), 'curacircle_store.json');
    }
  }

  public getDb(): DatabaseSchema {
    if (this.cache && fs.existsSync(this.activeDbFile) && fs.statSync(this.activeDbFile).mtimeMs === this.modifiedAt) {
      return this.cache;
    }

    // 1. Try reading from active DB file
    if (fs.existsSync(this.activeDbFile)) {
      try {
        const raw = fs.readFileSync(this.activeDbFile, 'utf-8');
        this.cache = { notifications: [], prescriptionDrafts: [], ...JSON.parse(raw) };
        this.modifiedAt = fs.statSync(this.activeDbFile).mtimeMs;
        return this.cache!;
      } catch (err) {
        console.error('Failed reading active DB file, falling back', err);
      }
    }

    // 2. Try reading bundled seed file from repo data/ if on Vercel
    const bundledSeedFile = path.join(PRIMARY_DATA_DIR, 'curacircle_store.json');
    if (fs.existsSync(bundledSeedFile)) {
      try {
        const raw = fs.readFileSync(bundledSeedFile, 'utf-8');
        this.cache = { notifications: [], prescriptionDrafts: [], ...JSON.parse(raw) };
        this.save();
        return this.cache!;
      } catch {
        // Fall through to programmatic seed
      }
    }

    // 3. Fallback to programmatic seed
    this.cache = { profiles: [], members: [], medications: [], doseLogs: [], appointments: [], dispatchedEmails: [], auditLogs: [], notifications: [], prescriptionDrafts: [] };
    this.save();
    return this.cache;
  }

  public save(): void {
    if (!this.cache) return;
    const payload = JSON.stringify(this.cache, null, 2);
    try {
      const temporaryFile = `${this.activeDbFile}.${process.pid}.tmp`;
      fs.writeFileSync(temporaryFile, payload, 'utf-8');
      fs.renameSync(temporaryFile, this.activeDbFile);
      this.modifiedAt = fs.statSync(this.activeDbFile).mtimeMs;
    } catch (err) {
      throw new Error('Care circle data could not be saved. Configure a writable persistent data directory.');
    }

    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      try {
        void FirestoreService.syncAllToFirestore(this.cache);
      } catch {
        // Non-blocking background sync
      }
    }
  }

  public createSeedData(): DatabaseSchema {
    const salt = bcrypt.genSaltSync(10);
    const elderPasscodeHash = bcrypt.hashSync('1122', salt);
    const caregiverPasscodeHash = bcrypt.hashSync('4321', salt);
    const familyPasscodeHash = bcrypt.hashSync('5678', salt);

    const profileId = 'profile_eleanor_vance_01';

    const profiles: CareCircleProfile[] = [
      {
        id: profileId,
        elderName: 'Eleanor Vance',
        elderAge: 78,
        elderPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        primaryCondition: 'Hypertension & Type 2 Diabetes',
        allergies: ['Penicillin', 'Sulfa Drugs'],
        bloodType: 'O+',
        emergencyContact: {
          name: 'Sarah Vance',
          relationship: 'Daughter (Primary Guardian)',
          phone: '+1 (555) 234-5678',
          email: 'vinaybhadane06@gmail.com'
        },
        elderPasscodeHash,
        caregiverPasscodeHash,
        familyPasscodeHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    const members: CareCircleMember[] = [
      {
        id: 'member_eleanor',
        profileId,
        name: 'Eleanor Vance',
        role: 'ELDER',
        email: 'eleanor.vance@curacircle.health',
        phone: '+1 (555) 234-5670',
        permissions: {
          canEditMeds: false,
          canLogAdherence: true,
          canManageAppointments: false,
          receiveMissedAlerts: true,
          receiveUpcomingAlerts: true
        }
      },
      {
        id: 'member_nurse_david',
        profileId,
        name: 'David Miller, RN',
        role: 'PRIMARY_CAREGIVER',
        email: 'nurse.david@curacircle.health',
        phone: '+1 (555) 876-5432',
        permissions: {
          canEditMeds: true,
          canLogAdherence: true,
          canManageAppointments: true,
          receiveMissedAlerts: true,
          receiveUpcomingAlerts: true
        }
      },
      {
        id: 'member_sarah',
        profileId,
        name: 'Sarah Vance',
        role: 'FAMILY_MEMBER',
        email: 'vinaybhadane06@gmail.com',
        phone: '+1 (555) 234-5678',
        permissions: {
          canEditMeds: true,
          canLogAdherence: true,
          canManageAppointments: true,
          receiveMissedAlerts: true,
          receiveUpcomingAlerts: true
        }
      },
      {
        id: 'member_marcus',
        profileId,
        name: 'Marcus Vance',
        role: 'FAMILY_MEMBER',
        email: 'marcus.vance@curacircle.health',
        phone: '+1 (555) 345-6789',
        permissions: {
          canEditMeds: false,
          canLogAdherence: false,
          canManageAppointments: false,
          receiveMissedAlerts: true,
          receiveUpcomingAlerts: false
        }
      },
      {
        id: 'member_dr_reed',
        profileId,
        name: 'Dr. Evelyn Reed, MD',
        role: 'CLINICIAN',
        email: 'dr.reed@stjudemedical.org',
        phone: '+1 (555) 998-1122',
        permissions: {
          canEditMeds: true,
          canLogAdherence: false,
          canManageAppointments: true,
          receiveMissedAlerts: true,
          receiveUpcomingAlerts: false
        }
      }
    ];

    const medications: Medication[] = [
      {
        id: 'med_lisinopril',
        profileId,
        name: 'Lisinopril',
        genericName: 'Lisinopril ACE Inhibitor',
        dosage: '10 mg',
        form: 'TABLET',
        color: '#f87171', // Red / Coral round
        shape: 'Round, debossed "L 10"',
        instructions: 'Take 1 tablet every morning with a full glass of water. Maintain consistent fluid intake.',
        purpose: 'High Blood Pressure (Hypertension) management and kidney protection.',
        foodRequirement: 'NO_RESTRICTION',
        frequency: 'DAILY',
        scheduledTimes: ['08:00'],
        active: true,
        pillCountCurrent: 24,
        pillCountRefillThreshold: 7,
        prescribedBy: 'Dr. Evelyn Reed, MD',
        startDate: '2026-01-15',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'med_metformin',
        profileId,
        name: 'Metformin HCl',
        genericName: 'Metformin Extended Release',
        dosage: '500 mg',
        form: 'TABLET',
        color: '#ffffff', // White oval
        shape: 'Oval, scored "M 500"',
        instructions: 'Take 1 tablet twice daily with meals (breakfast & dinner) to reduce stomach discomfort.',
        purpose: 'Blood sugar control for Type 2 Diabetes.',
        foodRequirement: 'WITH_FOOD',
        frequency: 'TWICE_DAILY',
        scheduledTimes: ['08:00', '20:00'],
        active: true,
        pillCountCurrent: 42,
        pillCountRefillThreshold: 10,
        prescribedBy: 'Dr. Evelyn Reed, MD',
        startDate: '2026-02-01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'med_atorvastatin',
        profileId,
        name: 'Atorvastatin',
        genericName: 'Atorvastatin Calcium',
        dosage: '20 mg',
        form: 'TABLET',
        color: '#38bdf8', // Light blue oval
        shape: 'Oval film-coated "A 20"',
        instructions: 'Take 1 tablet at bedtime. Avoid drinking grapefruit juice while taking this medication.',
        purpose: 'Cholesterol lowering and cardiovascular arterial protection.',
        foodRequirement: 'NO_RESTRICTION',
        frequency: 'DAILY',
        scheduledTimes: ['21:00'],
        active: true,
        pillCountCurrent: 18,
        pillCountRefillThreshold: 7,
        prescribedBy: 'Dr. Evelyn Reed, MD',
        startDate: '2026-01-20',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'med_vit_d3',
        profileId,
        name: 'Vitamin D3 (Cholecalciferol)',
        genericName: 'Vitamin D3 Softgel',
        dosage: '1000 IU',
        form: 'CAPSULE',
        color: '#fbbf24', // Amber gold softgel
        shape: 'Clear amber droplet softgel',
        instructions: 'Take 1 softgel daily at lunchtime with food containing healthy fats.',
        purpose: 'Bone density support & immune health for osteopenia.',
        foodRequirement: 'WITH_FOOD',
        frequency: 'DAILY',
        scheduledTimes: ['13:00'],
        active: true,
        pillCountCurrent: 55,
        pillCountRefillThreshold: 14,
        prescribedBy: 'Dr. Evelyn Reed, MD',
        startDate: '2026-03-10',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const todayStr = new Date().toISOString().split('T')[0];

    const doseLogs: DoseLog[] = [
      {
        id: `dose_${medications[0].id}_${todayStr}_08:00`,
        profileId,
        medicationId: medications[0].id,
        medicationName: medications[0].name,
        dosage: medications[0].dosage,
        scheduledTime: '08:00',
        scheduledDate: todayStr,
        actualTime: `${todayStr}T08:05:00.000Z`,
        status: 'TAKEN',
        takenByMemberId: 'member_eleanor',
        takenByRole: 'ELDER',
        notes: 'Taken with breakfast glass of water.'
      },
      {
        id: `dose_${medications[1].id}_${todayStr}_08:00`,
        profileId,
        medicationId: medications[1].id,
        medicationName: medications[1].name,
        dosage: medications[1].dosage,
        scheduledTime: '08:00',
        scheduledDate: todayStr,
        actualTime: `${todayStr}T08:12:00.000Z`,
        status: 'TAKEN',
        takenByMemberId: 'member_eleanor',
        takenByRole: 'ELDER',
        notes: 'Taken with toast and eggs.'
      },
      {
        id: `dose_${medications[3].id}_${todayStr}_13:00`,
        profileId,
        medicationId: medications[3].id,
        medicationName: medications[3].name,
        dosage: medications[3].dosage,
        scheduledTime: '13:00',
        scheduledDate: todayStr,
        status: 'PENDING'
      },
      {
        id: `dose_${medications[1].id}_${todayStr}_20:00`,
        profileId,
        medicationId: medications[1].id,
        medicationName: medications[1].name,
        dosage: medications[1].dosage,
        scheduledTime: '20:00',
        scheduledDate: todayStr,
        status: 'PENDING'
      },
      {
        id: `dose_${medications[2].id}_${todayStr}_21:00`,
        profileId,
        medicationId: medications[2].id,
        medicationName: medications[2].name,
        dosage: medications[2].dosage,
        scheduledTime: '21:00',
        scheduledDate: todayStr,
        status: 'PENDING'
      }
    ];

    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);
    inThreeDays.setHours(10, 30, 0, 0);

    const inNineDays = new Date();
    inNineDays.setDate(inNineDays.getDate() + 9);
    inNineDays.setHours(14, 0, 0, 0);

    const appointments: DoctorAppointment[] = [
      {
        id: 'apt_cardio_checkup',
        profileId,
        doctorName: 'Dr. Evelyn Reed, MD',
        specialty: 'Cardiovascular Medicine',
        clinicName: 'St. Jude Heart & Vascular Institute',
        address: '742 Evergreen Terrace, Suite 300, Medical Arts Pavilion',
        contactPhone: '+1 (555) 998-1122',
        appointmentDateTime: inThreeDays.toISOString(),
        reasonForVisit: '6-Month Comprehensive Hypertension & ECG Follow-up. Review Lisinopril response.',
        accompaniedByMemberId: 'member_sarah',
        accompaniedByName: 'Sarah Vance (Daughter driving)',
        status: 'UPCOMING',
        preVisitQuestions: [
          'Should we adjust Lisinopril dosage if morning systolic pressure averages 128 mmHg?',
          'Is it safe to continue Atorvastatin alongside new joint supplements for arthritis?',
          'Could occasional mild lightheadedness upon standing be related to evening timing?'
        ],
        doctorNotes: 'Please bring recent 14-day home blood pressure log and current pill boxes.',
        remindersSent: {
          reminder24h: false,
          reminder2h: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'apt_eye_exam',
        profileId,
        doctorName: 'Dr. Julian Ward, OD',
        specialty: 'Optometry & Diabetic Eye Health',
        clinicName: 'Northwest Vision Specialists',
        address: '1200 Pine Street, Building B, Seattle, WA',
        contactPhone: '+1 (555) 443-8822',
        appointmentDateTime: inNineDays.toISOString(),
        reasonForVisit: 'Annual Dilated Retinopathy Screening for Type 2 Diabetes management.',
        accompaniedByMemberId: 'member_marcus',
        accompaniedByName: 'Marcus Vance (Son)',
        status: 'UPCOMING',
        preVisitQuestions: [
          'Any signs of microvascular retinal changes related to blood sugar levels?',
          'Do we need updated reading lens prescription for evening reading?'
        ],
        doctorNotes: 'Eyes will be dilated; patient will not be able to drive home. Companion required.',
        remindersSent: {
          reminder24h: false,
          reminder2h: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const dispatchedEmails: DispatchedEmail[] = [
      {
        id: 'email_seed_01',
        profileId,
        to: 'sarah.vance@curacircle.health',
        toName: 'Sarah Vance',
        subject: '[CuraCircle] Morning Medication Confirmed: Eleanor Vance took Lisinopril & Metformin',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #0284c7;">CuraCircle Daily Adherence Update</h2>
            <p>Good morning Sarah,</p>
            <p>Your mother <strong>Eleanor Vance</strong> successfully logged her 08:00 AM medications on schedule:</p>
            <ul>
              <li><strong>Lisinopril 10 mg</strong> - Taken at 08:05 AM</li>
              <li><strong>Metformin HCl 500 mg</strong> - Taken at 08:12 AM</li>
            </ul>
            <p>Her current adherence streak is <strong>14 consecutive days</strong>.</p>
            <p style="color: #64748b; font-size: 13px;">This automated alert was dispatched by CuraCircle AI.</p>
          </div>
        `,
        sentAt: `${todayStr}T08:15:00.000Z`,
        triggerType: 'UPCOMING_DOSE',
        status: 'SENT'
      }
    ];

    const auditLogs: AuditLog[] = [
      {
        id: 'audit_01',
        profileId,
        timestamp: `${todayStr}T08:05:00.000Z`,
        actorName: 'Eleanor Vance',
        actorRole: 'ELDER',
        action: 'DOSE_MARKED_TAKEN',
        details: 'Marked Lisinopril 10mg as TAKEN on schedule.'
      },
      {
        id: 'audit_02',
        profileId,
        timestamp: `${todayStr}T08:12:00.000Z`,
        actorName: 'Eleanor Vance',
        actorRole: 'ELDER',
        action: 'DOSE_MARKED_TAKEN',
        details: 'Marked Metformin HCl 500mg as TAKEN on schedule.'
      }
    ];

    return {
      profiles,
      members,
      medications,
      doseLogs,
      appointments,
      dispatchedEmails,
      auditLogs,
      notifications: []
      , prescriptionDrafts: []
    };
  }
}

export const dbService = new DatabaseService();
