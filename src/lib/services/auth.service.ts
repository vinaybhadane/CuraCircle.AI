import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbService } from '../db/database';
import { Role, CareCircleProfile, CareCircleMember, AuditLog } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'curacircle_super_secure_jwt_token_secret_key_32_bytes_min';

// In-memory sliding window rate limiter for passcode verification
interface RateLimitEntry {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes lockout

export interface AuthSession {
  profileId: string;
  elderName: string;
  role: Role;
  memberId?: string;
  memberName: string;
  token: string;
}

export class AuthService {
  /**
   * Checks whether the current identifier (IP or profileId) is rate-limited
   */
  public static checkRateLimit(key: string): { allowed: boolean; remainingAttempts: number; retryAfterSec?: number } {
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry) {
      return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
    }

    if (entry.lockedUntil && now < entry.lockedUntil) {
      const retryAfterSec = Math.ceil((entry.lockedUntil - now) / 1000);
      return { allowed: false, remainingAttempts: 0, retryAfterSec };
    }

    // Reset window if expired
    if (now - entry.firstAttemptAt > WINDOW_MS) {
      rateLimitMap.delete(key);
      return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
    }

    if (entry.attempts >= MAX_ATTEMPTS) {
      entry.lockedUntil = now + LOCKOUT_MS;
      const retryAfterSec = Math.ceil(LOCKOUT_MS / 1000);
      return { allowed: false, remainingAttempts: 0, retryAfterSec };
    }

    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - entry.attempts };
  }

  /**
   * Records a failed attempt for rate limiting
   */
  public static recordFailedAttempt(key: string): void {
    const now = Date.now();
    const entry = rateLimitMap.get(key) || { attempts: 0, firstAttemptAt: now };
    entry.attempts += 1;
    if (entry.attempts >= MAX_ATTEMPTS) {
      entry.lockedUntil = now + LOCKOUT_MS;
    }
    rateLimitMap.set(key, entry);
  }

  /**
   * Resets rate limiter upon successful authentication
   */
  public static clearRateLimit(key: string): void {
    rateLimitMap.delete(key);
  }

  /**
   * Verifies passcode for a specific role or detects role automatically
   */
  public static verifyPasscode(
    profileId: string,
    passcode: string,
    clientIp: string = '127.0.0.1'
  ): { success: boolean; role?: Role; member?: CareCircleMember; profile?: CareCircleProfile; error?: string } {
    const rateLimitKey = `${clientIp}:${profileId}`;
    const rateCheck = this.checkRateLimit(rateLimitKey);

    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Too many failed passcode attempts. Locked for ${rateCheck.retryAfterSec} seconds to protect elder security.`
      };
    }

    const db = dbService.getDb();
    const profile = db.profiles.find((p) => p.id === profileId);

    if (!profile) {
      return { success: false, error: 'Care Circle profile not found' };
    }

    let detectedRole: Role | null = null;

    if (bcrypt.compareSync(passcode, profile.elderPasscodeHash)) {
      detectedRole = 'ELDER';
    } else if (bcrypt.compareSync(passcode, profile.caregiverPasscodeHash)) {
      detectedRole = 'PRIMARY_CAREGIVER';
    } else if (bcrypt.compareSync(passcode, profile.familyPasscodeHash)) {
      detectedRole = 'FAMILY_MEMBER';
    }

    if (!detectedRole) {
      this.recordFailedAttempt(rateLimitKey);
      this.recordAudit(profileId, 'UNKNOWN', 'PASSCODE_FAILED', `Failed passcode attempt from IP ${clientIp}`);
      return { success: false, error: 'Invalid Care Circle passcode. Please verify your PIN.' };
    }

    this.clearRateLimit(rateLimitKey);

    // Find representative member
    const member = db.members.find((m) => m.profileId === profileId && m.role === detectedRole) || db.members[0];

    this.recordAudit(
      profileId,
      detectedRole,
      'AUTHENTICATION_SUCCESS',
      `Authorized ${detectedRole} access to ${profile.elderName}'s Care Circle.`
    );

    return {
      success: true,
      role: detectedRole,
      member,
      profile
    };
  }

  /**
   * Issues cryptographically signed JWT session token
   */
  public static createSessionToken(profileId: string, role: Role, memberName: string, memberId?: string): string {
    return jwt.sign(
      {
        profileId,
        role,
        memberName,
        memberId
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verifies JWT session token
   */
  public static verifySessionToken(token: string): {
    valid: boolean;
    payload?: { profileId: string; role: Role; memberName: string; memberId?: string };
    error?: string;
  } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        profileId: string;
        role: Role;
        memberName: string;
        memberId?: string;
      };
      return { valid: true, payload: decoded };
    } catch {
      return { valid: false, error: 'Invalid or expired session token' };
    }
  }

  /**
   * Records security audit event
   */
  public static recordAudit(profileId: string, actorRole: Role | 'UNKNOWN', action: string, details: string): void {
    const db = dbService.getDb();
    const audit: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      profileId,
      timestamp: new Date().toISOString(),
      actorName: actorRole === 'ELDER' ? (db.profiles.find((p) => p.id === profileId)?.elderName || 'Patient') : actorRole,
      actorRole: (actorRole === 'UNKNOWN' ? 'FAMILY_MEMBER' : actorRole) as Role,
      action,
      details
    };
    db.auditLogs.unshift(audit);
    // Keep most recent 500 logs
    if (db.auditLogs.length > 500) {
      db.auditLogs = db.auditLogs.slice(0, 500);
    }
    dbService.save();
  }
}
