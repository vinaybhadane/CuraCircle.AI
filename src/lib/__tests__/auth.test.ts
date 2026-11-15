import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../services/auth.service';
import { dbService } from '../db/database';

describe('AuthService & Passcode Security', () => {
  beforeEach(() => {
    // Ensure database is initialized
    dbService.getDb();
  });

  it('successfully verifies the Elder passcode (1122)', () => {
    const profile = dbService.getDb().profiles[0];
    const result = AuthService.verifyPasscode(profile.id, '1122', '10.0.0.1');

    expect(result.success).toBe(true);
    expect(result.role).toBe('ELDER');
    expect(result.profile?.elderName).toBe('Eleanor Vance');
  });

  it('successfully verifies the Caregiver passcode (4321)', () => {
    const profile = dbService.getDb().profiles[0];
    const result = AuthService.verifyPasscode(profile.id, '4321', '10.0.0.2');

    expect(result.success).toBe(true);
    expect(result.role).toBe('PRIMARY_CAREGIVER');
  });

  it('successfully verifies the Family passcode (5678)', () => {
    const profile = dbService.getDb().profiles[0];
    const result = AuthService.verifyPasscode(profile.id, '5678', '10.0.0.3');

    expect(result.success).toBe(true);
    expect(result.role).toBe('FAMILY_MEMBER');
  });

  it('rejects an incorrect passcode and triggers rate limiting after 5 attempts', () => {
    const profile = dbService.getDb().profiles[0];
    const testIp = '192.168.1.99';

    for (let i = 0; i < 5; i++) {
      const res = AuthService.verifyPasscode(profile.id, '9999', testIp);
      expect(res.success).toBe(false);
    }

    // 6th attempt should be blocked by brute-force rate limiter
    const blockedRes = AuthService.verifyPasscode(profile.id, '1122', testIp);
    expect(blockedRes.success).toBe(false);
    expect(blockedRes.error).toContain('Too many failed passcode attempts');
  });

  it('creates and verifies cryptographically signed JWT session tokens', () => {
    const profile = dbService.getDb().profiles[0];
    const token = AuthService.createSessionToken(profile.id, 'PRIMARY_CAREGIVER', 'Nurse David', 'member_nurse_david');

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const verified = AuthService.verifySessionToken(token);
    expect(verified.valid).toBe(true);
    expect(verified.payload?.profileId).toBe(profile.id);
    expect(verified.payload?.role).toBe('PRIMARY_CAREGIVER');
    expect(verified.payload?.memberName).toBe('Nurse David');
  });

  it('rejects tampered or malformed JWT tokens', () => {
    const verified = AuthService.verifySessionToken('tampered.fake.jwt.token');
    expect(verified.valid).toBe(false);
    expect(verified.error).toBeDefined();
  });
});
