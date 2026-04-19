import { useState, useEffect, useRef } from 'react';
import { labState } from '../lab/LabState';
import apiClient from '../api/client';

// ── Credit-efficient ARIA voice lines ─────────────────────────────────────────
// All under 55 chars — ~150 chars per full experiment session
export const BENCH_LINES = {
  'Acid-Base':        'Acids meet bases. The pH dance begins.',
  'Combustion':       'Fire chemistry. Respect every flame.',
  'Synthesis':        'Two elements. One compound. Choose wisely.',
  'Electrochemistry': 'Electrons at work. Invisible power.',
};

export const RUN_LINES = {
  extreme: 'Step back. This one gets violent.',
  high:    'Hazardous pair. Proceed with caution.',
  moderate:'Running reaction. Watch closely.',
  safe:    'Clean pair. Running now.',
};

export const RESULT_LINES = {
  found:    'Reaction confirmed. Study the result.',
  notFound: 'No reaction. These two do not mix.',
};

// ── ARIA Lab Assistant ────────────────────────────────────────────────────────
export default function LabAssistant() {
  const [speaking,  setSpeaking]  = useState(false);
  const [muted,     setMuted]     = useState(false);
  const [subtitle,  setSubtitle]  = useState('');

  const audioRef       = useRef(null);
  const subtitleTimer  = useRef(null);
  const mutedRef       = useRef(false);
  const speakRef       = useRef(null);

  // Keep mutedRef in sync so speak() always reads latest value without re-registering listeners
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // Stop audio when muted
  useEffect(() => {
    if (muted) {
      audioRef.current?.pause();
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, [muted]);

  function scheduleHideSubtitle() {
    clearTimeout(subtitleTimer.current);
    subtitleTimer.current = setTimeout(() => setSubtitle(''), 2200);
  }

  function fallbackSpeak(text) {
    if (mutedRef.current) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.88; u.pitch = 1.08;
    window.speechSynthesis.cancel();
    setSpeaking(true);
    u.onend  = () => { setSpeaking(false); scheduleHideSubtitle(); };
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  async function speak(text) {
    if (mutedRef.current || !text) return;

    clearTimeout(subtitleTimer.current);
    setSubtitle(text);
    setSpeaking(true);

    try {
      const res = await apiClient.post('/api/narrate', { text }, { responseType: 'blob' });

      // Server told us to fall back (no key configured)
      if (res.data?.fallback) { fallbackSpeak(text); return; }

      const url = URL.createObjectURL(res.data);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeaking(false); scheduleHideSubtitle(); };
      audio.onerror = () => { setSpeaking(false); fallbackSpeak(text); };
      await audio.play();
    } catch {
      // Network error or server down → Web Speech fallback
      fallbackSpeak(text);
    }
  }

  // Expose speak via ref so the effect closure is always fresh
  speakRef.current = speak;

  // Register labState listener once — uses speakRef to stay current
  useEffect(() => {
    const off = labState.on('aria:speak', ({ text }) => speakRef.current?.(text));
    return () => { off(); clearTimeout(subtitleTimer.current); audioRef.current?.pause(); };
  }, []);

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 35,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
      pointerEvents: 'none',
    }}>

      {/* ── Subtitle strip ── */}
      <div style={{
        maxWidth: 230, textAlign: 'center',
        fontFamily: 'monospace', fontSize: '0.67rem', letterSpacing: '0.04em',
        color: '#72f3ff', lineHeight: 1.55,
        background: 'rgba(5,8,20,0.82)',
        border: '1px solid rgba(0,212,255,0.22)',
        borderRadius: 5,
        padding: subtitle ? '6px 11px' : '0 11px',
        maxHeight: subtitle ? 70 : 0,
        opacity: subtitle ? 1 : 0,
        overflow: 'hidden',
        transition: 'opacity 0.35s ease, max-height 0.35s ease, padding 0.35s ease',
        boxShadow: subtitle ? '0 0 16px rgba(0,212,255,0.1)' : 'none',
      }}>
        {subtitle}
      </div>

      {/* ── Waveform bars ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 3.5, height: 22,
        opacity: speaking ? 1 : 0.28,
        transition: 'opacity 0.3s',
      }}>
        {[0.38, 0.65, 1.0, 0.65, 0.38].map((h, i) => (
          <div key={i} style={{
            width: 3, borderRadius: 2,
            background: speaking ? '#00D4FF' : 'rgba(0,212,255,0.5)',
            height: speaking ? `${Math.round(h * 20)}px` : '3px',
            animation: speaking ? `ariaWave 0.55s ease-in-out ${i * 0.09}s infinite alternate` : 'none',
            transition: 'height 0.18s, background 0.25s',
            boxShadow: speaking ? '0 0 6px rgba(0,212,255,0.7)' : 'none',
          }} />
        ))}
      </div>

      {/* ── Orb ── */}
      <div
        title={muted ? 'Click to unmute ARIA' : 'Click to mute ARIA'}
        onClick={() => setMuted(m => !m)}
        style={{
          pointerEvents: 'auto',
          width: 72, height: 72, borderRadius: '50%',
          cursor: 'pointer', position: 'relative',
          background: 'radial-gradient(circle at 38% 32%, rgba(0,212,255,0.38), rgba(100,0,255,0.2), rgba(255,0,180,0.1), transparent)',
          border: `1px solid rgba(0,212,255,${speaking ? 0.85 : 0.42})`,
          boxShadow: speaking
            ? '0 0 32px rgba(0,212,255,0.65), 0 0 70px rgba(0,212,255,0.22), inset 0 0 22px rgba(0,212,255,0.18)'
            : '0 0 14px rgba(0,212,255,0.22), inset 0 0 10px rgba(0,212,255,0.07)',
          animation: speaking ? 'orbSpeak 0.65s ease-in-out infinite alternate' : 'orbIdle 3.5s ease-in-out infinite',
          transition: 'border-color 0.3s, box-shadow 0.3s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* Outer orbital ring — cyan, slow */}
        <svg width={90} height={90} viewBox="0 0 90 90"
          style={{ position: 'absolute', top: -9, left: -9, animation: 'ringA 5s linear infinite', pointerEvents: 'none' }}>
          <circle cx="45" cy="45" r="41"
            stroke="rgba(0,212,255,0.55)" strokeWidth="1"
            strokeDasharray="62 200" fill="none" />
        </svg>

        {/* Inner orbital ring — purple, faster + reverse */}
        <svg width={90} height={90} viewBox="0 0 90 90"
          style={{ position: 'absolute', top: -9, left: -9, animation: 'ringB 8s linear infinite reverse', pointerEvents: 'none' }}>
          <circle cx="45" cy="45" r="35"
            stroke="rgba(170,0,255,0.35)" strokeWidth="0.8"
            strokeDasharray="32 188" fill="none" />
        </svg>

        {/* Magenta accent arc */}
        <svg width={90} height={90} viewBox="0 0 90 90"
          style={{ position: 'absolute', top: -9, left: -9, animation: 'ringA 12s linear infinite', pointerEvents: 'none' }}>
          <circle cx="45" cy="45" r="38"
            stroke="rgba(255,0,200,0.22)" strokeWidth="0.8"
            strokeDasharray="20 220" fill="none" />
        </svg>

        {/* Inner glowing core */}
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(0,212,255,0.7) 60%, transparent 100%)',
          boxShadow: speaking
            ? '0 0 18px rgba(0,212,255,0.9), 0 0 32px rgba(0,212,255,0.4)'
            : '0 0 10px rgba(0,212,255,0.6)',
          animation: speaking ? 'coreSpeak 0.45s ease-in-out infinite alternate' : 'coreIdle 2.5s ease-in-out infinite',
          transition: 'box-shadow 0.3s',
        }} />

        {/* Mute overlay */}
        {muted && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', backdropFilter: 'blur(2px)',
          }}>
            🔇
          </div>
        )}
      </div>

      {/* ── Label ── */}
      <div style={{
        fontFamily: 'monospace', fontSize: '0.58rem', letterSpacing: '0.24em',
        color: muted ? 'rgba(255,255,255,0.2)' : 'rgba(0,212,255,0.65)',
        textTransform: 'uppercase', transition: 'color 0.3s',
        userSelect: 'none',
      }}>
        {muted ? 'MUTED' : 'ARIA'}
      </div>

      <style>{`
        @keyframes orbIdle {
          0%,100% { box-shadow: 0 0 14px rgba(0,212,255,0.22), inset 0 0 10px rgba(0,212,255,0.07); }
          50%      { box-shadow: 0 0 24px rgba(0,212,255,0.38), inset 0 0 16px rgba(0,212,255,0.12); }
        }
        @keyframes orbSpeak {
          from { box-shadow: 0 0 28px rgba(0,212,255,0.6),  0 0 60px rgba(0,212,255,0.2),  inset 0 0 20px rgba(0,212,255,0.16); }
          to   { box-shadow: 0 0 44px rgba(0,212,255,0.82), 0 0 90px rgba(0,212,255,0.32), inset 0 0 30px rgba(0,212,255,0.24); }
        }
        @keyframes ringA {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ringB {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes coreIdle {
          0%,100% { transform: scale(1);    opacity: 0.85; }
          50%      { transform: scale(1.18); opacity: 1; }
        }
        @keyframes coreSpeak {
          from { transform: scale(0.88); }
          to   { transform: scale(1.32); }
        }
        @keyframes ariaWave {
          from { transform: scaleY(0.55); }
          to   { transform: scaleY(1.45); }
        }
      `}</style>
    </div>
  );
}
