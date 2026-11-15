'use client';

import React from 'react';
import {
  Heart,
  Eye,
  Volume2,
  VolumeX,
  Shield,
  KeyRound,
  Mail,
  UserCheck,
  Sparkles,
  PhoneCall,
  Users,
  LogOut
} from 'lucide-react';
import { Role, CareCircleProfile } from '@/lib/types';
import { User as FirebaseUser } from 'firebase/auth';

interface NavbarProps {
  viewMode: 'ELDER' | 'CAREGIVER';
  setViewMode: (mode: 'ELDER' | 'CAREGIVER') => void;
  currentRole: Role;
  profile: CareCircleProfile;
  fontScale: number;
  setFontScale: (scale: number | ((prev: number) => number)) => void;
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  onOpenPasscodeModal: () => void;
  onOpenOutboxModal: () => void;
  onOpenSosModal: () => void;
  onOpenMembersModal: () => void;
  firebaseUser?: FirebaseUser | null;
  onFirebaseSignOut?: () => void;
  outboxCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  setViewMode,
  currentRole,
  profile,
  fontScale,
  setFontScale,
  audioEnabled,
  setAudioEnabled,
  onOpenPasscodeModal,
  onOpenOutboxModal,
  onOpenSosModal,
  onOpenMembersModal,
  firebaseUser,
  onFirebaseSignOut,
  outboxCount
}) => {

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Heart className="w-7 h-7 fill-white" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  CuraCircle<span className="text-brand-600 dark:text-brand-400">.AI</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300">
                  <Sparkles className="w-3 h-3 text-sky-600 dark:text-sky-400" /> Gemini 3.5 Flash
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Elderly Care & Medication Management Platform
              </p>
            </div>
          </div>

          {/* Mode Switcher (Elder vs Caregiver) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('ELDER')}
              aria-pressed={viewMode === 'ELDER'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all min-h-touch ${
                viewMode === 'ELDER'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="text-lg">👴</span> Elder Mode (Kiosk)
            </button>
            <button
              onClick={() => setViewMode('CAREGIVER')}
              aria-pressed={viewMode === 'CAREGIVER'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all min-h-touch ${
                viewMode === 'CAREGIVER'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="text-lg">👨‍⚕️</span> Caregiver & Family
            </button>
          </div>

          {/* Accessibility & Action Bar */}
          <div className="flex items-center gap-2">
            {/* Font Scaler */}
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setFontScale((prev) => Math.max(0.9, prev - 0.1))}
                title="Decrease font size"
                aria-label="Decrease text size"
                className="px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
              >
                A-
              </button>
              <span className="px-2 text-xs font-semibold text-slate-500">
                {Math.round(fontScale * 100)}%
              </span>
              <button
                onClick={() => setFontScale((prev) => Math.min(1.5, prev + 0.1))}
                title="Increase font size"
                aria-label="Increase text size"
                className="px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
              >
                A+
              </button>
            </div>

            {/* Audio Voice Narration Toggle */}
            <button
              onClick={() => setAudioEnabled((prev) => !prev)}
              title={audioEnabled ? 'Voice narration active (Click to mute)' : 'Voice narration muted (Click to enable)'}
              aria-label="Toggle voice audio narration"
              className={`p-2.5 rounded-lg border transition-colors ${
                audioEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Proactive Email Outbox Trigger */}
            <button
              onClick={onOpenOutboxModal}
              title="View notifications and email outbox"
              aria-label="Open notifications and email delivery monitor"
              className="relative p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            >
              <Mail className="w-5 h-5" />
              {outboxCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand-600 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {outboxCount}
                </span>
              )}
            </button>

            {/* Emergency SOS Button */}
            <button
              onClick={onOpenSosModal}
              title="Emergency Care Circle SOS"
              aria-label="Trigger Emergency SOS notification to all family and caregivers"
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-black text-sm shadow-md transition-all animate-pulse"
            >
              <PhoneCall className="w-4 h-4" />
              <span>SOS</span>
            </button>

            {/* Manage Members & Emails Button */}
            <button
              onClick={onOpenMembersModal}
              title="Manage Care Circle Members & Notification Emails"
              aria-label="Manage Care Circle Members & Notification Emails"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-bold text-xs border border-slate-300 dark:border-slate-700 transition-colors"
            >
              <Users className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span className="hidden lg:inline">Members</span>
            </button>

            {/* Passcode / Role Badge */}
            <button
              onClick={onOpenPasscodeModal}
              title="View your assigned care circle role"
              aria-label={`Logged in as ${currentRole}. View care circle membership.`}
              className="flex items-center gap-2 pl-2.5 pr-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300 flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="hidden md:block">
                <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Your role</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                  {currentRole === 'ELDER' ? 'Patient' : currentRole.replace(/_/g, ' ').toLowerCase()}
                </p>
              </div>
            </button>

            {/* Firebase Logged In User & Sign Out */}
            {firebaseUser && onFirebaseSignOut && (
              <button
                onClick={onFirebaseSignOut}
                title={`Signed in as ${firebaseUser.email || 'Evaluator'}. Click to Sign Out.`}
                aria-label="Sign out of Firebase"
                className="p-2 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950 border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
