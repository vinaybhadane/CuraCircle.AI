import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/email.service';
import { dbService } from '@/lib/db/database';

export async function POST(req: NextRequest) {
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
