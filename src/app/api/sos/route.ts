export const dynamic = 'force-dynamic';
import { secureRoute, requireCircle } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/email.service';
import { EmergencySOSSchema } from '@/lib/validations/schemas';
import { dbService } from '@/lib/db/database';

async function handlePOST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = EmergencySOSSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid SOS payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const db = dbService.getDb();
    const profile = db.profiles.find((p) => p.id === parsed.data.profileId) || db.profiles[0];

    const dispatched = await EmailService.sendEmergencySOS(profile, parsed.data.reason);

    return NextResponse.json({
      success: true,
      alertDispatchedCount: dispatched.length,
      elderName: profile.elderName,
      emergencyContact: profile.emergencyContact,
      message: `EMERGENCY ALERT: Immediate notifications dispatched to ${dispatched.length} care circle guardians.`
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to trigger emergency SOS', details: errorMsg }, { status: 500 });
  }
}

export const POST = secureRoute(handlePOST);
