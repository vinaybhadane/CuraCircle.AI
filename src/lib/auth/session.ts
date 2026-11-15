import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db/database';
import type { CareCircleMember, CareCircleProfile } from '@/lib/types';
import { NotificationService } from '@/lib/services/notification.service';

function secret() {
  const configured = process.env.JWT_SECRET;
  const value = configured === 'curacircle_super_secure_jwt_token_secret_key_32_bytes_min' ? undefined : configured;
  if (!value || value.length < 32) {
    throw new ApiError('Server sign-in is not configured. Set a unique JWT_SECRET of at least 32 characters in the hosting environment, then redeploy.', 503, 'AUTH_CONFIGURATION_ERROR');
  }
  return value;
}
export interface SessionIdentity {
  uid: string;
  email: string;
  name: string;
  isDemo: boolean;
  profileId?: string;
  elderName?: string;
  role?: CareCircleMember['role'];
}
function identityFields(identity: SessionIdentity): SessionIdentity {
  // Verified JWTs also contain iat/exp. Only application fields belong in a
  // renewed token; jsonwebtoken generates fresh timing claims itself.
  return {
    uid: identity.uid,
    email: identity.email,
    name: identity.name,
    isDemo: identity.isDemo,
    ...(identity.profileId ? { profileId: identity.profileId } : {}),
    ...(identity.elderName ? { elderName: identity.elderName } : {}),
    ...(identity.role ? { role: identity.role } : {})
  };
}
export class ApiError extends Error {
  constructor(message: string, public status = 400, public code?: string) { super(message); }
}
export function validateSessionConfiguration() { secret(); }
export function readIdentity(req: NextRequest): SessionIdentity {
  const token = req.cookies.get('curacircle_token')?.value;
  if (!token) throw new ApiError('Sign in with Google to continue.', 401);
  const signingSecret = secret();
  try {
    const identity = jwt.verify(token, signingSecret, { algorithms: ['HS256'] }) as SessionIdentity;
    if (!identity.uid || !identity.email) throw new Error('Invalid identity');
    return identityFields(identity);
  } catch { throw new ApiError('Your session expired. Please sign in again.', 401); }
}
export function setIdentity(response: NextResponse, identity: SessionIdentity) {
  response.headers.set('Cache-Control', 'private, no-store');
  response.cookies.set('curacircle_token', jwt.sign(identityFields(identity), secret(), { expiresIn: '7d', algorithm: 'HS256' }), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 604800,
  });
  return response;
}
export function publicProfile(profile: CareCircleProfile) {
  const { elderPasscodeHash, caregiverPasscodeHash, familyPasscodeHash, ...safe } = profile;
  return safe;
}
export function findMembership(identity: SessionIdentity) {
  const db = dbService.getDb();

  // Cross-lambda state persistence for serverless environments (e.g. Vercel):
  // If an authenticated user's JWT already holds an established profileId that hasn't
  // replicated to this ephemeral worker container, restore the circle so APIs never crash with 409.
  if (identity.profileId && !db.profiles.some((p) => p.id === identity.profileId)) {
    db.profiles.push({
      id: identity.profileId,
      elderName: identity.elderName || identity.name,
      elderAge: 75,
      ownerUid: identity.uid,
      isDemo: identity.isDemo,
      onboardingCompleted: true,
      primaryCondition: '',
      allergies: [],
      emergencyContact: {
        name: identity.name,
        email: identity.email,
        phone: '',
        relationship: 'Family Guardian'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      elderPasscodeHash: '',
      caregiverPasscodeHash: '',
      familyPasscodeHash: ''
    });
    db.members.push({
      id: `member_${identity.uid}`,
      profileId: identity.profileId,
      firebaseUid: identity.uid,
      email: identity.email,
      name: identity.name,
      role: identity.role || 'FAMILY_MEMBER',
      permissions: {
        canEditMeds: true,
        canLogAdherence: true,
        canManageAppointments: true,
        receiveMissedAlerts: true,
        receiveUpcomingAlerts: true
      }
    });
    dbService.save();
  }

  return db.members.find((member) => {
    const profile = db.profiles.find((p) => p.id === member.profileId);
    return profile && (identity.isDemo || Boolean(profile.ownerUid)) && Boolean(profile.isDemo) === identity.isDemo &&
      (!identity.profileId || member.profileId === identity.profileId) &&
      (member.firebaseUid === identity.uid || (!identity.isDemo && member.email.toLowerCase() === identity.email.toLowerCase()));
  });
}
export interface CircleSession { identity: SessionIdentity; profile: CareCircleProfile; member: CareCircleMember; }
export function requireCircle(req: NextRequest): CircleSession {
  const identity = readIdentity(req);
  const member = findMembership(identity);
  const profile = dbService.getDb().profiles.find((p) => p.id === member?.profileId);
  if (!member || !profile) throw new ApiError('Complete your patient and family setup first.', 409);
  return { identity, profile, member };
}
export function apiError(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, { status: error.status, headers: { 'Cache-Control': 'private, no-store' } });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON request.' }, { status: 400 });
  console.error('Care circle request failed:', error);
  return NextResponse.json({ error: 'The request could not be completed. Please try again.' }, { status: 500 });
}
export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (origin && origin !== req.nextUrl.origin) throw new ApiError('Cross-origin request rejected.', 403);
}

// Legacy route handlers receive only server-selected circle and actor values.
// All ID-based mutations are checked before a handler can access a record.
export function secureRoute(handler: (req: NextRequest) => Promise<NextResponse>, permission?: keyof CareCircleMember['permissions']) {
  return async (req: NextRequest) => {
    return dbService.runExclusive(async () => {
    try {
      if (req.method !== 'GET') assertSameOrigin(req);
      const session = requireCircle(req);
      if (permission && !session.member.permissions[permission]) throw new ApiError('Your role cannot perform this action.', 403);
      const url = new URL(req.url);
      const requestedProfile = url.searchParams.get('profileId');
      if (requestedProfile && requestedProfile !== session.profile.id) throw new ApiError('Care circle access denied.', 403);
      url.searchParams.set('profileId', session.profile.id);
      url.searchParams.set('actorName', session.member.name);
      url.searchParams.set('actorRole', session.member.role);
      let body: Record<string, unknown> | undefined;
      if (!['GET', 'HEAD', 'DELETE'].includes(req.method)) {
        body = await req.json();
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError('Invalid request body.');
        if (body.profileId && body.profileId !== session.profile.id) throw new ApiError('Care circle access denied.', 403);
        Object.assign(body, { profileId: session.profile.id, actorName: session.member.name, actorRole: session.member.role, actorMemberId: session.member.id, elderName: session.profile.elderName });
      }
      const id = body?.id || body?.doseId || url.searchParams.get('id');
      if (id) {
        const db = dbService.getDb();
        const pathname = url.pathname;
        const records = pathname.includes('/medications') ? db.medications : pathname.includes('/appointments') ? db.appointments : pathname.includes('/adherence') ? db.doseLogs : pathname.includes('/members') ? db.members : [];
        if (!records.some((record) => record.id === id && record.profileId === session.profile.id)) throw new ApiError('Record not found.', 404);
      }
      const scoped = new NextRequest(url, { method: req.method, headers: req.headers, ...(body ? { body: JSON.stringify(body) } : {}) });
      const response = await handler(scoped);
      if (response.ok && ['POST', 'PUT', 'DELETE'].includes(req.method) && url.pathname === '/api/medications') {
        await NotificationService.scheduleChanged(session.profile, session.member.name, 'updated the medication schedule');
      }
      return response;
    } catch (error) { return apiError(error); }
    }).catch(apiError);
  };
}
