'use client';

import React, { useState } from 'react';
import { Calendar, Plus, Sparkles, X, Clock, MapPin, User, Check, Phone, Trash2 } from 'lucide-react';
import { DoctorAppointment, CareCircleMember } from '@/lib/types';

interface AppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: DoctorAppointment[];
  members: CareCircleMember[];
  onAddAppointment: (appointmentData: any) => void;
  onDeleteAppointment: (id: string) => void;
}

export const AppointmentsModal: React.FC<AppointmentsModalProps> = ({
  isOpen,
  onClose,
  appointments,
  members,
  onAddAppointment,
  onDeleteAppointment
}) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'NEW'>('LIST');
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('Cardiovascular Medicine');
  const [clinicName, setClinicName] = useState('');
  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [reason, setReason] = useState('');
  const [accompaniedMemberId, setAccompaniedMemberId] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  if (!isOpen) return null;

  const handleGenerateQuestions = async () => {
    if (!specialty && !reason) return;
    setLoadingAi(true);
    try {
      const res = await fetch('/api/gemini/appointment-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorSpecialty: specialty, reasonForVisit: reason })
      });
      const data = await res.json();
      if (data.questions) {
        setAiQuestions(data.questions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const escortMember = members.find((m) => m.id === accompaniedMemberId);

    onAddAppointment({
      doctorName,
      specialty,
      clinicName,
      address,
      contactPhone,
      appointmentDateTime: new Date(dateTime).toISOString(),
      reasonForVisit: reason,
      accompaniedByMemberId: accompaniedMemberId,
      accompaniedByName: escortMember ? `${escortMember.name} (${escortMember.role.replace('_', ' ').toLowerCase()})` : undefined,
      status: 'UPCOMING',
      preVisitQuestions: aiQuestions,
      doctorNotes
    });

    setActiveTab('LIST');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Doctor Appointments & Escort Management
              </h3>
              <p className="text-xs text-slate-500">
                Track clinical consultations, assign family escorts, and prepare AI pre-visit questions.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('LIST')}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition-colors ${
              activeTab === 'LIST'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300'
            }`}
          >
            Scheduled Appointments ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('NEW')}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition-colors ${
              activeTab === 'NEW'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300'
            }`}
          >
            + Schedule New Consultation
          </button>
        </div>

        {/* List View */}
        {activeTab === 'LIST' ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">
                      {apt.doctorName}
                    </h4>
                    <p className="text-xs font-bold text-purple-700 dark:text-purple-400">
                      {apt.specialty} &bull; {apt.clinicName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-300">
                      {new Date(apt.appointmentDateTime).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteAppointment(apt.id)}
                      title="Cancel and remove appointment"
                      className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300">
                  <strong>Reason:</strong> {apt.reasonForVisit}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {apt.address}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                    <User className="w-3.5 h-3.5 text-purple-600" /> Escort: {apt.accompaniedByName || 'None assigned'}
                  </span>
                  {apt.contactPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {apt.contactPhone}
                    </span>
                  )}
                </div>

                {apt.preVisitQuestions && apt.preVisitQuestions.length > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-xl border border-purple-200 dark:border-purple-900 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                    <strong className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> AI Consultation Questions Prepared:
                    </strong>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {apt.preVisitQuestions.map((q, idx) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* New Appointment Form */
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Doctor Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Robert Santos, MD"
                  className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Medical Specialty *
                </label>
                <input
                  type="text"
                  required
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. Cardiology, Endocrinology"
                  className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Clinic / Hospital Name *
                </label>
                <input
                  type="text"
                  required
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="e.g. St. Jude Heart Institute"
                  className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Clinic Address *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="742 Evergreen Terrace, Suite 300"
                className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Designated Family Escort / Driver
                </label>
                <select
                  value={accompaniedMemberId}
                  onChange={(e) => setAccompaniedMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
                >
                  <option value="">Select escort...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role.replace('_', ' ').toLowerCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Clinic Contact Phone
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Visit *
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. 6-Month blood pressure follow-up and ECG check"
                className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
              />
            </div>

            {/* AI Question Prep Generator */}
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-black text-purple-900 dark:text-purple-200">
                    Gemini 3.5 Flash Doctor Prep Assistant
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateQuestions}
                  disabled={loadingAi}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold"
                >
                  {loadingAi ? 'Generating...' : 'Generate Clinical Questions'}
                </button>
              </div>

              {aiQuestions.length > 0 && (
                <ul className="text-xs text-purple-950 dark:text-purple-200 list-disc pl-4 space-y-1">
                  {aiQuestions.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setActiveTab('LIST')}
                className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm"
              >
                Schedule Appointment
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
