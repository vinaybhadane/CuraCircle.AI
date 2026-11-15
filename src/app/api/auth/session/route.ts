export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { apiError, ApiError, assertSameOrigin, findMembership, publicProfile, readIdentity, setIdentity, type SessionIdentity } from '@/lib/auth/session';
import { dbService } from '@/lib/db/database';

function sessionResponse(identity: SessionIdentity) {
  const db = dbService.getDb();
  const member = findMembership(identity);
  const profile = db.profiles.find((p) => p.id === member?.profileId);
  if (member && !member.firebaseUid) { member.firebaseUid = identity.uid; dbService.save(); }
  const circles = db.members.filter((m) => m.firebaseUid === identity.uid || (!identity.isDemo && m.email.toLowerCase() === identity.email.toLowerCase()))
    .flatMap((m) => { const p = db.profiles.find((p) => p.id === m.profileId && !p.isDemo); return p ? [{ id: p.id, name: p.elderName }] : []; });
  return NextResponse.json({ authenticated: true, identity: { name: identity.name, email: identity.email },
    needsOnboarding: !profile, profile: profile ? publicProfile(profile) : null, member, role: member?.role,
    members: profile ? db.members.filter((m) => m.profileId === profile.id) : [], circles });
}
async function handleGET(req: NextRequest) {
  try { return sessionResponse(readIdentity(req)); }
  catch (error) { return apiError(error); }
}
async function handlePOST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const body = await req.json();
    if (body.profileId && !body.idToken) {
      const identity = { ...readIdentity(req), profileId: String(body.profileId) };
      if (!findMembership(identity)) throw new ApiError('Care circle access denied.', 403);
      return setIdentity(sessionResponse(identity), identity);
    }
    if (typeof body.idToken !== 'string') throw new ApiError('Google sign-in token is required.', 401);
    let decoded;
    try { decoded = await getAdminAuth().verifyIdToken(body.idToken); }
    catch { throw new ApiError('Google sign-in could not be verified. Please sign in again.', 401); }
    if (decoded.firebase.sign_in_provider !== 'google.com' || !decoded.email_verified || !decoded.email) {
      throw new ApiError('Use a verified Google account to sign in.', 403);
    }
    const identity: SessionIdentity = { uid: decoded.uid, email: decoded.email.toLowerCase(), name: decoded.name || decoded.email, isDemo: false };
    try {
      const previous = readIdentity(req);
      if (previous.uid === identity.uid && previous.profileId && findMembership({ ...identity, profileId: previous.profileId })) identity.profileId = previous.profileId;
    } catch { /* A new Google login does not need a prior session. */ }
    const member = findMembership(identity);
    if (member) identity.profileId = member.profileId;
    return setIdentity(sessionResponse(identity), identity);
  } catch (error) { return apiError(error); }
}
export async function DELETE(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const response = NextResponse.json({ success: true });
    response.cookies.delete('curacircle_token');
    return response;
  } catch (error) { return apiError(error); }
}

export async function GET(req: NextRequest) { return dbService.runExclusive(() => handleGET(req)).catch(apiError); }

export async function POST(req: NextRequest) { return dbService.runExclusive(() => handlePOST(req)).catch(apiError); }
