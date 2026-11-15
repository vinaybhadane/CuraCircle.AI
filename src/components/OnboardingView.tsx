'use client';
import React, { useState } from 'react';
import { Heart, Users, Check, LogOut } from 'lucide-react';

export function OnboardingView({ onComplete, onSignOut }: { onComplete: () => Promise<void>; onSignOut: () => void }) {
  const [role, setRole] = useState<'ELDER' | 'FAMILY_MEMBER'>('ELDER');
  const [memberName, setMemberName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [age, setAge] = useState('');
  const [condition, setCondition] = useState('');
  const [allergies, setAllergies] = useState('');
  const [family, setFamily] = useState([{ name: '', email: '', phone: '' }, { name: '', email: '', phone: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const field = 'w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm font-semibold';
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        role, memberName: role === 'ELDER' ? patientName : memberName, patientName, patientEmail: role === 'ELDER' ? '' : patientEmail,
        patientAge: Number(age), primaryCondition: condition, allergies: allergies.split(',').map((s) => s.trim()).filter(Boolean),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, familyMembers: family.map((m) => ({ ...m, role: 'FAMILY_MEMBER' })),
      }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save your care circle.');
      await onComplete();
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save your care circle.'); }
    finally { setSaving(false); }
  }
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
    <form onSubmit={submit} className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center"><Heart /></div>
          <div><h1 className="text-xl font-black">Add at least two family members</h1><p className="text-xs text-slate-500">Set up your care circle, then upload a prescription for Gemini to build your schedule.</p></div></div>
        <button type="button" onClick={onSignOut} aria-label="Sign out" className="p-2 text-slate-500"><LogOut size={18} /></button>
      </div>
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-sm">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="text-xs font-bold space-y-1">Your role<select className={field} value={role} onChange={(e) => setRole(e.target.value as typeof role)}><option value="ELDER">Patient</option><option value="FAMILY_MEMBER">Family member</option></select></label>
        {role === 'FAMILY_MEMBER' && <label className="text-xs font-bold space-y-1">Your full name<input className={field} required maxLength={100} value={memberName} onChange={(e) => setMemberName(e.target.value)} /></label>}
        <label className="text-xs font-bold space-y-1">Patient full name<input className={field} required minLength={2} maxLength={100} value={patientName} onChange={(e) => setPatientName(e.target.value)} /></label>
        <label className="text-xs font-bold space-y-1">Patient age<input className={field} required type="number" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)} /></label>
        {role === 'FAMILY_MEMBER' && <label className="text-xs font-bold space-y-1">Patient Google email<input className={field} required type="email" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} /></label>}
        <label className="text-xs font-bold space-y-1">Medical conditions (optional)<input className={field} maxLength={500} value={condition} onChange={(e) => setCondition(e.target.value)} /></label>
        <label className="text-xs font-bold space-y-1">Allergies, separated by commas (optional)<input className={field} value={allergies} onChange={(e) => setAllergies(e.target.value)} /></label>
      </div>
      <p className="text-xs text-slate-500">Each person needs a different Google email. Family members can sign in with that email to view notifications and add or modify this patient’s schedule.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{family.map((member, index) => <fieldset key={index} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-800 space-y-3">
        <legend className="text-sm font-black px-1"><Users className="w-4 h-4 inline mr-1" />Family member {index + 1}</legend>
        {(['name', 'email', 'phone'] as const).map((key) => <label key={key} className="block text-xs font-bold space-y-1">{key === 'name' ? 'Full name' : key === 'email' ? 'Google email' : 'Phone (optional)'}<input className={field} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} required={key !== 'phone'} value={member[key]} onChange={(e) => setFamily((previous) => previous.map((m, i) => i === index ? { ...m, [key]: e.target.value } : m))} /></label>)}
      </fieldset>)}</div>
      <button disabled={saving} className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-black flex items-center justify-center gap-2 disabled:opacity-60"><Check size={20} />{saving ? 'Saving care circle…' : 'Save & upload prescription'}</button>
    </form>
  </div>;
}
