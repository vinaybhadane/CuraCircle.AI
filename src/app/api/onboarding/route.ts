export const dynamic = 'force-dynamic';
import { dbService } from '@/lib/db/database';
import { NextRequest, NextResponse } from 'next/server';
import { apiError, ApiError, assertSameOrigin, publicProfile, readIdentity, setIdentity } from '@/lib/auth/session';
import { createCircle, OnboardingSchema } from '@/lib/services/circle.service';
import { NotificationService } from '@/lib/services/notification.service';

async function handlePOST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const identity = readIdentity(req);
    // Recover a completed save if the browser lost the response or the old
    // cookie-renewal bug failed after members and invitations were persisted.
    const db = dbService.getDb();
    const existing = db.profiles.find((profile) => profile.ownerUid === identity.uid && !profile.isDemo);
    if (existing) {
      if (!db.members.some((member) => member.profileId === existing.id && member.firebaseUid === identity.uid)) {
        throw new ApiError('Your saved patient profile is missing its owner membership.', 409);
      }
      return setIdentity(NextResponse.json({ success: true, alreadyCompleted: true, profile: publicProfile(existing) }), { ...identity, profileId: existing.id, elderName: existing.elderName });
    }
    const parsed = OnboardingSchema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(parsed.error.issues[0].message);
    const { profile, members, owner } = createCircle(identity, parsed.data);
    await Promise.all(members.filter((m) => m.id !== owner.id).map((member) => NotificationService.invite(profile, member)));
    return setIdentity(NextResponse.json({ success: true, profile: publicProfile(profile) }), { ...identity, profileId: profile.id, elderName: profile.elderName, role: owner.role });
  } catch (error) { return apiError(error); }
}

export async function POST(req: NextRequest) { return dbService.runExclusive(() => handlePOST(req)).catch(apiError); }
