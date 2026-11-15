import { dbService } from '../db/database';
import { DoctorAppointment, Role } from '../types';
import { AuthService } from './auth.service';

export class AppointmentService {
  public static getAppointments(profileId: string): DoctorAppointment[] {
    const db = dbService.getDb();
    const apts = db.appointments.filter((a) => a.profileId === profileId);
    return apts.sort(
      (a, b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime()
    );
  }

  public static getUpcomingAppointments(profileId: string): DoctorAppointment[] {
    const db = dbService.getDb();
    const now = new Date();
    return db.appointments
      .filter((a) => a.profileId === profileId && a.status === 'UPCOMING' && new Date(a.appointmentDateTime) >= now)
      .sort((a, b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime());
  }

  public static addAppointment(
    profileId: string,
    data: Omit<DoctorAppointment, 'id' | 'profileId' | 'remindersSent' | 'createdAt' | 'updatedAt'>,
    actorName: string,
    actorRole: Role
  ): DoctorAppointment {
    const db = dbService.getDb();
    const newApt: DoctorAppointment = {
      ...data,
      id: `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      profileId,
      remindersSent: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.appointments.push(newApt);
    dbService.save();

    AuthService.recordAudit(
      profileId,
      actorRole,
      'APPOINTMENT_SCHEDULED',
      `Scheduled appointment with ${newApt.doctorName} (${newApt.specialty}) on ${new Date(newApt.appointmentDateTime).toLocaleString()} by ${actorName}.`
    );

    return newApt;
  }

  public static updateAppointment(
    id: string,
    updates: Partial<Omit<DoctorAppointment, 'id' | 'profileId' | 'createdAt'>>,
    actorName: string,
    actorRole: Role
  ): DoctorAppointment | null {
    const db = dbService.getDb();
    const index = db.appointments.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const existing = db.appointments[index];
    const updated: DoctorAppointment = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    if (updates.appointmentDateTime && updates.appointmentDateTime !== existing.appointmentDateTime) {
      updated.remindersSent = {};
    }

    db.appointments[index] = updated;
    dbService.save();

    AuthService.recordAudit(
      updated.profileId,
      actorRole,
      'APPOINTMENT_UPDATED',
      `Updated appointment with ${updated.doctorName} by ${actorName}.`
    );

    return updated;
  }

  public static deleteAppointment(id: string, actorName: string, actorRole: Role): boolean {
    const db = dbService.getDb();
    const index = db.appointments.findIndex((a) => a.id === id);
    if (index === -1) return false;

    const apt = db.appointments[index];
    db.appointments.splice(index, 1);
    dbService.save();

    AuthService.recordAudit(
      apt.profileId,
      actorRole,
      'APPOINTMENT_CANCELLED',
      `Cancelled appointment with ${apt.doctorName} on ${new Date(apt.appointmentDateTime).toLocaleString()} by ${actorName}.`
    );

    return true;
  }
}
