export const dynamic = 'force-dynamic';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ScanPrescriptionSchema } from '@/lib/validations/schemas';
import { apiError, ApiError, requireCircle, secureRoute } from '@/lib/auth/session';
import { scheduleWithGemini } from '@/lib/services/prescription.service';
import { dbService } from '@/lib/db/database';
import { circleClock } from '@/lib/time';

async function scan(req: NextRequest) {
  try {
    const { profile } = requireCircle(req);
    if (dbService.getDb().members.filter((m) => m.profileId === profile.id && m.role === 'FAMILY_MEMBER').length < 2) throw new ApiError('Add at least two family members before uploading a prescription.', 409);
    const parsed = ScanPrescriptionSchema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(parsed.error.issues[0].message);
    const base64 = parsed.data.imageBase64.replace(/^data:[^;]+;base64,/, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || Buffer.from(base64, 'base64').length > 5 * 1024 * 1024) throw new ApiError('Upload a valid prescription file smaller than 5 MB.');
    const result = await scheduleWithGemini(base64, parsed.data.mimeType, { name: profile.elderName, timezone: profile.timezone || 'UTC', today: circleClock(profile.id).date });
    const draft = { ...result, id: `rx_${randomUUID()}`, profileId: profile.id, createdAt: new Date().toISOString() };
    dbService.getDb().prescriptionDrafts.push(draft);
    dbService.save();
    return NextResponse.json({ success: true, draftId: draft.id, modelUsed: process.env.GEMINI_MODEL || 'gemini-2.5-flash', data: result });
  } catch (error) { return apiError(error); }
}
export const POST = secureRoute(scan, 'canEditMeds');
