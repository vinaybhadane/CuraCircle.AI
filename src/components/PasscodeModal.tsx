'use client';

import React, { useState } from 'react';
import { KeyRound, Shield, X, AlertCircle, CheckCircle, Delete } from 'lucide-react';
import { Role } from '@/lib/types';

interface PasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  onSuccess: (role: Role, memberName: string) => void;
}

export const PasscodeModal: React.FC<PasscodeModalProps> = ({
  isOpen,
  onClose,
  profileId,
  onSuccess
}) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 8) {
      setPin((prev) => prev + num);
      setErrorMsg(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleVerify = async (pinToVerify?: string) => {
    const finalPin = pinToVerify || pin;
    if (finalPin.length < 4) {
      setErrorMsg('PIN must be at least 4 digits');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, passcode: finalPin })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid passcode');
      }

      onSuccess(data.role, data.member?.name || 'Member');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Passcode verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoPin = (demoPin: string) => {
    setPin(demoPin);
    handleVerify(demoPin);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Care Circle Passcode
              </h3>
              <p className="text-xs text-slate-500">
                Secure PIN access protecting elder health records.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Demo Quick PINs for Hackathon Judges */}
        <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl border text-xs space-y-2">
          <span className="font-bold text-slate-500 block">Judge Quick Access:</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickDemoPin('1122')}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border text-center font-bold hover:border-brand-500"
            >
              <span className="block text-slate-400 text-[10px]">Elder</span>
              <span className="text-brand-600 font-mono text-sm">1122</span>
            </button>
            <button
              onClick={() => handleQuickDemoPin('4321')}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border text-center font-bold hover:border-brand-500"
            >
              <span className="block text-slate-400 text-[10px]">Caregiver</span>
              <span className="text-brand-600 font-mono text-sm">4321</span>
            </button>
            <button
              onClick={() => handleQuickDemoPin('5678')}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border text-center font-bold hover:border-brand-500"
            >
              <span className="block text-slate-400 text-[10px]">Family</span>
              <span className="text-brand-600 font-mono text-sm">5678</span>
            </button>
          </div>
        </div>

        {/* PIN Display */}
        <div className="text-center py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          <div className="text-3xl font-mono tracking-widest font-black text-slate-900 dark:text-white">
            {pin ? pin.split('').map(() => '•').join(' ') : 'ENTER PIN'}
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 border-2 border-rose-300 dark:border-rose-800 text-xs font-bold flex items-center justify-between gap-2 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="py-4 text-2xl font-black rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-colors"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleBackspace}
            className="py-4 text-sm font-bold rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
          >
            <Delete className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-4 text-2xl font-black rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 text-slate-900 dark:text-white"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleVerify()}
            disabled={pin.length < 4 || loading}
            className="py-4 font-black rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white flex items-center justify-center"
          >
            {loading ? '...' : <CheckCircle className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
};
