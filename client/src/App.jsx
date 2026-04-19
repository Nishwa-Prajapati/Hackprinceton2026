import { useEffect, useRef, useState } from 'react';
import apiClient from './api/client';
import { LabEngine } from './lab/LabEngine';
import { buildBenchDefinitions } from './lab/benchDefinitions';
import { labState } from './lab/LabState';
import EntryScreen from './components/EntryScreen';
import periodicTablePopup from './assets/periodic-table-popup.png';

const UI_EDGE = 'max(20px, env(safe-area-inset-left), env(safe-area-inset-right))';
const UI_TOP = 'max(20px, env(safe-area-inset-top))';
const UI_BOTTOM = 'max(20px, env(safe-area-inset-bottom))';

export default function App() {
  const canvasRef  = useRef(null);
  const engineRef  = useRef(null);
  const tooltipRef = useRef(null);

  const [phase,         setPhase]         = useState('entry');
  const [activeBench,   setActiveBench]   = useState(null);
  const [periodicOpen,  setPeriodicOpen]  = useState(false);
  const [hintVisible,   setHintVisible]   = useState(false);

  // ── Engine init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    async function initEngine() {
      let benchDefinitions;

      try {
        const response = await apiClient.get('/api/desks');
        benchDefinitions = buildBenchDefinitions(response.data?.desks ?? []);
      } catch (error) {
        console.error('Unable to load desk data, using fallback bench definitions.', error);
      }

      if (disposed || !canvasRef.current) return;

      const engine = new LabEngine({ benchDefinitions });
      engineRef.current = engine;
      engine.init(canvasRef.current);
      engine.setTooltipEl(tooltipRef.current);

      const offBenchFocus = labState.on('bench:focused', ({ id, name }) => {
        setActiveBench({ id, name });
        setPhase('focused');
      });
      const offBenchExit = labState.on('bench:exited', () => {
        setActiveBench(null);
        setPhase('roaming');
      });
      const offPeriodicOpen = labState.on('periodic:opened', () => {
        setPeriodicOpen(true);
        engine.setUiLocked(true);
      });
      const offPeriodicClose = labState.on('periodic:closed', () => {
        setPeriodicOpen(false);
        engine.setUiLocked(false);
      });

      cleanup = () => {
        offBenchFocus();
        offBenchExit();
        offPeriodicOpen();
        offPeriodicClose();
        engine.dispose();
      };
    }

    initEngine();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handle = (e) => {
      if (e.key === 'Escape' && periodicOpen) {
        labState.emit('periodic:closed', {});
        return;
      }
      if (e.key === 'Escape' || (e.key === 'Enter' && phase === 'focused')) {
        if (phase === 'focused') engineRef.current?.exitBench();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [phase, periodicOpen]);

  // ── After gate opens: fly camera in ─────────────────────────────────────────
  function handleGateOpened() {
    setPhase('roaming');
    setHintVisible(true);
    engineRef.current?.flyIn(() => setTimeout(() => setHintVisible(false), 4000));
  }

  return (
    <>
      {/* Three.js canvas */}
      <canvas ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'block' }}
      />

      {/* Gate entry screen */}
      {phase === 'entry' && <EntryScreen onEntered={handleGateOpened} />}

      {/* Bench focus overlay */}
      {phase === 'focused' && activeBench && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
          <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 100px rgba(0,0,0,0.75)' }} />

          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            padding: `${UI_TOP} ${UI_EDGE} 0 ${UI_EDGE}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
          }}>
            <button onClick={() => engineRef.current?.exitBench()} style={{
              pointerEvents: 'auto',
              background: 'rgba(255,140,0,0.12)', border: '1px solid #FF8C00',
              color: '#FF8C00', fontFamily: 'monospace', fontSize: '0.82rem',
              letterSpacing: '0.08em', padding: '9px 20px', cursor: 'pointer',
              borderRadius: '2px', textShadow: '0 0 10px #FF8C0088',
              boxShadow: '0 0 12px rgba(255,140,0,0.2)',
            }}>
              ← Back to Lab
            </button>

            <div style={{
              fontFamily: 'monospace', fontSize: '1.0rem', letterSpacing: '0.14em',
              color: '#72f3ff', textShadow: '0 0 16px rgba(114,243,255,0.7)', textTransform: 'uppercase',
            }}>
              {activeBench.name} Bench
            </div>

            <div style={{ minWidth: 130 }} />
          </div>

          <div style={{
            position: 'absolute', bottom: UI_BOTTOM, left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'monospace', fontSize: '0.68rem', color: '#ffffff44', letterSpacing: '0.1em',
            padding: '0 16px',
            textAlign: 'center',
          }}>
            Press Enter or ESC to exit
          </div>

          {['top:0;left:0','top:0;right:0','bottom:0;left:0','bottom:0;right:0'].map((pos, i) => {
            const s = Object.fromEntries(pos.split(';').map(p => p.split(':')));
            const r = ['0deg','90deg','270deg','180deg'];
            return (
              <svg key={i} width="40" height="40" viewBox="0 0 40 40"
                style={{ position:'absolute',...s, opacity:0.5, transform:`rotate(${r[i]})`, pointerEvents:'none' }}>
                <path d="M2 38 L2 2 L38 2" fill="none" stroke="#FF8C00" strokeWidth="1.5" />
              </svg>
            );
          })}
        </div>
      )}

      {periodicOpen && (
        <div
          onWheel={e => e.preventDefault()}
          style={{ position: 'fixed', inset: 0, zIndex: 25, background: 'rgba(10, 14, 20, 0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'min(5vw, 40px)' }}
        >
          <div style={{
            width: 'min(94vw, 1240px)',
            maxWidth: '94vw',
            maxHeight: '90vh',
            background: 'linear-gradient(180deg, rgba(23, 28, 38, 0.96) 0%, rgba(13, 17, 26, 0.96) 100%)',
            border: '1px solid rgba(0,212,255,0.32)',
            boxShadow: '0 0 40px rgba(0,212,255,0.12), 0 18px 80px rgba(0,0,0,0.45)',
            padding: '20px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '0.14em', color: '#dff7ff', textTransform: 'uppercase' }}>Periodic Table</div>
              <button
                onClick={() => labState.emit('periodic:closed', {})}
                style={{ background: 'rgba(255,140,0,0.12)', border: '1px solid #FF8C00', color: '#FF8C00', fontFamily: 'monospace', fontSize: '0.8rem', letterSpacing: '0.08em', padding: '8px 18px', cursor: 'pointer' }}
              >
                ← Back to Lab
              </button>
            </div>
            <img
              src={periodicTablePopup}
              alt="Periodic table expanded view"
              style={{
                display: 'block',
                width: '100%',
                maxWidth: '100%',
                maxHeight: 'calc(90vh - 98px)',
                height: 'auto',
                objectFit: 'contain',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 0 36px rgba(255, 98, 213, 0.08)',
              }}
            />
          </div>
        </div>
      )}

      {/* Scroll hint */}
      <div style={{
        position: 'fixed', bottom: UI_BOTTOM, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        pointerEvents: 'none', zIndex: 5,
        opacity: hintVisible ? 1 : 0,
        transition: 'opacity 1.2s ease',
        padding: '0 16px',
        textAlign: 'center',
        maxWidth: 'min(92vw, 40rem)',
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#00D4FF', letterSpacing: '0.12em', textShadow: '0 0 12px #00D4FF88' }}>
          Drag to look around • W A S D or arrow keys to move • Scroll to glide forward or back
        </span>
        {[0,1,2].map(i => (
          <svg key={i} width="18" height="10" viewBox="0 0 18 10" fill="none"
            style={{ opacity: 0.5 + i * 0.2, animation: `chevronBounce 1.4s ease-in-out ${i*0.18}s infinite` }}>
            <polyline points="1,1 9,9 17,1" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ))}
      </div>

      {/* Item tooltip */}
      <div ref={tooltipRef} style={{
        position: 'fixed', top: 0, left: 0,
        fontFamily: 'monospace', fontSize: '0.72rem',
        color: '#00D4FF', letterSpacing: '0.06em',
        background: 'rgba(13,13,26,0.92)', border: '1px solid #00D4FF44',
        padding: '5px 11px',
        pointerEvents: 'none', zIndex: 30,
        visibility: 'hidden', opacity: 0, transition: 'opacity 0.12s',
        whiteSpace: 'nowrap', maxWidth: 'min(80vw, 20rem)', overflow: 'hidden', textOverflow: 'ellipsis',
      }} />

      <style>{`
        @keyframes chevronBounce {
          0%,100% { transform:translateY(0);   opacity:0.55; }
          50%      { transform:translateY(4px); opacity:1;    }
        }
      `}</style>
    </>
  );
}
