export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { apiError, ApiError, requireCircle, secureRoute } from '@/lib/auth/session';
import { dbService } from '@/lib/db/database';
import { MedicationService } from '@/lib/services/medication.service';
import { NotificationService } from '@/lib/services/notification.service';
import { FirestoreService } from '@/lib/services/firestore.service';

async function apply(req: NextRequest) {
  try {
    const { profile, member } = requireCircle(req);
    const { draftId } = await req.json();
    const db = dbService.getDb();
    const draft = db.prescriptionDrafts.find((d) => d.id === draftId && d.profileId === profile.id);
    if (!draft) throw new ApiError('Prescription draft not found. Scan the prescription again.', 404);
    if (draft.appliedAt) return NextResponse.json({ success: true, alreadyApplied: true });
    if (Date.now() - Date.parse(draft.createdAt) > 3600000) throw new ApiError('The prescription draft expired. Scan it again.', 409);
    const medications = draft.medications.map((medication) => MedicationService.addMedication(profile.id, medication, member.name, member.role));
    draft.appliedAt = new Date().toISOString();
    dbService.save();
    void FirestoreService.savePrescriptionDraft(draft);
    await NotificationService.scheduleChanged(profile, member.name, 'added a Gemini-generated prescription schedule');
    return NextResponse.json({ success: true, medications });
  } catch (error) { return apiError(error); }
}
export const POST = secureRoute(apply, 'canEditMeds');
