'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Volume2,
  Mic,
  Calendar,
  AlertTriangle,
  PhoneCall,
  Sparkles,
  Info
} from 'lucide-react';
import { CareCircleProfile, DoseLog, DoctorAppointment } from '@/lib/types';

interface ElderModeProps {
  profile: CareCircleProfile;
  doses: DoseLog[];
  appointments: DoctorAppointment[];
  onTakeDose: (doseId: string) => void;
  onSkipDose: (doseId: string, reason: string) => void;
  onSnoozeDose: (doseId: string, minutes: number) => void;
  onOpenVoiceCompanion: () => void;
  onOpenSosModal: () => void;
  audioEnabled: boolean;
}

export const ElderMode: React.FC<ElderModeProps> = ({
  profile,
  doses,
  appointments,
  onTakeDose,
  onSkipDose,
  onSnoozeDose,
  onOpenVoiceCompanion,
  onOpenSosModal,
  audioEnabled
}) => {
  const [selectedSkipDoseId, setSelectedSkipDoseId] = useState<string | null>(null);
  const [skipReasonText, setSkipReasonText] = useState('');

  // Find next pending or missed dose
  const nextDose = doses.find((d) => d.status === 'PENDING' || d.status === 'MISSED');
  const completedDoses = doses.filter((d) => d.status === 'TAKEN');
  const upcomingAppointments = appointments.filter((a) => a.status === 'UPCOMING');

  const speakText = (text: string) => {
    if (!audioEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower, clear cadence for seniors
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleReadScheduleAloud = () => {
    if (doses.length === 0) {
      speakText(`Hello ${profile.elderName}. You have no scheduled medicines for today.`);
      return;
    }
    const pendingCount = doses.filter((d) => d.status === 'PENDING').length;
    let message = `Hello ${profile.elderName}. Here is your health plan for today. You have ${doses.length} scheduled medicines, and ${pendingCount} are still due. `;
    if (nextDose) {
      message += `Your next medicine is ${nextDose.medicationName}, ${nextDose.dosage}, scheduled for ${nextDose.scheduledTime}. `;
    }
    if (upcomingAppointments.length > 0) {
      message += `You have an upcoming appointment with ${upcomingAppointments[0].doctorName} on ${new Date(upcomingAppointments[0].appointmentDateTime).toLocaleDateString()}.`;
    }
    speakText(message);
  };

  const handleConfirmTake = (dose: DoseLog) => {
    onTakeDose(dose.id);
    speakText(`Wonderful job, ${profile.elderName}! I have recorded that you took your ${dose.medicationName}. Your family has been notified.`);
  };

  const handleConfirmSkip = (doseId: string) => {
    onSkipDose(doseId, skipReasonText || 'Skipped by elder choice');
    setSelectedSkipDoseId(null);
    setSkipReasonText('');
    speakText('Dose noted as skipped. We have logged this for Nurse David and your family.');
  };

  return (
    <main id="main-content" className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Elder Greeting Banner */}
      <section
        aria-labelledby="elder-greeting"
        className="bg-gradient-to-r from-sky-700 to-brand-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/30 text-sky-100 text-sm font-semibold border border-sky-300/30">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              Elder Voice & Health Assistant Active
            </span>
            <h1 id="elder-greeting" className="text-3xl sm:text-4xl font-black tracking-tight">
              Good day, {profile.elderName}!
            </h1>
            <p className="text-sky-100 text-lg sm:text-xl font-medium max-w-xl">
              Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
              Take your time and rest well. We are watching over your routine.
            </p>
          </div>

          {/* Action buttons on Banner */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleReadScheduleAloud}
              aria-label="Read today's schedule aloud"
              className="flex items-center justify-center gap-3 px-6 py-4 bg-white text-sky-900 hover:bg-sky-50 rounded-2xl font-black text-lg shadow-lg min-h-[64px] min-w-[200px] transition-transform active:scale-95"
            >
              <Volume2 className="w-6 h-6 text-brand-600" />
              <span>Read Aloud</span>
            </button>
            <button
              onClick={onOpenVoiceCompanion}
              aria-label="Start voice conversation with Amity"
              className="flex items-center justify-center gap-3 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-lg min-h-[64px] min-w-[200px] transition-transform active:scale-95"
            >
              <Mic className="w-6 h-6" />
              <span>Talk to Amity</span>
            </button>
          </div>
        </div>
      </section>

      {/* Hero: Next Dose Due */}
      <section aria-labelledby="next-dose-heading" className="space-y-4">
        <h2 id="next-dose-heading" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <Clock className="w-8 h-8 text-brand-600 dark:text-brand-400" />
          <span>Next Scheduled Medicine</span>
        </h2>

        {nextDose ? (
          <div className="bg-white dark:bg-slate-900 border-4 border-brand-500 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="inline-block px-4 py-1.5 rounded-full text-base font-black bg-brand-100 text-brand-900 dark:bg-brand-950 dark:text-brand-300">
                  SCHEDULED TIME: {nextDose.scheduledTime}
                </span>
                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-2">
                  {nextDose.medicationName}
                </h3>
                <p className="text-xl sm:text-2xl font-bold text-brand-700 dark:text-brand-400">
                  Dosage: {nextDose.dosage}
                </p>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 text-amber-900 border-2 border-amber-300">
                <AlertCircle className="w-8 h-8 text-amber-600" />
                <span className="text-lg font-black">Ready To Take</span>
              </div>
            </div>

            {/* Elder Action Buttons (Huge Touch Targets) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <button
                onClick={() => handleConfirmTake(nextDose)}
                aria-label={`Confirm taken ${nextDose.medicationName} ${nextDose.dosage}`}
                className="col-span-1 md:col-span-2 flex items-center justify-center gap-3 py-5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl sm:text-2xl shadow-xl min-h-[72px] transition-transform active:scale-95"
              >
                <CheckCircle2 className="w-8 h-8" />
                <span>I Took This Medicine</span>
              </button>

              <button
                onClick={() => onSnoozeDose(nextDose.id, 15)}
                aria-label="Remind me again in 15 minutes"
                className="flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 border-2 border-amber-300 font-bold text-lg min-h-[72px]"
              >
                <Clock className="w-6 h-6 text-amber-700" />
                <span>Remind In 15m</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedSkipDoseId(nextDose.id)}
                className="text-base font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 underline"
              >
                Skip this dose with a note
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 rounded-3xl p-8 text-center space-y-3">
            <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-900 dark:text-emerald-200">
              All Caught Up For Today!
            </h3>
            <p className="text-lg text-emerald-800 dark:text-emerald-300 font-medium">
              You have completed all your scheduled medicines on time. Fantastic job, {profile.elderName}!
            </p>
          </div>
        )}
      </section>

      {/* Skip Modal Prompt */}
      {selectedSkipDoseId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl border-2 border-slate-300">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              Why are you skipping this medicine?
            </h3>
            <p className="text-base text-slate-600 dark:text-slate-300">
              We will inform your family and caregiver so they know how you are feeling.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {['Feeling nauseous / upset stomach', 'Doctor advised to hold today', 'Ran out of pills', 'Not feeling well'].map((r) => (
                <button
                  key={r}
                  onClick={() => setSkipReasonText(r)}
                  className={`p-3 text-left rounded-xl border-2 font-bold text-base ${
                    skipReasonText === r ? 'border-brand-600 bg-brand-50' : 'border-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setSelectedSkipDoseId(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-base"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmSkip(selectedSkipDoseId)}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-base"
              >
                Confirm Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Today Timeline */}
      <section aria-labelledby="today-plan-heading" className="space-y-4">
        <h2 id="today-plan-heading" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <Calendar className="w-8 h-8 text-brand-600 dark:text-brand-400" />
          <span>Today&apos;s Medicine Schedule</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doses.map((dose) => {
            const isTaken = dose.status === 'TAKEN';
            const isSkipped = dose.status === 'SKIPPED';
            const isMissed = dose.status === 'MISSED';

            return (
              <div
                key={dose.id}
                className={`p-6 rounded-2xl border-2 transition-all shadow-sm ${
                  isTaken
                    ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/20'
                    : isMissed
                    ? 'bg-rose-50 border-rose-300 dark:bg-rose-950/20'
                    : isSkipped
                    ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/20'
                    : 'bg-white border-slate-300 dark:bg-slate-900 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-slate-700 dark:text-slate-300">
                    🕒 {dose.scheduledTime}
                  </span>
                  {isTaken && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-black bg-emerald-200 text-emerald-900">
                      <CheckCircle2 className="w-4 h-4" /> Taken
                    </span>
                  )}
                  {isSkipped && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-black bg-amber-200 text-amber-900">
                      <AlertCircle className="w-4 h-4" /> Skipped
                    </span>
                  )}
                  {isMissed && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-black bg-rose-200 text-rose-900">
                      <AlertTriangle className="w-4 h-4" /> Overdue
                    </span>
                  )}
                  {!isTaken && !isSkipped && !isMissed && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-black bg-sky-100 text-sky-900">
                      <Clock className="w-4 h-4" /> Due
                    </span>
                  )}
                </div>

                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                  {dose.medicationName}
                </h4>
                <p className="text-base sm:text-lg font-bold text-slate-600 dark:text-slate-400">
                  Dosage: {dose.dosage}
                </p>

                {!isTaken && (
                  <button
                    onClick={() => handleConfirmTake(dose)}
                    aria-label={`Mark ${dose.medicationName} as taken`}
                    className="mt-4 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg min-h-[48px] shadow"
                  >
                    Mark as Taken
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Upcoming Doctor Visits for Elder */}
      {upcomingAppointments.length > 0 && (
        <section aria-labelledby="elder-appointments-heading" className="space-y-4">
          <h2 id="elder-appointments-heading" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Calendar className="w-8 h-8 text-brand-600" />
            <span>Upcoming Doctor Appointment</span>
          </h2>

          <div className="bg-white dark:bg-slate-900 border-2 border-brand-300 rounded-3xl p-6 shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {upcomingAppointments[0].doctorName} &bull; {upcomingAppointments[0].specialty}
              </h3>
              <span className="px-3 py-1 rounded-full bg-brand-100 text-brand-900 text-base font-bold">
                {new Date(upcomingAppointments[0].appointmentDateTime).toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <p className="text-lg text-slate-700 dark:text-slate-300">
              <strong>Location:</strong> {upcomingAppointments[0].clinicName} ({upcomingAppointments[0].address})
            </p>
            <p className="text-lg text-brand-800 dark:text-brand-300 font-bold">
              <strong>Family Escort:</strong> {upcomingAppointments[0].accompaniedByName || 'Family Companion'}
            </p>
            <button
              onClick={() =>
                speakText(
                  `You have an appointment with ${upcomingAppointments[0].doctorName} at ${upcomingAppointments[0].clinicName}. Your family member ${upcomingAppointments[0].accompaniedByName} will accompany you.`
                )
              }
              className="flex items-center gap-2 text-brand-700 font-black text-base underline pt-2"
            >
              <Volume2 className="w-5 h-5" /> Read Details Aloud
            </button>
          </div>
        </section>
      )}

      {/* Emergency Assistance Card */}
      <section aria-labelledby="sos-section" className="bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 id="sos-section" className="text-2xl font-black text-rose-900 dark:text-rose-200 flex items-center gap-2">
              <PhoneCall className="w-6 h-6 text-rose-600" />
              Need Immediate Help?
            </h3>
            <p className="text-base text-rose-800 dark:text-rose-300 font-medium">
              Press the SOS button below to alert Sarah, Marcus, and Nurse David instantly.
            </p>
          </div>
          <button
            onClick={onOpenSosModal}
            className="px-8 py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xl shadow-xl min-h-[64px] transition-transform active:scale-95 animate-pulse"
          >
            🚨 PRESS FOR EMERGENCY HELP
          </button>
        </div>
      </section>
    </main>
  );
};
