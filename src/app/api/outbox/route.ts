import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db/database';
import { EmailService } from '@/lib/services/email.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const db = dbService.getDb();
    const profileId = searchParams.get('profileId') || db.profiles[0].id;

    const emails = db.dispatchedEmails.filter((e) => e.profileId === profileId);
    return NextResponse.json({
      total: emails.length,
      emails
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to retrieve email outbox', details: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, toName, subject, htmlBody } = body;

    if (!to || !subject) {
      return NextResponse.json({ error: 'Recipient "to" and "subject" are required' }, { status: 400 });
    }

    const db = dbService.getDb();
    const profileId = body.profileId || db.profiles[0].id;

    const email = await EmailService.dispatchEmail(
      profileId,
      to,
      toName || to,
      subject,
      htmlBody || `<p>Test email from CuraCircle Health Platform.</p>`,
      'UPCOMING_DOSE'
    );

    return NextResponse.json({ success: true, email });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to dispatch email', details: errorMsg }, { status: 500 });
  }
}
