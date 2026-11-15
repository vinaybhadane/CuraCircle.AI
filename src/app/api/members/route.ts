export const dynamic = 'force-dynamic';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { secureRoute, requireCircle, ApiError } from '@/lib/auth/session';
import { dbService } from '@/lib/db/database';
import { MemberInputSchema, permissionsFor } from '@/lib/services/circle.service';
import { NotificationService } from '@/lib/services/notification.service';

function requireOwner(req: NextRequest) {
  const session = requireCircle(req);
  if (session.profile.ownerUid !== session.identity.uid) throw new ApiError('Only the patient profile owner can manage family membership.', 403);
  return session;
}
export const GET = secureRoute(async (req: NextRequest) => {
  const { profile } = requireCircle(req);
  const db = dbService.getDb();
  const members = db.members.filter((m) => m.profileId === profile.id);
  return NextResponse.json({ members });
});
export const POST = secureRoute(async (req: NextRequest) => {
  const { profile } = requireOwner(req);
  const parsed = MemberInputSchema.safeParse(await req.json());
  if (!parsed.success) throw new ApiError(parsed.error.issues[0].message);
  const db = dbService.getDb();
  if (db.members.some((m) => m.profileId === profile.id && m.email.toLowerCase() === parsed.data.email)) throw new ApiError('This email is already in the care circle.', 409);
  const member = { ...parsed.data, id: `member_${randomUUID()}`, profileId: profile.id,
    permissions: { ...permissionsFor(parsed.data.role), ...parsed.data.permissions } };
  db.members.push(member);
  dbService.save();
  const email = await NotificationService.invite(profile, member);
  return NextResponse.json({ success: true, member, deliveryStatus: email.status }, { status: 201 });
});
export const PUT = secureRoute(async (req: NextRequest) => {
  const { profile } = requireOwner(req);
  const { id, updates } = await req.json();
  if (typeof id !== 'string' || !updates || typeof updates !== 'object') throw new ApiError('Member ID and updates are required.');
  const db = dbService.getDb();
  const member = db.members.find((m) => m.profileId === profile.id && m.id === id)!;
  if (!member) throw new ApiError('Member not found.', 404);
  if (member.role === 'ELDER' || member.firebaseUid === profile.ownerUid) throw new ApiError('The patient and profile owner cannot be reassigned.');
  const parsed = MemberInputSchema.safeParse({ ...member, ...updates });
  if (!parsed.success) throw new ApiError(parsed.error.issues[0].message);
  if (db.members.some((m) => m.profileId === profile.id && m.id !== id && m.email.toLowerCase() === parsed.data.email)) throw new ApiError('This email is already in the care circle.', 409);
  if (member.email !== parsed.data.email) delete member.firebaseUid;
  Object.assign(member, parsed.data, { permissions: { ...permissionsFor(parsed.data.role), ...parsed.data.permissions } });
  dbService.save();
  return NextResponse.json({ success: true, member });
});
export const DELETE = secureRoute(async (req: NextRequest) => {
  const { profile } = requireOwner(req);
  const db = dbService.getDb();
  const id = new URL(req.url).searchParams.get('id');
  const member = db.members.find((m) => m.profileId === profile.id && m.id === id)!;
  if (!member) throw new ApiError('Member not found.', 404);
  if (member.role === 'ELDER' || member.firebaseUid === profile.ownerUid) throw new ApiError('The patient and profile owner cannot be removed.');
  db.members = db.members.filter((m) => m.id !== id);
  dbService.save();
  return NextResponse.json({ success: true });
});
