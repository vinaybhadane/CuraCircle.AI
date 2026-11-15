'use client';

import React from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Plus,
  Camera,
  ShieldAlert,
  Calendar,
  Mail,
  FileText,
  UserCheck,
  Pill,
  Trash2,
  Edit,
  Sparkles,
  Phone,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  CareCircleProfile,
  CareCircleMember,
  Medication,
  DoseLog,
  DoctorAppointment,
  AdherenceStats,
  Role
} from '@/lib/types';

interface CaregiverDashboardProps {
  profile: CareCircleProfile;
  members: CareCircleMember[];
  medications: Medication[];
  doses: DoseLog[];
  appointments: DoctorAppointment[];
  stats: AdherenceStats;
  currentRole: Role;
  onOpenMedicationModal: (med?: Medication) => void;
  onOpenScannerModal: () => void;
  onOpenInteractionsModal: () => void;
  onOpenAppointmentsModal: () => void;
  onOpenOutboxModal: () => void;
  onOpenAuditModal: () => void;
  onOpenVoiceCompanion: () => void;
  onDeleteMedication: (id: string) => void;
  onRefillMedication: (id: string, newCount: number) => void;
  onRunSchedulerCheck: () => void;
  schedulerLoading: boolean;
}

export const CaregiverDashboard: React.FC<CaregiverDashboardProps> = ({
  profile,
  members,
  medications,
  doses,
  appointments,
  stats,
  currentRole,
  onOpenMedicationModal,
  onOpenScannerModal,
  onOpenInteractionsModal,
  onOpenAppointmentsModal,
  onOpenOutboxModal,
  onOpenAuditModal,
  onOpenVoiceCompanion,
  onDeleteMedication,
  onRefillMedication,
  onRunSchedulerCheck,
  schedulerLoading
}) => {
  const canEdit = currentRole === 'PRIMARY_CAREGIVER' || currentRole === 'FAMILY_MEMBER';
  const upcomingAppointments = appointments.filter((a) => a.status === 'UPCOMING');

  return (
    <main id="main-content" className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Profile & Emergency Health Summary Card */}
      <section
        aria-labelledby="caregiver-summary-heading"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 p-1 flex-shrink-0 shadow-md">
            <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center text-3xl font-black text-brand-700">
              EV
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 id="caregiver-summary-heading" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {profile.elderName}
              </h1>
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300">
                Age {profile.elderAge}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Primary Conditions:</strong> {profile.primaryCondition}
            </p>
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              <strong>Allergies:</strong> {profile.allergies.join(', ')} &bull; <strong>Blood Type:</strong> {profile.bloodType || 'O+'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={onRunSchedulerCheck}
            disabled={schedulerLoading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm border border-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${schedulerLoading ? 'animate-spin text-brand-600' : ''}`} />
            <span>{schedulerLoading ? 'Checking Rules...' : 'Run Proactive Email Check'}</span>
          </button>

          <button
            onClick={onOpenVoiceCompanion}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Health Companion Digest</span>
          </button>
        </div>
      </section>

      {/* Adherence Intelligence Gauges */}
      <section aria-labelledby="adherence-metrics-heading" className="space-y-4">
        <h2 id="adherence-metrics-heading" className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-600" />
          <span>Real-Time Adherence Intelligence</span>
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Rate */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-500">Today&apos;s Adherence</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-brand-600 dark:text-brand-400">
                {stats.todayComplianceRate}%
              </span>
              <span className="text-xs text-slate-500 font-semibold">compliance</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {stats.dosesTakenToday} of {stats.totalDosesScheduledToday} doses taken
            </p>
          </div>

          {/* 7-Day Trend */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-500">7-Day Adherence</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.sevenDayComplianceRate}%
              </span>
              <span className="text-xs text-emerald-600 font-bold">Stable</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Evaluated over 35 past scheduled doses
            </p>
          </div>

          {/* Current Streak */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-500">Consecutive Streak</span>
            <div className="flex items-center gap-2">
              <span className="text-4xl font-black text-amber-500">
                {stats.currentStreakDays}
              </span>
              <Flame className="w-7 h-7 text-amber-500 fill-amber-500" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Consecutive days on schedule
            </p>
          </div>

          {/* Doses Overdue / Missed */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-500">Missed / Overdue</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-black ${stats.dosesMissedToday > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {stats.dosesMissedToday}
              </span>
              <span className="text-xs text-slate-500 font-semibold">today</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {stats.dosesMissedToday > 0 ? 'Urgent escalation dispatched' : 'Zero missed doses today'}
            </p>
          </div>
        </div>
      </section>

      {/* Innovative Tooling Action Ribbon */}
      <section aria-labelledby="quick-tools-heading" className="space-y-3">
        <h2 id="quick-tools-heading" className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-sky-600" />
          <span>Smart Clinical Tools (Gemini 3.5 Flash Powered)</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={onOpenScannerModal}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-slate-800 border-2 border-sky-200 dark:border-slate-700 transition-all text-center group shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-sm font-black text-slate-900 dark:text-white">Scan Prescription</span>
            <span className="text-[11px] text-sky-600 font-bold">Multimodal AI</span>
          </button>

          <button
            onClick={onOpenInteractionsModal}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-slate-800 border-2 border-amber-200 dark:border-slate-700 transition-all text-center group shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <span className="text-sm font-black text-slate-900 dark:text-white">Drug & Food Safety</span>
            <span className="text-[11px] text-amber-600 font-bold">Interaction Check</span>
          </button>

          <button
            onClick={() => onOpenMedicationModal()}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 hover:bg-brand-50 dark:hover:bg-slate-800 border-2 border-brand-200 dark:border-slate-700 transition-all text-center group shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-sm font-black text-slate-900 dark:text-white">Add Medicine</span>
            <span className="text-[11px] text-brand-600 font-bold">New Schedule</span>
          </button>

          <button
            onClick={onOpenAppointmentsModal}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-slate-800 border-2 border-purple-200 dark:border-slate-700 transition-all text-center group shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-sm font-black text-slate-900 dark:text-white">Doctor Visits</span>
            <span className="text-[11px] text-purple-600 font-bold">AI Questions Prep</span>
          </button>

          <button
            onClick={onOpenOutboxModal}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 border-2 border-emerald-200 dark:border-slate-700 transition-all text-center group shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6" />
            </div>
            <span className="text-sm font-black text-slate-900 dark:text-white">Proactive Alerts</span>
            <span className="text-[11px] text-emerald-600 font-bold">Outbox Inspector</span>
          </button>

          <button
            onClick={onOpenAuditModal}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 transition-all text-center group shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-sm font-black text-slate-900 dark:text-white">Security Logs</span>
            <span className="text-[11px] text-slate-600 font-bold">Immutable Audit</span>
          </button>
        </div>
      </section>

      {/* Main Grid: Today's Schedule & Active Medications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Today's Detailed Schedule Timeline (2 cols) */}
        <section aria-labelledby="timeline-heading" className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="timeline-heading" className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-600" />
              <span>Today&apos;s Medication Timeline</span>
            </h2>
            <span className="text-xs font-bold text-slate-500">
              {doses.length} scheduled doses today
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            {doses.map((dose) => {
              const isTaken = dose.status === 'TAKEN';
              const isSkipped = dose.status === 'SKIPPED';
              const isMissed = dose.status === 'MISSED';

              return (
                <div
                  key={dose.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all ${
                    isTaken
                      ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20'
                      : isMissed
                      ? 'bg-rose-50 border-rose-300 dark:bg-rose-950/20'
                      : isSkipped
                      ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20'
                      : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {dose.scheduledTime}
                      </span>
                      {isTaken && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Taken {dose.actualTime ? `at ${new Date(dose.actualTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </span>
                      )}
                      {isSkipped && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                          <AlertCircle className="w-3.5 h-3.5" /> Skipped: {dose.skipReason}
                        </span>
                      )}
                      {isMissed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800">
                          <AlertTriangle className="w-3.5 h-3.5" /> Overdue (Family Escalated)
                        </span>
                      )}
                      {!isTaken && !isSkipped && !isMissed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-100 text-sky-800">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </div>
                    <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                      {dose.medicationName} &bull; <span className="text-brand-600 font-semibold">{dose.dosage}</span>
                    </p>
                    {dose.notes && (
                      <p className="text-xs text-slate-500 italic">Notes: {dose.notes}</p>
                    )}
                  </div>

                  <div className="mt-3 sm:mt-0 flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      Logged by: {dose.takenByRole || 'Auto-monitor'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Upcoming Appointments & Circle Members (1 col) */}
        <div className="space-y-6">
          {/* Upcoming Doctor Visits */}
          <section aria-labelledby="caregiver-appointments-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="caregiver-appointments-heading" className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <span>Upcoming Appointments</span>
              </h2>
              <button
                onClick={onOpenAppointmentsModal}
                className="text-xs font-bold text-brand-600 hover:underline"
              >
                + Schedule
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900 dark:text-white">{apt.doctorName}</span>
                      <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                        {new Date(apt.appointmentDateTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {apt.specialty} &bull; {apt.clinicName}
                    </p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Escort: {apt.accompaniedByName || 'Unassigned'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center">No upcoming appointments scheduled.</p>
              )}
            </div>
          </section>

          {/* Care Circle Members */}
          <section aria-labelledby="circle-members-heading" className="space-y-3">
            <h2 id="circle-members-heading" className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span>Care Circle Members</span>
            </h2>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((member) => (
                <div key={member.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{member.name}</p>
                    <p className="text-xs text-slate-500">{member.role.replace('_', ' ').toLowerCase()}</p>
                  </div>
                  <span className="text-xs font-mono text-slate-400">{member.email.split('@')[0]}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Active Medications & Refill Inventory Tracker */}
      <section aria-labelledby="active-meds-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="active-meds-heading" className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Pill className="w-5 h-5 text-brand-600" />
            <span>Active Prescription Management & Refills</span>
          </h2>
          {canEdit && (
            <button
              onClick={() => onOpenMedicationModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add New Prescription
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {medications.map((med) => {
            const isLow = med.pillCountCurrent <= med.pillCountRefillThreshold;

            return (
              <div
                key={med.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className="w-4 h-4 rounded-full border border-black/20"
                      style={{ backgroundColor: med.color }}
                      title={`Pill visual color: ${med.color}`}
                    />
                    {isLow ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 animate-pulse">
                        ⚠️ Refill Needed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {med.frequency.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {med.name}
                  </h3>
                  <p className="text-xs font-bold text-brand-700 dark:text-brand-400">
                    {med.dosage} &bull; {med.form}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {med.instructions}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Pills Remaining:</span>
                    <strong className={`text-sm ${isLow ? 'text-rose-600 font-black' : 'text-slate-800 dark:text-white'}`}>
                      {med.pillCountCurrent} doses
                    </strong>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => onRefillMedication(med.id, med.pillCountCurrent + 30)}
                      title="Add 30 pills to supply count"
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      +30 Refill
                    </button>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpenMedicationModal(med)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit medication"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteMedication(med.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950"
                          title="Delete medication"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};
