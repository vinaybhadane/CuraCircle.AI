import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/services/gemini.service';
import { ScanPrescriptionSchema } from '@/lib/validations/schemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ScanPrescriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid prescription scan payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await GeminiService.scanPrescription(parsed.data.imageBase64, parsed.data.mimeType);

    return NextResponse.json({
      success: true,
      modelUsed: 'gemini-3.5-flash',
      data: result
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to scan prescription with Gemini 3.5 Flash', details: errorMsg }, { status: 500 });
  }
}
