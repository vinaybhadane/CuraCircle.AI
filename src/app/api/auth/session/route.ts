import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { dbService } from '@/lib/db/database';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('curacircle_token')?.value;
    const token = authHeader?.replace('Bearer ', '') || cookieToken;

    const db = dbService.getDb();
    const defaultProfile = db.profiles[0];

    if (!token) {
      // Return default elder session for seamless instant demo
      return NextResponse.json({
        authenticated: false,
        profile: defaultProfile,
        members: db.members.filter((m) => m.profileId === defaultProfile.id),
        suggestedPasscodes: {
          elder: '1122',
          caregiver: '4321',
          family: '5678'
        }
      });
    }

    const verified = AuthService.verifySessionToken(token);
    if (!verified.valid || !verified.payload) {
      return NextResponse.json({
        authenticated: false,
        profile: defaultProfile,
        members: db.members.filter((m) => m.profileId === defaultProfile.id),
        suggestedPasscodes: {
          elder: '1122',
          caregiver: '4321',
          family: '5678'
        }
      });
    }

    const profile = db.profiles.find((p) => p.id === verified.payload!.profileId) || defaultProfile;
    const members = db.members.filter((m) => m.profileId === profile.id);
    const currentMember = members.find((m) => m.id === verified.payload!.memberId) || members.find((m) => m.role === verified.payload!.role);

    return NextResponse.json({
      authenticated: true,
      role: verified.payload.role,
      memberName: verified.payload.memberName,
      member: currentMember,
      profile,
      members,
      suggestedPasscodes: {
        elder: '1122',
        caregiver: '4321',
        family: '5678'
      }
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Session check failed', details: errorMsg }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Signed out' });
  response.cookies.delete('curacircle_token');
  return response;
}
