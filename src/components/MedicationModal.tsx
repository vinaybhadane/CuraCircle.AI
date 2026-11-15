'use client';

import React, { useState, useEffect } from 'react';
import { Pill, X, Check, Clock, AlertCircle } from 'lucide-react';
import { Medication, MedicationForm, FoodRequirement, MedicationFrequency } from '@/lib/types';

interface MedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicationToEdit?: Medication | null;
  onSave: (medData: any) => Promise<void>;
}

export const MedicationModal: React.FC<MedicationModalProps> = ({
  isOpen,
  onClose,
  medicationToEdit,
  onSave
}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState<MedicationForm>('TABLET');
  const [color, setColor] = useState('#0284c7');
  const [shape, setShape] = useState('Round tablet');
  const [instructions, setInstructions] = useState('');
  const [purpose, setPurpose] = useState('');
  const [foodRequirement, setFoodRequirement] = useState<FoodRequirement>('NO_RESTRICTION');
  const [frequency, setFrequency] = useState<MedicationFrequency>('DAILY');
  const [scheduledTimes, setScheduledTimes] = useState<string[]>(['08:00']);
  const [pillCount, setPillCount] = useState<number | string>('');
  const [refillThreshold, setRefillThreshold] = useState<number | string>('');
  const [prescribedBy, setPrescribedBy] = useState('');

  useEffect(() => {
    setError('');
    if (medicationToEdit) {
      setName(medicationToEdit.name);
      setDosage(medicationToEdit.dosage);
      setForm(medicationToEdit.form);
      setColor(medicationToEdit.color);
      setShape(medicationToEdit.shape);
      setInstructions(medicationToEdit.instructions);
      setPurpose(medicationToEdit.purpose);
      setFoodRequirement(medicationToEdit.foodRequirement);
      setFrequency(medicationToEdit.frequency);
      setScheduledTimes(medicationToEdit.scheduledTimes);
      setPillCount(medicationToEdit.pillCountCurrent);
      setRefillThreshold(medicationToEdit.pillCountRefillThreshold);
      setPrescribedBy(medicationToEdit.prescribedBy);
    } else {
      setName('');
      setDosage('');
      setForm('TABLET');
      setColor('#0284c7');
      setShape('Round tablet');
      setInstructions('');
      setPurpose('');
      setFoodRequirement('NO_RESTRICTION');
      setFrequency('DAILY');
      setScheduledTimes(['08:00']);
      setPillCount('');
      setRefillThreshold('');
      setPrescribedBy('');
    }
  }, [medicationToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddTime = () => {
    setScheduledTimes((prev) => [...prev, '12:00']);
  };

  const handleRemoveTime = (index: number) => {
    setScheduledTimes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTimeChange = (index: number, val: string) => {
    setScheduledTimes((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try { await onSave({
      ...(medicationToEdit ? { id: medicationToEdit.id } : {}),
      name,
      dosage,
      form,
      color,
      shape,
      instructions,
      purpose,
      foodRequirement,
      frequency,
      scheduledTimes,
      pillCountCurrent: Number(pillCount),
      pillCountRefillThreshold: Number(refillThreshold),
      prescribedBy,
      active: true
    });
    onClose();
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save the medication.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {medicationToEdit ? 'Edit Prescription Schedule' : 'Add New Prescription'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure medication schedule, food directions, and supply refill threshold.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</p>}
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Medication Brand Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lisinopril, Metformin"
                className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Dosage Strength *
              </label>
              <input
                type="text"
                required
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 10 mg, 500 mg, 2 puffs"
                className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Form
              </label>
              <select
                value={form}
                onChange={(e) => setForm(e.target.value as MedicationForm)}
                className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
              >
                <option value="TABLET">Tablet</option>
                <option value="CAPSULE">Capsule</option>
                <option value="LIQUID">Liquid Solution</option>
                <option value="INHALER">Inhaler</option>
                <option value="INJECTION">Injection</option>
                <option value="PATCH">Transdermal Patch</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as MedicationFrequency)}
                className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
              >
                <option value="DAILY">Once Daily</option>
                <option value="TWICE_DAILY">Twice Daily</option>
                <option value="THREE_TIMES_DAILY">3 Times Daily</option>
                <option value="FOUR_TIMES_DAILY">4 Times Daily</option>
                <option value="AS_NEEDED">As Needed (PRN)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Food Requirement
              </label>
              <select
                value={foodRequirement}
                onChange={(e) => setFoodRequirement(e.target.value as FoodRequirement)}
                className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
              >
                <option value="NO_RESTRICTION">No Restriction</option>
                <option value="WITH_FOOD">With Food / Meals</option>
                <option value="BEFORE_MEAL">Before Meals</option>
                <option value="AFTER_MEAL">After Meals</option>
                <option value="EMPTY_STOMACH">Empty Stomach</option>
              </select>
            </div>
          </div>

          {/* Scheduled Times Picker */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Scheduled Daily Times (24h format) *
              </label>
              <button
                type="button"
                onClick={handleAddTime}
                className="text-xs font-bold text-brand-600 hover:underline"
              >
                + Add Another Time
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {scheduledTimes.map((time, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border">
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => handleTimeChange(idx, e.target.value)}
                    className="bg-transparent text-sm font-bold px-2 py-1"
                  />
                  {scheduledTimes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTime(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Instructions for Elder *
            </label>
            <input
              type="text"
              required
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Take 1 tablet with full glass of water after breakfast"
              className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Clinical Purpose *
            </label>
            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Blood pressure regulation and cardiovascular protection"
              className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Current Pill Count
              </label>
              <input
                type="number"
                min="0"
                value={pillCount}
                onChange={(e) => setPillCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Refill Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                value={refillThreshold}
                onChange={(e) => setRefillThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Prescribing Physician
              </label>
              <input
                type="text"
                value={prescribedBy}
                onChange={(e) => setPrescribedBy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-sm"
            >
              {saving ? 'Saving?' : medicationToEdit ? 'Save Changes' : 'Add Medication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
