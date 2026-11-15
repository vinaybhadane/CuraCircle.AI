'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Clock, AlertTriangle, Calendar, PhoneCall, RefreshCw, X, Check, Eye } from 'lucide-react';
import { DispatchedEmail, CareNotification } from '@/lib/types';

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
  const [notifications, setNotifications] = useState<CareNotification[]>([]);
  const [tab, setTab] = useState<'notifications' | 'outbox'>('notifications');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadEmails();
    }
  }, [isOpen, schedulerLoading]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/outbox');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load email outbox.');
      setEmails(data.emails || []);
      const notificationResponse = await fetch('/api/notifications');
      const notificationData = await notificationResponse.json();
      if (!notificationResponse.ok) throw new Error(notificationData.error || 'Could not load notifications.');
      setNotifications(notificationData.notifications || []);
      if (data.emails && data.emails.length > 0 && !selectedEmail) {
        setSelectedEmail(data.emails[0]);
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not load notifications.');
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
      case 'SCHEDULE_UPDATED':
      case 'MEMBER_INVITED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-sky-100 text-sky-800 border border-sky-300">{type === 'SCHEDULE_UPDATED' ? 'Schedule update' : 'Care circle invitation'}</span>;
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

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <button className={`px-3 py-2 rounded-xl border ${tab === 'notifications' ? 'bg-brand-600 text-white' : 'bg-slate-100'}`} onClick={() => setTab('notifications')}>My notifications ({notifications.filter((n) => !n.readAt).length})</button>
          <button className={`px-3 py-2 rounded-xl border ${tab === 'outbox' ? 'bg-brand-600 text-white' : 'bg-slate-100'}`} onClick={() => setTab('outbox')}>Email outbox</button>
          <button className="px-3 py-2 rounded-xl border" onClick={loadEmails}>{loading ? 'Refreshing…' : 'Refresh'}</button>
          <button className="px-3 py-2 rounded-xl border" onClick={async () => {
            if (!('Notification' in window)) { setNotice('This browser does not support desktop notifications. Your in-app notifications are available here.'); return; }
            const permission = await Notification.requestPermission();
            setNotice(permission === 'granted' ? 'Browser notifications enabled while CuraCircle is open. Email reminders continue when the reminder scheduler is running.' : 'Browser notifications are blocked. Your in-app notifications and emails remain available.');
          }}>Enable browser notifications</button>
          <button className="px-3 py-2 rounded-xl border" onClick={async () => {
            const response = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' });
            if (!response.ok) { setNotice('Could not mark notifications as read.'); return; }
            await loadEmails();
          }}>Mark all read</button>
        </div>
        {notice && <p role="status" className="text-xs text-slate-600">{notice}</p>}
        {tab === 'notifications' && <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {notifications.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No notifications yet. Care circle invitations, schedule changes and dose alerts appear here.</p>}
          {notifications.map((notification) => <article key={notification.id} className={`p-4 rounded-2xl border ${notification.readAt ? 'bg-slate-50 border-slate-200' : 'bg-sky-50 border-sky-200'}`}>
            <h4 className="text-sm font-bold">{notification.title}</h4><p className="text-xs text-slate-600 mt-1">{notification.message}</p><time className="text-xs text-slate-400">{new Date(notification.createdAt).toLocaleString()}</time>
          </article>)}
        </div>}
        {/* Two-Pane Outbox Inspector */}
        {tab === 'outbox' &&
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
                <iframe title="Email preview" sandbox="" className="w-full min-h-[320px] bg-white rounded-xl border shadow-inner" srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">${selectedEmail.htmlBody}`} />
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                Select an email from the left to inspect its live rendered contents.
              </div>
            )}
          </div>
        </div>}
      </div>
    </div>
  );
};
