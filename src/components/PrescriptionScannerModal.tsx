'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Camera, Sparkles, Check, AlertCircle, X, UploadCloud, Download } from 'lucide-react';
import type { PrescriptionResult } from '@/lib/services/prescription.service';

interface PrescriptionScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleApplied: () => Promise<void>;
  patientName: string;
}
export function PrescriptionScannerModal({ isOpen, onClose, onScheduleApplied, patientName }: PrescriptionScannerModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractedData, setExtractedData] = useState<PrescriptionResult | null>(null);
  const [draftId, setDraftId] = useState('');
  const [error, setError] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!isOpen) { controller.current?.abort(); setLoading(false); setExtractedData(null); setDraftId(''); setError(''); setReviewed(false); }
    return () => controller.current?.abort();
  }, [isOpen]);
  if (!isOpen) return null;

  async function scan(file: File | Blob) {
    if (!['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(file.type)) { setError('Upload a PNG, JPG, WEBP or PDF prescription.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('The prescription must be smaller than 5 MB.'); return; }
    controller.current?.abort();
    const current = new AbortController(); controller.current = current;
    setLoading(true); setError(''); setExtractedData(null); setDraftId(''); setReviewed(false);
    try {
      const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      const response = await fetch('/api/gemini/scan-prescription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: current.signal, body: JSON.stringify({ imageBase64: base64, mimeType: file.type }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gemini could not read this prescription.');
      setExtractedData(data.data); setDraftId(data.draftId);
    } catch (error) { if (!current.signal.aborted) setError(error instanceof Error ? error.message : 'Could not read the prescription.'); }
    finally { if (!current.signal.aborted) setLoading(false); }
  }
  async function useSample() {
    try { const response = await fetch('/demo-prescription.png'); if (!response.ok) throw new Error('Sample download failed.'); await scan(await response.blob()); }
    catch { setError('The sample could not be loaded. Try downloading and uploading it.'); }
  }
  async function apply() {
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/prescriptions/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ draftId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The schedule could not be saved.');
      await onScheduleApplied(); onClose();
    } catch (error) { setError(error instanceof Error ? error.message : 'The schedule could not be saved.'); }
    finally { setSaving(false); }
  }
  return <div role="dialog" aria-modal="true" aria-labelledby="scanner-title" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center"><Camera className="w-6 h-6" /></div><div>
          <h3 id="scanner-title" className="text-xl font-black text-slate-900 dark:text-white">AI Prescription &amp; Pill Label Scanner</h3>
          <p className="text-xs text-slate-500"><Sparkles className="w-3 h-3 inline mr-1" />Gemini reads every medicine and creates a schedule for {patientName}.</p>
        </div></div>
        <button disabled={saving} onClick={onClose} aria-label="Close prescription scanner" className="p-2 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
      </div>
      <div className="space-y-4">
        <label className="block border-2 border-dashed border-sky-300 dark:border-slate-700 rounded-2xl p-6 text-center cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-800/50 transition-colors">
          <UploadCloud className="w-10 h-10 text-sky-600 mx-auto mb-2" /><span className="text-sm font-bold text-slate-700 dark:text-slate-300 block">Click to upload photo of prescription slip or pill bottle</span>
          <span className="text-xs text-slate-400">PNG, JPG, WEBP or PDF · Maximum 5 MB</span>
          <input aria-label="Upload prescription" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" disabled={loading || saving} onChange={(e) => { const file = e.target.files?.[0]; if (file) void scan(file); e.target.value = ''; }} className="hidden" />
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-bold text-slate-500">Try the demo prescription:</span>
          <a href="/demo-prescription.png" download className="px-2.5 py-1 font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border"><Download className="w-3 h-3 inline mr-1" />Download sample</a>
          <button disabled={loading || saving} onClick={useSample} className="px-2.5 py-1 font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border">Scan sample with Gemini</button>
        </div>
      </div>
      {loading && <div role="status" className="p-8 text-center space-y-3 bg-sky-50 dark:bg-sky-950/30 rounded-2xl border border-sky-200"><div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-sm font-bold text-sky-900">Gemini is reading the prescription and generating dose times…</p></div>}
      {error && <p role="alert" className="p-4 rounded-2xl bg-rose-50 text-rose-900 border-2 border-rose-300 text-sm font-semibold"><AlertCircle className="w-4 h-4 inline mr-2" />{error}</p>}
      {extractedData && !loading && <div className="space-y-4 bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700"><Check className="w-4 h-4 inline mr-1" />Schedule generated by Gemini</p>
        {extractedData.medications.map((medication, index) => <div key={index} className="bg-white dark:bg-slate-900 p-3 rounded-xl border space-y-2">
          <h4 className="text-lg font-black">{medication.name} · {medication.dosage}</h4>
          <p className="text-sm font-bold">{medication.frequency.replace(/_/g, ' ')} · {medication.scheduledTimes.join(', ')}</p>
          <p className="text-xs">{medication.instructions}</p><p className="text-xs text-slate-500">Starts {medication.startDate}{medication.endDate ? ` · Ends ${medication.endDate}` : ''}</p>
        </div>)}
        {extractedData.warnings.length > 0 && <ul className="bg-amber-50 p-3 pl-7 rounded-xl border border-amber-200 text-xs text-amber-900 list-disc">{extractedData.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
        <label className="flex items-start gap-2 text-xs font-semibold"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />I checked each medicine, dose and time against the prescription. Demo prescriptions are for testing only.</label>
        <button disabled={!reviewed || saving} onClick={apply} className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-black text-base shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"><Check className="w-5 h-5" />{saving ? 'Saving & notifying family…' : 'Save schedule & notify family'}</button>
      </div>}
    </div>
  </div>;
}
