import { describe, it, expect } from 'vitest';
import { AppointmentService } from '../services/appointment.service';
import { dbService } from '../db/database';

describe('AppointmentService & Escort Planning', () => {
  it('retrieves appointments ordered chronologically', () => {
    const profile = dbService.getDb().profiles[0];
    const apts = AppointmentService.getAppointments(profile.id);

    expect(apts.length).toBeGreaterThan(0);
    if (apts.length > 1) {
      const time1 = new Date(apts[0].appointmentDateTime).getTime();
      const time2 = new Date(apts[1].appointmentDateTime).getTime();
      expect(time1).toBeLessThanOrEqual(time2);
    }
  });

  it('schedules a new doctor appointment with escort coordination', () => {
    const profile = dbService.getDb().profiles[0];
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 20);

    const newApt = AppointmentService.addAppointment(
      profile.id,
      {
        doctorName: 'Dr. Robert Santos, MD',
        specialty: 'Endocrinology',
        clinicName: 'Cascade Diabetes Care Clinic',
        address: '500 Medical Center Blvd, Suite 210',
        contactPhone: '+1 (555) 774-9021',
        appointmentDateTime: nextMonth.toISOString(),
        reasonForVisit: 'HbA1c review and Metformin tolerance assessment',
        accompaniedByMemberId: 'member_sarah',
        accompaniedByName: 'Sarah Vance (Daughter)',
        status: 'UPCOMING',
        preVisitQuestions: ['Is morning fasting blood sugar within 90-120 range acceptable?'],
        doctorNotes: 'Fasting labs required 2 hours prior.'
      },
      'Sarah Vance',
      'FAMILY_MEMBER'
    );

    expect(newApt.id).toBeDefined();
    expect(newApt.doctorName).toBe('Dr. Robert Santos, MD');
    expect(newApt.accompaniedByName).toContain('Sarah Vance');
  });

  it('filters upcoming appointments correctly', () => {
    const profile = dbService.getDb().profiles[0];
    const upcoming = AppointmentService.getUpcomingAppointments(profile.id);

    const now = new Date().getTime();
    for (const apt of upcoming) {
      expect(new Date(apt.appointmentDateTime).getTime()).toBeGreaterThanOrEqual(now - 1000);
      expect(apt.status).toBe('UPCOMING');
    }
  });
});
