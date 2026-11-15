export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { apiError, ApiError, assertSameOrigin, findMembership, publicProfile, readIdentity, setIdentity, validateSessionConfiguration, type SessionIdentity } from '@/lib/auth/session';
import { dbService } from '@/lib/db/database';
import { dashboardSnapshot } from '@/lib/services/dashboard.service';

function sessionResponse(identity: SessionIdentity, includeDashboard = false) {
  const db = dbService.getDb();
  const member = findMembership(identity);
  const profile = db.profiles.find((p) => p.id === member?.profileId);
  if (member && !member.firebaseUid) { member.firebaseUid = identity.uid; dbService.save(); }
  const userCircles = db.members.filter((m) => m.firebaseUid === identity.uid || (!identity.isDemo && m.email.toLowerCase() === identity.email.toLowerCase()))
    .flatMap((m) => { const p = db.profiles.find((p) => p.id === m.profileId && !p.isDemo); return p ? [{ id: p.id, name: p.elderName }] : []; });
  const circles = userCircles;
  return NextResponse.json({ authenticated: true, identity: { name: identity.name, email: identity.email },
    needsOnboarding: !profile, profile: profile ? publicProfile(profile) : null, member, role: member?.role,
    members: profile ? db.members.filter((m) => m.profileId === profile.id) : [], circles,
    ...(includeDashboard && profile && member ? { dashboard: dashboardSnapshot(profile.id, member.id) } : {}) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
async function handleGET(req: NextRequest) {
  try { return sessionResponse(readIdentity(req), req.nextUrl.searchParams.get('dashboard') === '1'); }
  catch (error) { return apiError(error); }
}
async function handlePOST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    validateSessionConfiguration();
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError('Invalid request body.');
    if (body.profileId && !body.idToken) {
      const identity = { ...readIdentity(req), profileId: String(body.profileId) };
      return await dbService.runExclusive(async () => {
        if (!findMembership(identity)) throw new ApiError('Care circle access denied.', 403);
        return setIdentity(sessionResponse(identity), identity);
      }, { tables: ['profiles', 'members'] });
    }
    if (typeof body.idToken !== 'string') throw new ApiError('Google sign-in token is required.', 401);
    let decoded;
    try {
      // Loading the SDK only for Google verification keeps its dependency tree
      // out of GET session checks and DELETE sign-out cold starts.
      const { getAdminAuth } = await import('@/lib/firebase/admin');
      decoded = await getAdminAuth().verifyIdToken(body.idToken);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code && ['auth/argument-error', 'auth/invalid-id-token', 'auth/id-token-expired', 'auth/id-token-revoked', 'auth/user-disabled'].includes(code)) {
        throw new ApiError('Google sign-in could not be verified. Please sign in again.', 401);
      }
      console.error('Firebase server authentication unavailable:', { code: code || 'unknown', node: process.version });
      throw new ApiError('Server Google authentication is unavailable. Check the Firebase Admin SDK dependencies and Node.js runtime, then redeploy.', 503, 'AUTH_SERVICE_UNAVAILABLE');
    }
    if (decoded.firebase.sign_in_provider !== 'google.com' || !decoded.email_verified || !decoded.email) {
      throw new ApiError('Use a verified Google account to sign in.', 403);
    }
    const identity: SessionIdentity = { uid: decoded.uid, email: decoded.email.toLowerCase(), name: decoded.name || decoded.email, isDemo: false };
    return await dbService.runExclusive(async () => {
    try {
      const previous = readIdentity(req);
      if (previous.uid === identity.uid && previous.profileId && findMembership({ ...identity, profileId: previous.profileId })) identity.profileId = previous.profileId;
    } catch { /* A new Google login does not need a prior session. */ }
    const member = findMembership(identity);
    if (member) identity.profileId = member.profileId;
    return setIdentity(sessionResponse(identity), identity);
    }, { tables: ['profiles', 'members'] });
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

export async function GET(req: NextRequest) {
  try {
    readIdentity(req);
    return await dbService.runExclusive(() => handleGET(req), { tables: req.nextUrl.searchParams.get('dashboard') === '1' ? ['profiles', 'members', 'medications', 'doseLogs', 'appointments', 'notifications'] : ['profiles', 'members'] });
  } catch (error) { return apiError(error); }
}

export const POST = handlePOST;
