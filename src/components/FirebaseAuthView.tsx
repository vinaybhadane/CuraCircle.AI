'use client';

import React, { useState } from 'react';
import {
  Heart,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Zap,
  CheckCircle2,
  Lock,
  X,
  ExternalLink
} from 'lucide-react';
import {
  auth,
  googleProvider
} from '@/lib/firebase/config';
import {
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';

interface FirebaseAuthViewProps {
  onAuthSuccess: (user: FirebaseUser) => void;
}

export const FirebaseAuthView: React.FC<FirebaseAuthViewProps> = ({ onAuthSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string>('Google Sign-In Notice');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      onAuthSuccess(res.user);
    } catch (err: any) {
      console.warn('Firebase Google Auth error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorTitle('Popup Closed');
        setErrorMsg('The Google sign-in window was closed before completing authentication. Please click the button to try again.');
      } else if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        setErrorTitle('Firebase Google Auth Not Enabled');
        setErrorMsg('Google Sign-In is not currently enabled in the Firebase Console (Authentication > Sign-in method > Google). Enable it in your Firebase dashboard, then retry.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorTitle('Browser Popup Blocked');
        setErrorMsg('The browser blocked the Google sign-in popup. Please allow popups for this website and retry.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setErrorTitle('Unauthorized Domain');
        setErrorMsg('This domain (localhost) is not yet listed under Firebase Console > Authentication > Settings > Authorized domains. Add this website?s domain to Firebase Authorized domains, then retry.');
      } else {
        setErrorTitle('Authentication Error');
        setErrorMsg(err.message || 'Google sign-in encountered an unexpected issue.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-brand-500/30">
            <Heart className="w-9 h-9 fill-white" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                CuraCircle<span className="text-brand-600 dark:text-brand-400">.AI</span>
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300">
                <Sparkles className="w-3 h-3 text-sky-600" /> Firebase Auth
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Smart Elderly Care &amp; Medication Management Platform
            </p>
          </div>
        </div>

        {/* Informational Welcome Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center space-y-1.5">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Secure Healthcare Profile Access
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Sign in with Google to set up your patient profile, add family members, and create a prescription schedule with Gemini.
          </p>
        </div>

        {/* Enhanced High-Visibility Alert Box */}
        {errorMsg && (
          <div
            role="alert"
            aria-live="polite"
            className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 dark:border-amber-600 shadow-md space-y-2.5"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-200/80 dark:bg-amber-900 text-amber-800 dark:text-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    {errorTitle}
                  </h4>
                  <button
                    onClick={() => setErrorMsg(null)}
                    aria-label="Dismiss alert"
                    className="p-1 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-200/60 dark:hover:bg-amber-900/60 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-amber-950 dark:text-amber-100 font-medium leading-relaxed mt-1">
                  {errorMsg}
                </p>
              </div>
            </div>

          </div>
        )}

        {/* Direct Google Sign-In Action */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-white font-bold text-base border-2 border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 shadow-md flex items-center justify-center gap-3 transition-all duration-150 active:scale-98 disabled:opacity-60"
            aria-label="Sign in directly with Google"
          >
            {/* Google G Logo SVG */}
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Connecting to Google...' : 'Sign In with Google'}</span>
          </button>

        </div>

        {/* Security & Privacy Badges */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Firebase Auth
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-sky-600" /> Google Sign-In
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" /> Accessible care
            </span>
          </div>
          <p className="text-[10px] text-center text-slate-400">
            Care activity is recorded in your circle&apos;s audit history.
          </p>
        </div>
      </div>
    </div>
  );
};
