export const dynamic = 'force-dynamic';
import { secureRoute, requireCircle } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/email.service';
import { dbService } from '@/lib/db/database';
import { timingSafeEqual } from 'crypto';

async function handlePOST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const db = dbService.getDb();
    const profileId = body.profileId || db.profiles[0].id;

    const result = await EmailService.runNotificationChecks(profileId);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      profileId,
      dispatched: result,
      message: `Proactive scheduler evaluated adherence and appointments. Dispatched: ${result.upcomingDoseEmailsSent} upcoming, ${result.missedDoseEmailsSent} missed dose escalations, ${result.appointmentEmailsSent} appointment reminders, ${result.refillEmailsSent} refill alerts.`
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Scheduler run failed', details: errorMsg }, { status: 500 });
  }
}

export const POST = secureRoute(handlePOST);

// Invoke from a hosting scheduler with Authorization: Bearer <CRON_SECRET>.
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const supplied = req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!expected || !supplied || expected.length !== supplied.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) {
    return NextResponse.json({ error: 'Scheduler authorization required.' }, { status: 401 });
  }
  const results = [];
  for (const profile of dbService.getDb().profiles.filter((p) => p.ownerUid && !p.isDemo)) {
    results.push({ profileId: profile.id, ...await dbService.runExclusive(() => EmailService.runNotificationChecks(profile.id)) });
  }
  return NextResponse.json({ success: true, results });
}
