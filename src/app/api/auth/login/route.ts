import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { LoginSchema } from '@/lib/validations/schemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid login payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { profileId, passcode } = parsed.data;
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    const result = AuthService.verifyPasscode(profileId, passcode, clientIp);

    if (!result.success || !result.role || !result.profile) {
      return NextResponse.json(
        { error: result.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    const memberName = result.member?.name || (result.role === 'ELDER' ? result.profile.elderName : 'Care Circle Member');
    const token = AuthService.createSessionToken(profileId, result.role, memberName, result.member?.id);

    const response = NextResponse.json({
      success: true,
      role: result.role,
      member: result.member,
      profile: result.profile,
      token
    });

    // Set secure HttpOnly cookie
    response.cookies.set('curacircle_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    });

    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Internal server error', details: errorMsg }, { status: 500 });
  }
}
