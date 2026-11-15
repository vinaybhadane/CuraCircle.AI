'use client';

import React, { useState } from 'react';
import {
  Pencil,
  Users,
  Plus,
  Mail,
  Trash2,
  Check,
  Send,
  X,
  Shield,
  Sparkles,
  Phone,
  Cloud,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { CareCircleMember, Role } from '@/lib/types';

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: CareCircleMember[];
  currentUserId: string;
  onAddMember: (memberData: any) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
  onSendTestEmail: (to: string, toName: string) => Promise<string>;
  onUpdateMember: (id: string, updates: any) => Promise<void>;
  isOwner: boolean;
  circles: { id: string; name: string }[];
  activeCircleId: string;
  onSelectCircle: (id: string) => Promise<void>;
}

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({
  isOpen,
  onClose,
  members,
  currentUserId,
  onAddMember,
  onDeleteMember,
  onSendTestEmail, onUpdateMember, isOwner, circles, activeCircleId, onSelectCircle
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('FAMILY_MEMBER');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [receiveMissedAlerts, setReceiveMissedAlerts] = useState(true);
  const [receiveUpcomingAlerts, setReceiveUpcomingAlerts] = useState(true);

  const [saving, setSaving] = useState(false);
  const [syncingFirestore, setSyncingFirestore] = useState(false);
  const [testSentEmail, setTestSentEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setErrorMsg('Name and email are required');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const saveMember = editingId ? (data: any) => onUpdateMember(editingId, data) : onAddMember;
      await saveMember({
        name: name.trim(),
        role,
        email: email.trim(),
        phone: phone.trim(),
        permissions: {
          canEditMeds: true,
          canLogAdherence: true,
          canManageAppointments: role === 'PRIMARY_CAREGIVER' || role === 'FAMILY_MEMBER',
          receiveMissedAlerts,
          receiveUpcomingAlerts
        }
      });


      setEditingId(null);
      setName('');
      setEmail('');
      setPhone('');
      setSuccessMsg(`Saved ${name} (${email}). Email delivery status is available in the notification outbox.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncFirestore = async () => {
    setSyncingFirestore(true);
    try {
      await onSelectCircle(activeCircleId);
      setSuccessMsg('Care circle members refreshed from the server.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to refresh members');
    } finally {
      setSyncingFirestore(false);
    }
  };

  const handleTestEmail = async (memberEmail: string, memberName: string) => {
    setTestSentEmail(memberEmail);
    try {
      const status = await onSendTestEmail(memberEmail, memberName);
      setSuccessMsg(status === 'SENT' ? `Email accepted by the provider for ${memberEmail}.` : status === 'SIMULATED' ? 'Email preview saved. Configure Brevo or SMTP to send real emails.' : 'Email delivery failed. Check provider settings and the outbox.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Email request failed.');
    } finally {
      setTimeout(() => setTestSentEmail(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Care Circle Members & Email Notification Dispatcher
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <Cloud className="w-3 h-3 inline mr-1" /> Google + Email
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Add manually family members and caregivers. All missed doses, upcoming doses, and appointments will be sent to these emails!
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {circles.length > 1 && <label className="block text-xs font-bold">Patient care circle<select value={activeCircleId} onChange={(e) => onSelectCircle(e.target.value).catch((err) => setErrorMsg(err.message))} className="ml-2 px-3 py-2 rounded-xl border">{circles.map((circle) => <option key={circle.id} value={circle.id}>{circle.name}</option>)}</select></label>}
        {/* Status Alerts */}
        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-2 border-rose-300 dark:border-rose-800 text-xs font-semibold flex items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              aria-label="Dismiss alert"
              className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {successMsg && (
          <div
            role="status"
            className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-2 border-emerald-300 dark:border-emerald-800 text-xs font-semibold flex items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              aria-label="Dismiss alert"
              className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Existing Members List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Registered Members ({members.length})
            </h4>
            <button
              onClick={handleSyncFirestore}
              disabled={syncingFirestore}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{syncingFirestore ? 'Refreshing…' : 'Refresh members'}</span>
            </button>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{m.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-brand-100 text-brand-900 dark:bg-brand-950 dark:text-brand-300">
                      {m.role === 'ELDER' ? 'Patient' : m.role.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> {m.email}
                  </p>
                  {m.phone && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {m.phone}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestEmail(m.email, m.name)}
                    disabled={testSentEmail === m.email}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 text-xs font-bold flex items-center gap-1"
                    title="Send a test alert to this member"
                  >
                    <Send className="w-3 h-3" />
                    <span>{testSentEmail === m.email ? 'Checking?' : 'Test email'}</span>
                  </button>

                  {isOwner && m.role !== 'ELDER' && m.firebaseUid !== currentUserId && <>
                  <button title="Edit member and role" onClick={() => { setEditingId(m.id); setName(m.name); setEmail(m.email); setPhone(m.phone || ''); setRole(m.role); setReceiveMissedAlerts(m.permissions.receiveMissedAlerts); setReceiveUpcomingAlerts(m.permissions.receiveUpcomingAlerts); }} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg"><Pencil className="w-4 h-4" /></button>
                  <button
                    onClick={() => onDeleteMember(m.id).catch((err) => setErrorMsg(err.message))}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button></>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Member Form */}
        {isOwner && <form onSubmit={handleSubmit} className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
          <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-brand-600" />
            <span>{editingId ? 'Edit member & role' : 'Add member & configure notification email'}</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Member Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Care Circle Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
              >
                <option value="FAMILY_MEMBER">Family Member / Guardian</option>
                <option value="PRIMARY_CAREGIVER">Primary Caregiver / Visiting Nurse</option>
                <option value="CLINICIAN">Doctor / Healthcare Clinician</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address for Reminders & Escalations *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="family@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number (optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Alert Toggles */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border text-xs space-y-2">
            <span className="font-bold text-slate-700 dark:text-slate-300 block">Notification Preferences:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={receiveMissedAlerts}
                  onChange={(e) => setReceiveMissedAlerts(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Receive Missed Dose Escalations (&gt;30m)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={receiveUpcomingAlerts}
                  onChange={(e) => setReceiveUpcomingAlerts(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Receive Upcoming Dose & Appointment Reminders
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-sm"
            >
              Done
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-sm shadow-md flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Saving?' : 'Save member'}</span>
            </button>
          </div>
        </form>}
      </div>
    </div>
  );
};
