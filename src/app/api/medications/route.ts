import { NextRequest, NextResponse } from 'next/server';
import { MedicationService } from '@/lib/services/medication.service';
import { MedicationCreateSchema } from '@/lib/validations/schemas';
import { dbService } from '@/lib/db/database';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const db = dbService.getDb();
    const profileId = searchParams.get('profileId') || db.profiles[0].id;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const medications = MedicationService.getMedications(profileId, activeOnly);
    return NextResponse.json({ medications });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to retrieve medications', details: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = MedicationCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid medication data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const db = dbService.getDb();
    const profileId = body.profileId || db.profiles[0].id;
    const actorName = body.actorName || 'Caregiver';
    const actorRole = body.actorRole || 'PRIMARY_CAREGIVER';

    const newMed = MedicationService.addMedication(profileId, parsed.data, actorName, actorRole);
    return NextResponse.json({ success: true, medication: newMed }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to create medication', details: errorMsg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, updates, actorName, actorRole } = body;

    if (!id || !updates) {
      return NextResponse.json({ error: 'Medication ID and updates are required' }, { status: 400 });
    }

    const updated = MedicationService.updateMedication(
      id,
      updates,
      actorName || 'Caregiver',
      actorRole || 'PRIMARY_CAREGIVER'
    );

    if (!updated) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, medication: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to update medication', details: errorMsg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const actorName = searchParams.get('actorName') || 'Caregiver';
    const actorRole = (searchParams.get('actorRole') as any) || 'PRIMARY_CAREGIVER';

    if (!id) {
      return NextResponse.json({ error: 'Medication ID is required' }, { status: 400 });
    }

    const deleted = MedicationService.deleteMedication(id, actorName, actorRole);
    if (!deleted) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Medication successfully removed' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to delete medication', details: errorMsg }, { status: 500 });
  }
}
