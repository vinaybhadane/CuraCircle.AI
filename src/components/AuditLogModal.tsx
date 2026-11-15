'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Shield, X, RefreshCw, Clock } from 'lucide-react';
import { AuditLog } from '@/lib/types';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  elderName: string;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose, elderName }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Immutable Security & Compliance Audit Log
              </h3>
              <p className="text-xs text-slate-500">
                Audited timeline of authentication, prescription modifications, and dose tracking for {elderName}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              title="Refresh logs"
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Logs Stream */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No audit logs recorded yet.</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-brand-600 dark:text-brand-400 uppercase tracking-wide">
                    {log.action}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  {log.details}
                </p>
                <div className="flex items-center gap-2 text-slate-500 pt-1">
                  <span>Actor: <strong>{log.actorName}</strong> ({log.actorRole})</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm rounded-xl"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};
