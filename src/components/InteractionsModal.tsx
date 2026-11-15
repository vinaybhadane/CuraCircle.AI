'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Info, Sparkles, X, RefreshCw } from 'lucide-react';
import { DrugInteractionResult, SeverityLevel } from '@/lib/types';

interface InteractionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  elderName: string;
}

export const InteractionsModal: React.FC<InteractionsModalProps> = ({ isOpen, onClose, elderName }) => {
  const [loading, setLoading] = useState(false);
  const [interactions, setInteractions] = useState<DrugInteractionResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadInteractions();
    }
  }, [isOpen]);

  const loadInteractions = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/gemini/interactions');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch interactions');
      setInteractions(data.interactions || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error checking interactions');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'SEVERE':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> CRITICAL DANGER
          </span>
        );
      case 'MODERATE':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> MODERATE RISK
          </span>
        );
      case 'MILD':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" /> MILD / MONITOR
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> COMPATIBLE
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Clinical Drug-Drug & Food Safety Center
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                  <Sparkles className="w-3 h-3 inline mr-1" /> Gemini 3.5 Flash
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Cross-analyzing all active prescriptions, dietary conflicts, and contraindications for {elderName}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadInteractions}
              title="Re-run analysis"
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Gemini 3.5 Flash is reviewing pharmacokinetics, CYP3A4 metabolism, and food interactions...
            </p>
          </div>
        ) : errorMsg ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-2 border-rose-300 dark:border-rose-800 text-sm font-semibold flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {interactions.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    {item.medicationA} <span className="text-slate-400 font-normal">&times;</span> {item.medicationB}
                  </h4>
                  {getSeverityBadge(item.severity)}
                </div>

                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {item.description}
                </p>

                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                  <p className="text-slate-500">
                    <strong className="text-slate-700 dark:text-slate-300">Mechanism:</strong> {item.mechanism}
                  </p>
                  <p className="text-slate-800 dark:text-slate-200">
                    <strong className="text-emerald-700 dark:text-emerald-400">Caregiver Action:</strong> {item.caregiverGuidance}
                  </p>
                </div>

                {item.foodWarnings && item.foodWarnings.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
                    <strong>⚠️ Dietary Conflict:</strong> {item.foodWarnings.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-sm rounded-xl"
          >
            Close Safety Report
          </button>
        </div>
      </div>
    </div>
  );
};
