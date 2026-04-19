import { useEffect, useRef, useState } from 'react';
import apiClient from './api/client';
import { useDeskReactionFlow } from './hooks/useDeskReactionFlow';
import { FALLBACK_DESKS, normalizeDesks } from './data/fallbackDesks';
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
  const [deskData,      setDeskData]      = useState([]);
  const [hasDeskReactionData, setHasDeskReactionData] = useState(true);
  const [periodicOpen,  setPeriodicOpen]  = useState(false);
  const [hintVisible,   setHintVisible]   = useState(false);
  const reactionFlow = useDeskReactionFlow({
    activeBenchId: activeBench?.id ?? null,
    engineRef,
    desks: deskData,
    hasDeskReactionData
  });

  // ── Engine init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    async function initEngine() {
      let desks = FALLBACK_DESKS;
      let benchDefinitions = buildBenchDefinitions(FALLBACK_DESKS);

      try {
        const response = await apiClient.get('/api/desks');
        desks = normalizeDesks(response.data?.desks ?? []);
        benchDefinitions = buildBenchDefinitions(desks);
      } catch (error) {
        console.error('Unable to load desk data from the server, using bundled desk fallback.', error);
      }

      if (disposed) return;

      setDeskData(desks);
      setHasDeskReactionData(desks.length > 0);

      if (!canvasRef.current) return;

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

  const selectedChemicalNames = reactionFlow.selectedChemicals
    .map(id => reactionFlow.chemicalMap.get(id)?.name)
    .filter(Boolean);
  const selectedApparatusNames = reactionFlow.selectedApparatus
    .map(id => reactionFlow.apparatusMap.get(id)?.name)
    .filter(Boolean);

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

          <div style={{
            position: 'absolute',
            right: UI_EDGE,
            top: 'max(84px, calc(env(safe-area-inset-top) + 84px))',
            width: 'min(26rem, calc(100vw - 40px))',
            pointerEvents: 'auto',
            background: 'rgba(11, 16, 24, 0.82)',
            border: '1px solid rgba(0, 212, 255, 0.28)',
            boxShadow: '0 0 28px rgba(0, 212, 255, 0.12)',
            padding: '16px 18px',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#dff7ff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Reaction Flow
            </div>
            <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: '0.74rem', color: '#aeefff', lineHeight: 1.6 }}>
              <div>1. Click 2 chemicals on the rack.</div>
              <div>2. Select the highlighted apparatus.</div>
              <div>3. Watch the reaction and review the result.</div>
            </div>

            <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: '0.72rem', color: '#f2f7fb', lineHeight: 1.6 }}>
              <div>Chemicals: {selectedChemicalNames.length ? selectedChemicalNames.join(' + ') : 'None selected'}</div>
              <div>Apparatus: {selectedApparatusNames.length ? selectedApparatusNames.join(', ') : 'None selected'}</div>
              <div>Reaction: {reactionFlow.pendingReaction?.name ?? 'Waiting for valid pair'}</div>
            </div>

            {reactionFlow.message && (
              <div style={{
                marginTop: 14,
                padding: '10px 12px',
                border: `1px solid ${reactionFlow.message.type === 'warning' ? 'rgba(255, 140, 0, 0.55)' : reactionFlow.message.type === 'success' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(0, 212, 255, 0.35)'}`,
                background: reactionFlow.message.type === 'warning'
                  ? 'rgba(255, 140, 0, 0.08)'
                  : reactionFlow.message.type === 'success'
                    ? 'rgba(34, 197, 94, 0.08)'
                    : 'rgba(0, 212, 255, 0.08)',
                color: '#f4fbff',
                fontFamily: 'monospace',
                fontSize: '0.72rem',
                lineHeight: 1.5,
              }}>
                {reactionFlow.message.text}
              </div>
            )}
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

      {reactionFlow.resultModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            background: 'rgba(8, 12, 18, 0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div style={{
            width: 'min(38rem, 100%)',
            background: 'linear-gradient(180deg, rgba(18, 25, 36, 0.98) 0%, rgba(11, 16, 24, 0.98) 100%)',
            border: '1px solid rgba(0, 212, 255, 0.28)',
            boxShadow: '0 0 40px rgba(0, 212, 255, 0.16)',
            padding: '22px 22px 18px 22px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#9aefff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Reaction Result</div>
                <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: '1rem', color: '#f4fbff', letterSpacing: '0.04em' }}>
                  {reactionFlow.resultModal.name}
                </div>
                <div style={{ marginTop: 4, fontFamily: 'monospace', fontSize: '0.78rem', color: '#ffd89a' }}>
                  {reactionFlow.resultModal.formula}
                </div>
              </div>

              <button
                onClick={reactionFlow.closeResultModal}
                style={{
                  background: 'rgba(255,140,0,0.12)',
                  border: '1px solid #FF8C00',
                  color: '#FF8C00',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  letterSpacing: '0.08em',
                  padding: '8px 14px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>

            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {reactionFlow.resultModal.properties.map(property => (
                <div key={property.label} style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  padding: '10px 12px'
                }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#8fb7c8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {property.label}
                  </div>
                  <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: '0.82rem', color: '#f4fbff' }}>
                    {property.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, fontFamily: 'monospace', fontSize: '0.76rem', color: '#d9eef7', lineHeight: 1.7 }}>
              {reactionFlow.resultModal.observation}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chevronBounce {
          0%,100% { transform:translateY(0);   opacity:0.55; }
          50%      { transform:translateY(4px); opacity:1;    }
        }
      `}</style>
    </>
  );
}
