'use client';

import React, { useState } from 'react';
import { Camera, Sparkles, Check, AlertCircle, X, UploadCloud, Pill } from 'lucide-react';
import { PrescriptionScanResult } from '@/lib/services/gemini.service';

interface PrescriptionScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExtractedMedication: (medData: any) => void;
}

export const PrescriptionScannerModal: React.FC<PrescriptionScannerModalProps> = ({
  isOpen,
  onClose,
  onApplyExtractedMedication
}) => {
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<PrescriptionScanResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPreviewImage(base64);
      scanImage(base64, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const handleUseSamplePrescription = (sampleName: string) => {
    // Generate high-resolution representative prescription canvas
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 400);
      ctx.fillStyle = '#0369a1';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('ST. JUDE MEDICAL CLINIC - RX', 40, 50);
      ctx.fillStyle = '#334155';
      ctx.font = '16px Arial';
      ctx.fillText('Patient: Eleanor Vance | DOB: 1948-05-12', 40, 90);
      ctx.fillText(`Prescription Item: ${sampleName}`, 40, 140);
      ctx.fillText('Sig: Take 1 tablet daily with morning breakfast', 40, 180);
      ctx.fillText('Refills: 3 | Prescribed by: Dr. Evelyn Reed, MD', 40, 220);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 25, 540, 350);
    }
    const sampleBase64 = canvas.toDataURL('image/jpeg');
    setPreviewImage(sampleBase64);
    scanImage(sampleBase64, 'image/jpeg');
  };

  const scanImage = async (base64: string, mimeType: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/gemini/scan-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to scan image');
      }
      setExtractedData(data.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing prescription image');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!extractedData) return;
    onApplyExtractedMedication({
      name: extractedData.name,
      genericName: extractedData.genericName,
      dosage: extractedData.dosage,
      form: extractedData.form,
      color: '#0284c7',
      shape: 'Round tablet',
      instructions: extractedData.instructions,
      purpose: extractedData.purpose,
      foodRequirement: extractedData.foodRequirement,
      frequency: extractedData.frequency,
      scheduledTimes: extractedData.suggestedTimes || ['08:00'],
      active: true,
      pillCountCurrent: extractedData.refillCount || 30,
      pillCountRefillThreshold: 7,
      prescribedBy: extractedData.prescribedBy || 'Physician'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  AI Prescription & Pill Label Scanner
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300">
                  <Sparkles className="w-3 h-3 inline mr-1" /> Gemini 3.5 Flash
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Snap or upload a photo of a doctor prescription slip or medication packaging.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload & Sample Controls */}
        <div className="space-y-4">
          <label className="block border-2 border-dashed border-sky-300 dark:border-slate-700 rounded-2xl p-6 text-center cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-800/50 transition-colors">
            <UploadCloud className="w-10 h-10 text-sky-600 mx-auto mb-2" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 block">
              Click to upload photo of prescription slip or pill bottle
            </span>
            <span className="text-xs text-slate-400">PNG, JPG, or WEBP supported</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Quick 1-Click Samples for Evaluators */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Or test instant sample:</span>
            <button
              onClick={() => handleUseSamplePrescription('Amlodipine Besylate 5mg')}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border"
            >
              Rx: Amlodipine 5mg
            </button>
            <button
              onClick={() => handleUseSamplePrescription('Metformin ER 500mg')}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border"
            >
              Rx: Metformin 500mg
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="p-8 text-center space-y-3 bg-sky-50 dark:bg-sky-950/30 rounded-2xl border border-sky-200">
            <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-sky-900 dark:text-sky-200">
              Gemini 3.5 Flash is analyzing prescription handwriting, dosage, and sig directions...
            </p>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 text-rose-800 border border-rose-300 text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Extraction Results */}
        {extractedData && !loading && (
          <div className="space-y-4 bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Successfully Parsed by Gemini 3.5 Flash
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-900">
                {extractedData.form}
              </span>
            </div>

            <div>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                {extractedData.name} &bull; {extractedData.dosage}
              </h4>
              {extractedData.genericName && (
                <p className="text-xs text-slate-500 font-medium">Generic: {extractedData.genericName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border">
                <span className="font-bold text-slate-400 block">Frequency & Times</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {extractedData.frequency} at [{extractedData.suggestedTimes?.join(', ')}]
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border">
                <span className="font-bold text-slate-400 block">Food Requirement</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {extractedData.foodRequirement.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border text-xs">
              <span className="font-bold text-slate-400 block">Doctor Directions / Sig</span>
              <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                {extractedData.instructions}
              </p>
            </div>

            {extractedData.warnings && extractedData.warnings.length > 0 && (
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold block">Safety Precautions:</span>
                <ul className="list-disc pl-4 space-y-0.5">
                  {extractedData.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={handleApply}
              className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-black text-base shadow-lg flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>Add Directly to Eleanor&apos;s Active Medication Schedule</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
