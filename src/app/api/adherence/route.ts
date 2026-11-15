export const dynamic = 'force-dynamic';
import { circleClock } from '@/lib/time';
import { secureRoute, requireCircle } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { AdherenceService } from '@/lib/services/adherence.service';
import { DoseLogSchema } from '@/lib/validations/schemas';
import { dbService } from '@/lib/db/database';

async function handleGET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const db = dbService.getDb();
    const profileId = searchParams.get('profileId') || db.profiles[0].id;
    const dateStr = searchParams.get('date') || circleClock(profileId).date;

    // Check for missed doses
    AdherenceService.detectMissedDoses(profileId);

    const doses = AdherenceService.getDosesForDate(profileId, dateStr);
    const stats = AdherenceService.getAdherenceStats(profileId);

    return NextResponse.json({
      date: dateStr,
      doses,
      stats
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to retrieve adherence data', details: errorMsg }, { status: 500 });
  }
}

async function handlePOST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = DoseLogSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid dose action payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { doseId, action, skipReason, snoozeMinutes, notes } = parsed.data;
    const actorName = body.actorName || 'Patient';
    const actorRole = body.actorRole || 'ELDER';
    const actorMemberId = body.actorMemberId;

    const updated = AdherenceService.logDoseAction(doseId, action, {
      actorName,
      actorRole,
      actorMemberId,
      skipReason,
      snoozeMinutes,
      notes
    });

    if (!updated) {
      return NextResponse.json({ error: 'Dose not found' }, { status: 404 });
    }

    const stats = AdherenceService.getAdherenceStats(updated.profileId);

    return NextResponse.json({
      success: true,
      dose: updated,
      stats
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to record dose action', details: errorMsg }, { status: 500 });
  }
}

async function handleDELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const doseId = searchParams.get('id');

    if (!doseId) {
      return NextResponse.json({ error: 'Dose ID is required' }, { status: 400 });
    }

    const db = dbService.getDb();
    const index = db.doseLogs.findIndex((d) => d.id === doseId);
    if (index === -1) {
      return NextResponse.json({ error: 'Dose not found' }, { status: 404 });
    }

    const removed = db.doseLogs[index];
    removed.excluded = true;
    dbService.save();

    return NextResponse.json({ success: true, message: 'Dose removed from schedule', dose: removed });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to remove dose from schedule', details: errorMsg }, { status: 500 });
  }
}

export const GET = secureRoute(handleGET);

export const POST = secureRoute(handlePOST, 'canLogAdherence');

export const DELETE = secureRoute(handleDELETE, 'canEditMeds');
