'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { ElderMode } from '@/components/ElderMode';
import { CaregiverDashboard } from '@/components/CaregiverDashboard';
import { PrescriptionScannerModal } from '@/components/PrescriptionScannerModal';
import { InteractionsModal } from '@/components/InteractionsModal';
import { AppointmentsModal } from '@/components/AppointmentsModal';
import { OutboxModal } from '@/components/OutboxModal';
import { VoiceCompanionModal } from '@/components/VoiceCompanionModal';
import { SosModal } from '@/components/SosModal';
import { MedicationModal } from '@/components/MedicationModal';
import { AuditLogModal } from '@/components/AuditLogModal';
import { ManageMembersModal } from '@/components/ManageMembersModal';
import { FirebaseAuthView } from '@/components/FirebaseAuthView';
import { auth } from '@/lib/firebase/config';
import { OnboardingView } from '@/components/OnboardingView';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
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
  const accountVersion = useRef(0);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [pageError, setPageError] = useState('');
  const [currentMember, setCurrentMember] = useState<CareCircleMember | null>(null);
  const [circles, setCircles] = useState<{id: string; name: string}[]>([]);

  const [viewMode, setViewMode] = useState<'ELDER' | 'CAREGIVER'>('ELDER');
  const [currentRole, setCurrentRole] = useState<Role>('ELDER');
  const [profile, setProfile] = useState<CareCircleProfile | null>(null);
  const [members, setMembers] = useState<CareCircleMember[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doses, setDoses] = useState<DoseLog[]>([]);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [stats, setStats] = useState<AdherenceStats>({
    todayComplianceRate: 0,
    sevenDayComplianceRate: 0,
    totalDosesScheduledToday: 0,
    dosesTakenToday: 0,
    dosesSkippedToday: 0,
    dosesMissedToday: 0,
    currentStreakDays: 0
  });
  const [outboxCount, setOutboxCount] = useState(0);
  const [schedulerLoading, setSchedulerLoading] = useState(false);

  // Accessibility States
  const [fontScale, setFontScale] = useState(1.0);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Modal States
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isInteractionsModalOpen, setIsInteractionsModalOpen] = useState(false);
  const [isAppointmentsModalOpen, setIsAppointmentsModalOpen] = useState(false);
  const [isOutboxModalOpen, setIsOutboxModalOpen] = useState(false);
  const [isVoiceCompanionOpen, setIsVoiceCompanionOpen] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isMedicationModalOpen, setIsMedicationModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [medicationToEdit, setMedicationToEdit] = useState<Medication | null>(null);

  const request = async (url: string, options?: RequestInit) => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.clone().json().catch(() => ({}));
      const message = data.error || 'The request failed. Please try again.';
      setPageError(message);
      throw new Error(message);
    }
    return response;
  };

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      const version = ++accountVersion.current;
      setFirebaseUser(user);
      setAuthChecking(true);
      setPageError('');
      try {
        if (user) {
          const response = await fetch('/api/auth/session', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: await user.getIdToken() })
          });
          const session = await response.json();
          if (!response.ok) throw new Error(session.error || 'Google session could not be verified.');
          if (!active || version !== accountVersion.current) return;
          setCurrentRole(session.role || 'ELDER');
          setViewMode(session.role && session.role !== 'ELDER' ? 'CAREGIVER' : 'ELDER');
          await loadAllData();
        } else {
          setProfile(null); setMembers([]); setMedications([]); setDoses([]); setAppointments([]); setCurrentMember(null);
        }
      } catch (error) { if (active) setPageError(error instanceof Error ? error.message : 'Could not load your account.'); }
      finally { if (active) setAuthChecking(false); }
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  const loadAllData = async () => {
    const version = accountVersion.current;
    const sessionRes = await request('/api/auth/session');
    const session = await sessionRes.json();
    if (version !== accountVersion.current) return;
    setNeedsOnboarding(session.needsOnboarding);
    setCircles(session.circles || []);
    if (!session.profile) return;
    setProfile(session.profile);
    setMembers(session.members || []);
    setCurrentMember(session.member);
    setCurrentRole(session.role);
    const responses = await Promise.all(['/api/medications', '/api/adherence', '/api/appointments', '/api/notifications'].map((url) => request(url)));
    const [medsData, adhData, aptsData, notificationData] = await Promise.all(responses.map((response) => response.json()));
    if (version !== accountVersion.current) return;
    setMedications(medsData.medications || []);
    setDoses(adhData.doses || []);
    if (adhData.stats) setStats(adhData.stats);
    setAppointments(aptsData.appointments || []);
    setOutboxCount(notificationData.unreadCount || 0);
  };

  useEffect(() => {
    if (!profile?.id) return;
    let running = false;
    const seenNotifications = new Set<string>();
    let initializedNotifications = false;
    const check = async () => {
      if (running) return;
      running = true;
      try {
        await request('/api/scheduler/tick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        await loadAllData();
        const notificationResponse = await request('/api/notifications');
        const { notifications } = await notificationResponse.json();
        for (const notification of notifications || []) {
          if (initializedNotifications && !seenNotifications.has(notification.id) && !notification.readAt && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('CuraCircle care update', { body: notification.title, tag: notification.id });
          }
          seenNotifications.add(notification.id);
        }
        initializedNotifications = true;
      } catch (error) { console.error('Reminder check failed:', error); }
      finally { running = false; }
    };
    void check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [profile?.id]);

  // Dose Actions
  const handleTakeDose = async (doseId: string) => {
    try {
      const res = await request('/api/adherence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doseId,
          action: 'TAKEN',
          actorName: currentMember?.name || profile?.elderName || 'Patient',
          actorRole: currentRole
        })
      });
      const data = await res.json();
      if (data.success) {
        setDoses((prev) => prev.map((d) => (d.id === doseId ? data.dose : d)));
        if (data.stats) setStats(data.stats);
        // Refresh medications to reflect decremented pill count
        const medsRes = await request('/api/medications');
        const medsData = await medsRes.json();
        setMedications(medsData.medications || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSkipDose = async (doseId: string, reason: string) => {
    try {
      const res = await request('/api/adherence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doseId,
          action: 'SKIPPED',
          skipReason: reason,
          actorName: currentMember?.name || profile?.elderName || 'Patient',
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
      const res = await request('/api/adherence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doseId,
          action: 'SNOOZED',
          snoozeMinutes: minutes,
          actorName: currentMember?.name || profile?.elderName || 'Patient',
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

      const res = await request('/api/medications', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadAllData();
      }
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteMedication = async (id: string) => {
    if (!confirm(`Remove this medication from ${profile?.elderName}'s active schedule?`)) return;
    try {
      const res = await request(`/api/medications?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefillMedication = async (id: string, newCount: number) => {
    try {
      const res = await request('/api/medications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates: { pillCountCurrent: newCount } })
      });
      if (res.ok) {
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Appointment CRUD
  const handleAddAppointment = async (aptData: any) => {
    try {
      const res = await request('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aptData)
      });
      if (res.ok) {
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to cancel and remove this appointment?')) return;
    try {
      const res = await request(`/api/appointments?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setAppointments((prev) => prev.filter((a) => a.id !== id));
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDose = async (doseId: string) => {
    if (!confirm('Are you sure you want to remove this medicine dose from today\'s schedule?')) return;
    try {
      const res = await request(`/api/adherence?id=${doseId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setDoses((prev) => prev.filter((d) => d.id !== doseId));
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Proactive Scheduler Check
  const handleRunSchedulerCheck = async () => {
    setSchedulerLoading(true);
    try {
      const res = await request('/api/scheduler/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile?.id })
      });
      const data = await res.json();
      if (data.success) {
        // Reload outbox count and adherence
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSchedulerLoading(false);
    }
  };

  const handleAddMember = async (memberData: any) => {
    await request('/api/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(memberData) });
    await loadAllData();
  };
  const handleDeleteMember = async (id: string) => {
    await request(`/api/members?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await loadAllData();
  };
  const handleUpdateMember = async (id: string, updates: any) => {
    await request('/api/members', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, updates }) });
    await loadAllData();
  };

  const handleSendTestEmail = async (to: string, toName: string) => {
    const response = await request('/api/outbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, toName }) });
    const data = await response.json();
    await loadAllData();
    return data.email.status as string;
  };
  const handleFirebaseSignOut = async () => {
    try {
      await request('/api/auth/session', { method: 'DELETE' });
      await signOut(auth);
      setProfile(null); setFirebaseUser(null); setNeedsOnboarding(false); setPageError('');
    } catch (error) { console.error(error); }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Connecting to CuraCircle AI &amp; Firebase Authentication...
        </p>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <FirebaseAuthView
        onAuthSuccess={() => { /* onAuthStateChanged establishes the server session. */ }}
      />
    );
  }

  if (needsOnboarding) {
    return <OnboardingView onSignOut={handleFirebaseSignOut} onComplete={async () => {
      await loadAllData(); setNeedsOnboarding(false); setViewMode('CAREGIVER'); setIsScannerModalOpen(true);
    }} />;
  }
  if (!profile) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><div className="bg-white rounded-3xl border p-8 space-y-4 max-w-md">
      <p role="alert" className="text-rose-700">{pageError || 'Loading your healthcare profile?'}</p>
      <button className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold" onClick={() => window.location.reload()}>Retry</button>
      <button className="px-4 py-2 rounded-xl border font-bold ml-2" onClick={handleFirebaseSignOut}>Sign out</button>
    </div></div>;
  }

  return (
    <div
      className="min-h-screen transition-colors bg-slate-50 text-slate-900"
      style={{ fontSize: `${fontScale * 100}%` }}
    >
      <Navbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        currentRole={currentRole}
        profile={profile}
        fontScale={fontScale}
        setFontScale={setFontScale}
        audioEnabled={audioEnabled}
        setAudioEnabled={setAudioEnabled}
        onOpenPasscodeModal={() => setIsMembersModalOpen(true)}
        onOpenOutboxModal={() => setIsOutboxModalOpen(true)}
        onOpenSosModal={() => setIsSosModalOpen(true)}
        onOpenMembersModal={() => setIsMembersModalOpen(true)}
        firebaseUser={firebaseUser}
        onFirebaseSignOut={handleFirebaseSignOut}
        outboxCount={outboxCount}
      />

      {pageError && <div role="alert" className="max-w-7xl mx-auto mt-4 p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 flex justify-between"><span>{pageError}</span><button onClick={() => setPageError('')} aria-label="Dismiss error">?</button></div>}
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
          onDeleteDose={handleDeleteDose}
          onOpenMedicationModal={() => {
            setMedicationToEdit(null);
            setIsMedicationModalOpen(true);
          }}
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
          onOpenMembersModal={() => setIsMembersModalOpen(true)}
          onDeleteMedication={handleDeleteMedication}
          onDeleteAppointment={handleDeleteAppointment}
          onDeleteDose={handleDeleteDose}
          onRefillMedication={handleRefillMedication}
          onRunSchedulerCheck={handleRunSchedulerCheck}
          schedulerLoading={schedulerLoading}
        />
      )}

      {/* Modals */}
      <PrescriptionScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onScheduleApplied={loadAllData}
        patientName={profile.elderName}
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
        onDeleteAppointment={handleDeleteAppointment}
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

      <ManageMembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        members={members}
        currentUserId={firebaseUser.uid}
        isOwner={profile.ownerUid === firebaseUser.uid}
        onUpdateMember={handleUpdateMember}
        circles={circles}
        activeCircleId={profile.id}
        onSelectCircle={async (profileId) => { await request('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId }) }); await loadAllData(); }}
        onAddMember={handleAddMember}
        onDeleteMember={handleDeleteMember}
        onSendTestEmail={handleSendTestEmail}
      />
    </div>
  );
}
