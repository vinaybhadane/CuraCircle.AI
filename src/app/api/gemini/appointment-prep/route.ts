import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/services/gemini.service';
import { dbService } from '@/lib/db/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doctorSpecialty, reasonForVisit, profileId } = body;

    const db = dbService.getDb();
    const targetProfileId = profileId || db.profiles[0].id;
    const meds = db.medications
      .filter((m) => m.profileId === targetProfileId && m.active)
      .map((m) => `${m.name} (${m.dosage})`);

    const questions = await GeminiService.generateDoctorVisitQuestions(
      doctorSpecialty || 'General Practitioner',
      reasonForVisit || 'Routine follow-up',
      meds,
      95
    );

    return NextResponse.json({
      success: true,
      modelUsed: 'gemini-3.5-flash',
      questions
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to generate appointment questions', details: errorMsg }, { status: 500 });
  }
}
