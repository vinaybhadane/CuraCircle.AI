export const dynamic = 'force-dynamic';
import { secureRoute, requireCircle } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db/database';
import { EmailService } from '@/lib/services/email.service';
import { escapeHtml } from '@/lib/services/notification.service';

async function handleGET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const db = dbService.getDb();
    const profileId = searchParams.get('profileId') || db.profiles[0].id;

    const { member, profile } = requireCircle(req);
    const emails = db.dispatchedEmails.filter((e) => e.profileId === profileId && (member.firebaseUid === profile.ownerUid || e.to.toLowerCase() === member.email.toLowerCase()));
    return NextResponse.json({
      total: emails.length,
      emails
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to retrieve email outbox', details: errorMsg }, { status: 500 });
  }
}

async function handlePOST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to } = body;
    const { profile, member } = requireCircle(req);
    const recipient = dbService.getDb().members.find((m) => m.profileId === profile.id && m.email === to);

    if (!recipient || (profile.ownerUid !== member.firebaseUid && recipient.id !== member.id)) {
      return NextResponse.json({ error: 'Select an authorized care circle recipient.' }, { status: 403 });
    }

    const db = dbService.getDb();
    const profileId = body.profileId || db.profiles[0].id;

    const email = await EmailService.dispatchEmail(
      profileId,
      to,
      recipient.name,
      `CuraCircle notification test for ${profile.elderName}`,
      `<p>Hello ${escapeHtml(recipient.name)},</p><p>Your care circle notifications for ${escapeHtml(profile.elderName)} are active. Sign in with Google to check the schedule and alerts.</p>`,
      'UPCOMING_DOSE'
    );

    return NextResponse.json({ success: true, email });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to dispatch email', details: errorMsg }, { status: 500 });
  }
}

export const GET = secureRoute(handleGET);

export const POST = secureRoute(handlePOST);
