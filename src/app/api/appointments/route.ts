export const dynamic = 'force-dynamic';
import { secureRoute, requireCircle } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { AppointmentService } from '@/lib/services/appointment.service';
import { AppointmentCreateSchema } from '@/lib/validations/schemas';
import { dbService } from '@/lib/db/database';

async function handleGET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const db = dbService.getDb();
    const profileId = searchParams.get('profileId') || db.profiles[0].id;
    const upcomingOnly = searchParams.get('upcoming') === 'true';

    const appointments = upcomingOnly
      ? AppointmentService.getUpcomingAppointments(profileId)
      : AppointmentService.getAppointments(profileId);

    return NextResponse.json({ appointments });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to retrieve appointments', details: errorMsg }, { status: 500 });
  }
}

async function handlePOST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AppointmentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid appointment payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const db = dbService.getDb();
    const profileId = body.profileId || db.profiles[0].id;
    const actorName = body.actorName || 'Caregiver';
    const actorRole = body.actorRole || 'PRIMARY_CAREGIVER';

    const appointment = AppointmentService.addAppointment(profileId, parsed.data, actorName, actorRole);
    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to create appointment', details: errorMsg }, { status: 500 });
  }
}

async function handlePUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, updates, actorName, actorRole } = body;
    const validatedUpdates = AppointmentCreateSchema.partial().safeParse(updates);
    if (!validatedUpdates.success) return NextResponse.json({ error: 'Invalid appointment updates' }, { status: 400 });

    if (!id || !updates) {
      return NextResponse.json({ error: 'Appointment ID and updates are required' }, { status: 400 });
    }

    const updated = AppointmentService.updateAppointment(
      id,
      validatedUpdates.data,
      actorName || 'Caregiver',
      actorRole || 'PRIMARY_CAREGIVER'
    );

    if (!updated) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, appointment: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to update appointment', details: errorMsg }, { status: 500 });
  }
}

async function handleDELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const actorName = searchParams.get('actorName') || 'Caregiver';
    const actorRole = (searchParams.get('actorRole') as any) || 'PRIMARY_CAREGIVER';

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    const deleted = AppointmentService.deleteAppointment(id, actorName, actorRole);
    if (!deleted) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Appointment cancelled successfully' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to cancel appointment', details: errorMsg }, { status: 500 });
  }
}

export const GET = secureRoute(handleGET);

export const POST = secureRoute(handlePOST, 'canManageAppointments');

export const PUT = secureRoute(handlePUT, 'canManageAppointments');

export const DELETE = secureRoute(handleDELETE, 'canManageAppointments');
