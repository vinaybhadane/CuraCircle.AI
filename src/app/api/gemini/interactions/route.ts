import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/services/gemini.service';
import { dbService } from '@/lib/db/database';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const db = dbService.getDb();
    const profileId = searchParams.get('profileId') || db.profiles[0].id;

    const profile = db.profiles.find((p) => p.id === profileId) || db.profiles[0];
    const medications = db.medications
      .filter((m) => m.profileId === profileId && m.active)
      .map((m) => ({
        name: m.name,
        dosage: m.dosage,
        instructions: m.instructions
      }));

    const interactions = await GeminiService.checkDrugInteractions(
      medications,
      [profile.primaryCondition],
      profile.allergies
    );

    return NextResponse.json({
      success: true,
      modelUsed: 'gemini-3.5-flash',
      elderName: profile.elderName,
      activeMedicationsCount: medications.length,
      interactions
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to analyze drug interactions', details: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const medications = body.medications || [];
    const conditions = body.conditions || [];
    const allergies = body.allergies || [];

    const interactions = await GeminiService.checkDrugInteractions(medications, conditions, allergies);

    return NextResponse.json({
      success: true,
      modelUsed: 'gemini-3.5-flash',
      interactions
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to analyze drug interactions', details: errorMsg }, { status: 500 });
  }
}
