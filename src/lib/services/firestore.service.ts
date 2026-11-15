import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/config';
import type { Medication, CareCircleMember, CareCircleProfile, DoctorAppointment } from '@/lib/types';
import type { DatabaseSchema } from '@/lib/db/database';

export class FirestoreService {
  /**
   * Strictly store or update medication (prescription) details in Firestore
   */
  public static async saveMedication(med: Medication): Promise<void> {
    try {
      const ref = doc(firestore, 'medications', med.id);
      await setDoc(ref, { ...med, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('[Firestore] Failed to save medication:', err);
    }
  }

  /**
   * Strictly delete medication from Firestore
   */
  public static async deleteMedication(id: string): Promise<void> {
    try {
      const ref = doc(firestore, 'medications', id);
      await deleteDoc(ref);
    } catch (err) {
      console.warn('[Firestore] Failed to delete medication:', err);
    }
  }

  /**
   * Strictly store or update a member in Firestore
   */
  public static async saveMember(member: CareCircleMember): Promise<void> {
    try {
      const ref = doc(firestore, 'members', member.id);
      await setDoc(ref, member, { merge: true });
    } catch (err) {
      console.warn('[Firestore] Failed to save member:', err);
    }
  }

  /**
   * Strictly delete a member from Firestore
   */
  public static async deleteMember(id: string): Promise<void> {
    try {
      const ref = doc(firestore, 'members', id);
      await deleteDoc(ref);
    } catch (err) {
      console.warn('[Firestore] Failed to delete member:', err);
    }
  }

  /**
   * Strictly store or update a patient profile in Firestore
   */
  public static async saveProfile(profile: CareCircleProfile): Promise<void> {
    try {
      const ref = doc(firestore, 'profiles', profile.id);
      await setDoc(ref, profile, { merge: true });
    } catch (err) {
      console.warn('[Firestore] Failed to save profile:', err);
    }
  }

  /**
   * Strictly store prescription drafts in Firestore
   */
  public static async savePrescriptionDraft(draft: any): Promise<void> {
    try {
      const ref = doc(firestore, 'prescriptionDrafts', draft.id);
      await setDoc(ref, draft, { merge: true });
    } catch (err) {
      console.warn('[Firestore] Failed to save prescription draft:', err);
    }
  }

  /**
   * Strictly store or update an appointment in Firestore
   */
  public static async saveAppointment(appointment: DoctorAppointment): Promise<void> {
    try {
      const ref = doc(firestore, 'appointments', appointment.id);
      await setDoc(ref, appointment, { merge: true });
    } catch (err) {
      console.warn('[Firestore] Failed to save appointment:', err);
    }
  }

  /**
   * Strictly delete an appointment from Firestore
   */
  public static async deleteAppointment(id: string): Promise<void> {
    try {
      const ref = doc(firestore, 'appointments', id);
      await deleteDoc(ref);
    } catch (err) {
      console.warn('[Firestore] Failed to delete appointment:', err);
    }
  }

  /**
   * Read all medications directly from Firestore for a given profile
   */
  public static async getMedications(profileId?: string): Promise<Medication[]> {
    try {
      const medsRef = collection(firestore, 'medications');
      const q = profileId ? query(medsRef, where('profileId', '==', profileId)) : medsRef;
      const snap = await getDocs(q);
      const list: Medication[] = [];
      snap.forEach((d) => list.push(d.data() as Medication));
      return list;
    } catch (err) {
      console.warn('[Firestore] Error reading medications:', err);
      return [];
    }
  }

  /**
   * Read all members directly from Firestore
   */
  public static async getMembers(profileId?: string): Promise<CareCircleMember[]> {
    try {
      const membersRef = collection(firestore, 'members');
      const q = profileId ? query(membersRef, where('profileId', '==', profileId)) : membersRef;
      const snap = await getDocs(q);
      const list: CareCircleMember[] = [];
      snap.forEach((d) => list.push(d.data() as CareCircleMember));
      return list;
    } catch (err) {
      console.warn('[Firestore] Error reading members:', err);
      return [];
    }
  }

  /**
   * Sync complete database state to Firestore
   */
  public static async syncAllToFirestore(data: DatabaseSchema): Promise<void> {
    try {
      const promises: Promise<void>[] = [];
      for (const p of data.profiles || []) promises.push(this.saveProfile(p));
      for (const m of data.members || []) promises.push(this.saveMember(m));
      for (const med of data.medications || []) promises.push(this.saveMedication(med));
      for (const a of data.appointments || []) promises.push(this.saveAppointment(a));
      for (const d of data.prescriptionDrafts || []) promises.push(this.savePrescriptionDraft(d));
      await Promise.allSettled(promises);
    } catch (err) {
      console.warn('[Firestore] syncAllToFirestore warning:', err);
    }
  }
}
