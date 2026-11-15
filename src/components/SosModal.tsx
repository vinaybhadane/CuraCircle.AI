'use client';

import React, { useState, useEffect } from 'react';
import { PhoneCall, AlertTriangle, X, ShieldAlert, Phone, CheckCircle } from 'lucide-react';
import { CareCircleProfile } from '@/lib/types';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CareCircleProfile;
}

export const SosModal: React.FC<SosModalProps> = ({ isOpen, onClose, profile }) => {
  const [countdown, setCountdown] = useState(3);
  const [triggered, setTriggered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dispatchedCount, setDispatchedCount] = useState<number | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && !triggered && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    } else if (isOpen && !triggered && countdown === 0) {
      triggerSosAlert();
    }
    return () => clearTimeout(timer);
  }, [isOpen, countdown, triggered]);

  const playSiren = () => {
    if (typeof window === 'undefined' || !('AudioContext' in window || 'webkitAudioContext' in window)) return;
    try {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.warn('Audio siren playback:', e);
    }
  };

  const triggerSosAlert = async () => {
    setTriggered(true);
    setLoading(true);
    playSiren();

    try {
      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profile.id,
          reason: 'Emergency SOS button triggered from platform kiosk'
        })
      });
      const data = await res.json();
      setDispatchedCount(data.alertDispatchedCount || 3);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-rose-950 text-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border-4 border-rose-500 space-y-6 text-center">
        {!triggered ? (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-rose-600 rounded-full flex items-center justify-center mx-auto text-4xl font-black animate-ping">
              {countdown}
            </div>
            <h3 className="text-3xl font-black text-white">
              Broadcasting Emergency Alert in {countdown}...
            </h3>
            <p className="text-sm text-rose-200">
              Press Cancel immediately if this was pressed by mistake.
            </p>
            <button
              onClick={() => {
                setCountdown(3);
                onClose();
              }}
              className="w-full py-4 bg-white text-rose-900 rounded-2xl font-black text-lg shadow-lg"
            >
              CANCEL (FALSE ALARM)
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="w-16 h-16 bg-rose-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <ShieldAlert className="w-10 h-10 text-white" />
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 bg-rose-500/30 text-rose-200 rounded-full text-xs font-black uppercase tracking-wider border border-rose-400">
                🚨 CARE CIRCLE ALERT DISPATCHED
              </span>
              <h3 className="text-3xl font-black text-white mt-2">
                Emergency Notifications Sent!
              </h3>
              <p className="text-sm text-rose-200">
                Immediate email notifications and phone alerts have been dispatched to all {dispatchedCount || 3} registered family guardians and nurses.
              </p>
            </div>

            <div className="bg-rose-900/60 p-4 rounded-2xl border border-rose-700 text-left space-y-2 text-sm">
              <p className="font-bold text-rose-100">Primary Emergency Contact:</p>
              <p className="text-base font-black text-white">
                {profile.emergencyContact.name} ({profile.emergencyContact.relationship})
              </p>
              <a
                href={`tel:${profile.emergencyContact.phone}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm"
              >
                <Phone className="w-4 h-4" /> Call {profile.emergencyContact.phone}
              </a>
            </div>

            <button
              onClick={() => {
                setTriggered(false);
                setCountdown(3);
                onClose();
              }}
              className="w-full py-3 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl font-bold text-sm border border-rose-800"
            >
              Dismiss Alert Screen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
