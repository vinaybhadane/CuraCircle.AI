export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { secureRoute, requireCircle } from '@/lib/auth/session';
import { dbService } from '@/lib/db/database';

export const GET = secureRoute(async (req: NextRequest) => {
  const { profile, member } = requireCircle(req);
  const notifications = dbService.getDb().notifications.filter((n) => n.profileId === profile.id && n.memberId === member.id);
  return NextResponse.json({ notifications, unreadCount: notifications.filter((n) => !n.readAt).length });
});
export const PATCH = secureRoute(async (req: NextRequest) => {
  const { profile, member } = requireCircle(req);
  const { notificationId } = await req.json();
  dbService.getDb().notifications.filter((n) => n.profileId === profile.id && n.memberId === member.id && (!notificationId || n.id === notificationId))
    .forEach((n) => { n.readAt = new Date().toISOString(); });
  dbService.save();
  return NextResponse.json({ success: true });
});
