export const dynamic = 'force-dynamic';
import { secureRoute, requireCircle } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/services/gemini.service';
import { CompanionChatSchema } from '@/lib/validations/schemas';

async function handlePOST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CompanionChatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid companion chat payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { message, elderName, history } = parsed.data;

    const result = await GeminiService.converseWithSenior(message, elderName, history);

    return NextResponse.json({
      success: true,
      modelUsed: 'gemini-3.5-flash',
      data: result
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed companion check-in', details: errorMsg }, { status: 500 });
  }
}

export const POST = secureRoute(handlePOST);
