'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, X, Heart, Shield, Send, CheckCircle2 } from 'lucide-react';
import { CompanionCheckInResult } from '@/lib/services/gemini.service';

interface VoiceCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  elderName: string;
  audioEnabled: boolean;
}

export const VoiceCompanionModal: React.FC<VoiceCompanionModalProps> = ({
  isOpen,
  onClose,
  elderName,
  audioEnabled
}) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'model'; text: string; data?: CompanionCheckInResult }>>([
    {
      role: 'model',
      text: `Hello ${elderName}! I am Amity, your personal health companion. How are you feeling right now? Did you have breakfast and take your morning medicine?`
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        handleSend(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [elderName]);

  if (!isOpen) return null;

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not natively supported in this browser. You can type your message below!');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const speakText = (text: string) => {
    if (!audioEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || inputText;
    if (!textToSend.trim() || loading) return;

    const newHistory = [...messages, { role: 'user' as const, text: textToSend }];
    setMessages(newHistory);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          elderName,
          history: newHistory.slice(-4)
        })
      });
      const data = await res.json();
      if (data.data) {
        const result: CompanionCheckInResult = data.data;
        setMessages((prev) => [...prev, { role: 'model', text: result.replyText, data: result }]);
        speakText(result.replyText);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-md">
              <Heart className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Amity — Senior Voice Health Companion
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <Sparkles className="w-3 h-3 inline mr-1" /> Gemini 3.5 Flash
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Empathetic daily check-in, symptoms triage, and cognitive wellness support.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversation Stream */}
        <div className="h-80 overflow-y-auto space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}>
              <div
                className={`max-w-[85%] p-4 rounded-2xl text-base font-medium shadow-sm ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-bl-none'
                }`}
              >
                {m.text}
              </div>

              {/* Structured Clinical Insights on Model Reply */}
              {m.data && (
                <div className="max-w-[85%] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3 text-xs text-emerald-950 dark:text-emerald-200 space-y-1">
                  <p>
                    <strong>Emotional Tone:</strong> {m.data.emotionalState} &bull; <strong>Urgency:</strong> {m.data.urgencyLevel}
                  </p>
                  {m.data.symptomsReported.length > 0 && (
                    <p className="text-rose-700 dark:text-rose-400 font-bold">
                      Reported Symptoms: {m.data.symptomsReported.join(', ')}
                    </p>
                  )}
                  <p className="text-slate-600 dark:text-slate-400 italic">
                    Caregiver Note: &ldquo;{m.data.caregiverNote}&rdquo;
                  </p>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold italic p-2">
              <Sparkles className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Amity is listening and preparing a gentle answer...</span>
            </div>
          )}
        </div>

        {/* Voice and Text Controls */}
        <div className="space-y-3">
          {/* Quick Voice Prompt Shortcuts */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Quick Prompts:</span>
            <button
              onClick={() => handleSend('I took my morning pills and feel great today!')}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200"
            >
              &ldquo;I took my pills&rdquo;
            </button>
            <button
              onClick={() => handleSend('I feel a bit lightheaded and my knees are aching.')}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-800 border border-amber-200"
            >
              &ldquo;Feeling a bit dizzy&rdquo;
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-3"
          >
            {/* Big Mic Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-4 rounded-2xl flex items-center justify-center transition-all min-h-[56px] min-w-[56px] ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
              }`}
              title={isListening ? 'Listening... click to stop' : 'Click to speak using your microphone'}
            >
              {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Speak with the mic or type here..."
              className="flex-1 px-4 py-3.5 rounded-2xl border bg-slate-50 dark:bg-slate-800 text-base font-semibold"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="px-6 py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm min-h-[56px]"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
