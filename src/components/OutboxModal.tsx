'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Clock, AlertTriangle, Calendar, PhoneCall, RefreshCw, X, Check, Eye } from 'lucide-react';
import { DispatchedEmail } from '@/lib/types';

interface OutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunSchedulerCheck: () => void;
  schedulerLoading: boolean;
}

export const OutboxModal: React.FC<OutboxModalProps> = ({
  isOpen,
  onClose,
  onRunSchedulerCheck,
  schedulerLoading
}) => {
  const [emails, setEmails] = useState<DispatchedEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<DispatchedEmail | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadEmails();
    }
  }, [isOpen]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/outbox');
      const data = await res.json();
      setEmails(data.emails || []);
      if (data.emails && data.emails.length > 0 && !selectedEmail) {
        setSelectedEmail(data.emails[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getTriggerBadge = (type: DispatchedEmail['triggerType']) => {
    switch (type) {
      case 'MISSED_DOSE_ESCALATION':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300">
            🚨 Missed Dose Escalation
          </span>
        );
      case 'UPCOMING_DOSE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-sky-100 text-sky-800 border border-sky-300">
            ⏰ Upcoming Dose
          </span>
        );
      case 'APPOINTMENT_REMINDER':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-300">
            📅 Doctor Visit Reminder
          </span>
        );
      case 'EMERGENCY_SOS':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-700 text-white animate-pulse">
            🚨 Emergency SOS
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800">
            📦 Refill Needed
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Proactive Notification & Outbox Inspector
              </h3>
              <p className="text-xs text-slate-500">
                Live stream of automated alerts dispatched to elderly, caretakers, and family members.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRunSchedulerCheck}
              disabled={schedulerLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${schedulerLoading ? 'animate-spin' : ''}`} />
              <span>{schedulerLoading ? 'Evaluating...' : 'Trigger Scheduler Now'}</span>
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Two-Pane Outbox Inspector */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-h-[65vh]">
          {/* Left: Email List (2 cols) */}
          <div className="md:col-span-2 space-y-2 overflow-y-auto pr-1">
            {emails.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No emails dispatched yet.</p>
            ) : (
              emails.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEmail(e)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all space-y-1.5 ${
                    selectedEmail?.id === e.id
                      ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-950/30'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {getTriggerBadge(e.triggerType)}
                    <span className="text-[11px] text-slate-400">
                      {new Date(e.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {e.subject}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    To: <strong>{e.toName}</strong> ({e.to})
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Right: Email HTML Preview (3 cols) */}
          <div className="md:col-span-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 overflow-y-auto space-y-4">
            {selectedEmail ? (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Status: <span className="text-emerald-600 font-black">{selectedEmail.status}</span>
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(selectedEmail.sentAt).toLocaleString()}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    {selectedEmail.subject}
                  </h4>
                  <p className="text-xs text-slate-600">
                    <strong>Recipient:</strong> {selectedEmail.toName} &lt;{selectedEmail.to}&gt;
                  </p>
                </div>

                {/* Rendered HTML Body */}
                <div
                  className="bg-white p-5 rounded-xl border shadow-inner text-slate-800 text-sm overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }}
                />
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                Select an email from the left to inspect its live rendered contents.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
