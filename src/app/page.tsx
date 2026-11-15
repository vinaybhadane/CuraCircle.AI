'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { ElderMode } from '@/components/ElderMode';
import { CaregiverDashboard } from '@/components/CaregiverDashboard';
import { PrescriptionScannerModal } from '@/components/PrescriptionScannerModal';
import { InteractionsModal } from '@/components/InteractionsModal';
import { AppointmentsModal } from '@/components/AppointmentsModal';
import { OutboxModal } from '@/components/OutboxModal';
import { VoiceCompanionModal } from '@/components/VoiceCompanionModal';
import { PasscodeModal } from '@/components/PasscodeModal';
import { SosModal } from '@/components/SosModal';
import { MedicationModal } from '@/components/MedicationModal';
import { AuditLogModal } from '@/components/AuditLogModal';
import {
  CareCircleProfile,
  CareCircleMember,
  Medication,
  DoseLog,
  DoctorAppointment,
  AdherenceStats,
  Role
} from '@/lib/types';

export default function HomePage() {
  const [viewMode, setViewMode] = useState<'ELDER' | 'CAREGIVER'>('ELDER');
  const [currentRole, setCurrentRole] = useState<Role>('ELDER');
  const [profile, setProfile] = useState<CareCircleProfile | null>(null);
  const [members, setMembers] = useState<CareCircleMember[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doses, setDoses] = useState<DoseLog[]>([]);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [stats, setStats] = useState<AdherenceStats>({
    todayComplianceRate: 100,
    sevenDayComplianceRate: 95,
    totalDosesScheduledToday: 4,
    dosesTakenToday: 2,
    dosesSkippedToday: 0,
    dosesMissedToday: 0,
    currentStreakDays: 14
  });
  const [outboxCount, setOutboxCount] = useState(1);
  const [schedulerLoading, setSchedulerLoading] = useState(false);

  // Accessibility States
  const [contrastMode, setContrastMode] = useState<'normal' | 'dark' | 'gold'>('normal');
  const [fontScale, setFontScale] = useState(1.0);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Modal States
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isInteractionsModalOpen, setIsInteractionsModalOpen] = useState(false);
  const [isAppointmentsModalOpen, setIsAppointmentsModalOpen] = useState(false);
  const [isOutboxModalOpen, setIsOutboxModalOpen] = useState(false);
  const [isVoiceCompanionOpen, setIsVoiceCompanionOpen] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isMedicationModalOpen, setIsMedicationModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [medicationToEdit, setMedicationToEdit] = useState<Medication | null>(null);

  // Initial Data Fetch
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // 1. Session & Profile
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      if (sessionData.profile) {
        setProfile(sessionData.profile);
        setMembers(sessionData.members || []);
      }

      // 2. Medications
      const medsRes = await fetch('/api/medications');
      const medsData = await medsRes.json();
      setMedications(medsData.medications || []);

      // 3. Adherence & Doses
      const adhRes = await fetch('/api/adherence');
      const adhData = await adhRes.json();
      setDoses(adhData.doses || []);
      if (adhData.stats) setStats(adhData.stats);

      // 4. Appointments
      const aptsRes = await fetch('/api/appointments');
      const aptsData = await aptsRes.json();
      setAppointments(aptsData.appointments || []);

      // 5. Outbox Count
      const outboxRes = await fetch('/api/outbox');
      const outboxData = await outboxRes.json();
      setOutboxCount(outboxData.total || 1);
    } catch (err) {
      console.error('Failed to initialize platform data:', err);
    }
  };

  // Dose Actions
  const handleTakeDose = async (doseId: string) => {
    try {
      const res = await fetch('/api/adherence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doseId,
          action: 'TAKEN',
          actorName: profile?.elderName || 'Eleanor Vance',
          actorRole: currentRole
        })
      });
      const data = await res.json();
      if (data.success) {
        setDoses((prev) => prev.map((d) => (d.id === doseId ? data.dose : d)));
        if (data.stats) setStats(data.stats);
        // Refresh medications to reflect decremented pill count
        const medsRes = await fetch('/api/medications');
        const medsData = await medsRes.json();
        setMedications(medsData.medications || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSkipDose = async (doseId: string, reason: string) => {
    try {
      const res = await fetch('/api/adherence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doseId,
          action: 'SKIPPED',
          skipReason: reason,
          actorName: profile?.elderName || 'Eleanor Vance',
          actorRole: currentRole
        })
      });
      const data = await res.json();
      if (data.success) {
        setDoses((prev) => prev.map((d) => (d.id === doseId ? data.dose : d)));
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSnoozeDose = async (doseId: string, minutes: number) => {
    try {
      const res = await fetch('/api/adherence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doseId,
          action: 'SNOOZED',
          snoozeMinutes: minutes,
          actorName: profile?.elderName || 'Eleanor Vance',
          actorRole: currentRole
        })
      });
      const data = await res.json();
      if (data.success) {
        setDoses((prev) => prev.map((d) => (d.id === doseId ? data.dose : d)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Medication CRUD
  const handleSaveMedication = async (medData: any) => {
    try {
      const method = medData.id ? 'PUT' : 'POST';
      const payload = medData.id ? { id: medData.id, updates: medData } : medData;

      const res = await fetch('/api/medications', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMedication = async (id: string) => {
    if (!confirm('Are you sure you want to remove this medication from Eleanor Vance\'s active schedule?')) return;
    try {
      const res = await fetch(`/api/medications?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefillMedication = async (id: string, newCount: number) => {
    try {
      const res = await fetch('/api/medications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates: { pillCountCurrent: newCount } })
      });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Appointment CRUD
  const handleAddAppointment = async (aptData: any) => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aptData)
      });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Proactive Scheduler Check
  const handleRunSchedulerCheck = async () => {
    setSchedulerLoading(true);
    try {
      const res = await fetch('/api/scheduler/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile?.id })
      });
      const data = await res.json();
      if (data.success) {
        // Reload outbox count and adherence
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSchedulerLoading(false);
    }
  };

  const handlePasscodeSuccess = (role: Role, memberName: string) => {
    setCurrentRole(role);
    if (role === 'ELDER') {
      setViewMode('ELDER');
    } else {
      setViewMode('CAREGIVER');
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const contrastClass =
    contrastMode === 'dark' ? 'high-contrast-dark' : contrastMode === 'gold' ? 'high-contrast-gold' : '';

  return (
    <div
      className={`min-h-screen transition-colors ${contrastClass}`}
      style={{ fontSize: `${fontScale * 100}%` }}
    >
      <Navbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        currentRole={currentRole}
        profile={profile}
        contrastMode={contrastMode}
        setContrastMode={setContrastMode}
        fontScale={fontScale}
        setFontScale={setFontScale}
        audioEnabled={audioEnabled}
        setAudioEnabled={setAudioEnabled}
        onOpenPasscodeModal={() => setIsPasscodeModalOpen(true)}
        onOpenOutboxModal={() => setIsOutboxModalOpen(true)}
        onOpenSosModal={() => setIsSosModalOpen(true)}
        outboxCount={outboxCount}
      />

      {viewMode === 'ELDER' ? (
        <ElderMode
          profile={profile}
          doses={doses}
          appointments={appointments}
          onTakeDose={handleTakeDose}
          onSkipDose={handleSkipDose}
          onSnoozeDose={handleSnoozeDose}
          onOpenVoiceCompanion={() => setIsVoiceCompanionOpen(true)}
          onOpenSosModal={() => setIsSosModalOpen(true)}
          audioEnabled={audioEnabled}
        />
      ) : (
        <CaregiverDashboard
          profile={profile}
          members={members}
          medications={medications}
          doses={doses}
          appointments={appointments}
          stats={stats}
          currentRole={currentRole}
          onOpenMedicationModal={(med) => {
            setMedicationToEdit(med || null);
            setIsMedicationModalOpen(true);
          }}
          onOpenScannerModal={() => setIsScannerModalOpen(true)}
          onOpenInteractionsModal={() => setIsInteractionsModalOpen(true)}
          onOpenAppointmentsModal={() => setIsAppointmentsModalOpen(true)}
          onOpenOutboxModal={() => setIsOutboxModalOpen(true)}
          onOpenAuditModal={() => setIsAuditModalOpen(true)}
          onOpenVoiceCompanion={() => setIsVoiceCompanionOpen(true)}
          onDeleteMedication={handleDeleteMedication}
          onRefillMedication={handleRefillMedication}
          onRunSchedulerCheck={handleRunSchedulerCheck}
          schedulerLoading={schedulerLoading}
        />
      )}

      {/* Modals */}
      <PrescriptionScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onApplyExtractedMedication={handleSaveMedication}
      />

      <InteractionsModal
        isOpen={isInteractionsModalOpen}
        onClose={() => setIsInteractionsModalOpen(false)}
        elderName={profile.elderName}
      />

      <AppointmentsModal
        isOpen={isAppointmentsModalOpen}
        onClose={() => setIsAppointmentsModalOpen(false)}
        appointments={appointments}
        members={members}
        onAddAppointment={handleAddAppointment}
      />

      <OutboxModal
        isOpen={isOutboxModalOpen}
        onClose={() => setIsOutboxModalOpen(false)}
        onRunSchedulerCheck={handleRunSchedulerCheck}
        schedulerLoading={schedulerLoading}
      />

      <VoiceCompanionModal
        isOpen={isVoiceCompanionOpen}
        onClose={() => setIsVoiceCompanionOpen(false)}
        elderName={profile.elderName}
        audioEnabled={audioEnabled}
      />

      <PasscodeModal
        isOpen={isPasscodeModalOpen}
        onClose={() => setIsPasscodeModalOpen(false)}
        profileId={profile.id}
        onSuccess={handlePasscodeSuccess}
      />

      <SosModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        profile={profile}
      />

      <MedicationModal
        isOpen={isMedicationModalOpen}
        onClose={() => {
          setIsMedicationModalOpen(false);
          setMedicationToEdit(null);
        }}
        medicationToEdit={medicationToEdit}
        onSave={handleSaveMedication}
      />

      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        elderName={profile.elderName}
      />
    </div>
  );
}
