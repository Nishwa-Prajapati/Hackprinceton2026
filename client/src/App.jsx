import { useEffect, useRef, useState } from 'react';
import { LabEngine } from './lab/LabEngine';

export default function App() {
  const canvasRef  = useRef(null);
  const engineRef  = useRef(null);
  const [loaded, setLoaded]     = useState(false);
  const [hintVisible, setHint]  = useState(true);   // "Scroll to explore" hint

  useEffect(() => {
    const engine = new LabEngine();
    engineRef.current = engine;
    engine.init(canvasRef.current);
    setLoaded(true);

    // Fade hint out after 4 s
    const timer = setTimeout(() => setHint(false), 4000);
    return () => { clearTimeout(timer); engine.dispose(); };
  }, []);

  return (
    <>
      {/* Three.js canvas ─ full-screen, behind everything */}
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'block' }}
      />

      {/* Loading overlay */}
      {!loaded && (
        <div style={{
          position: 'fixed', inset: 0,
          background: '#0d0d1a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 12, zIndex: 10,
        }}>
          <h1 style={{ fontFamily: 'monospace', fontSize: '3rem', color: '#FF8C00', letterSpacing: '0.2em' }}>
            LabZero
          </h1>
          <p style={{ fontFamily: 'monospace', color: '#00D4FF', fontSize: '0.9rem' }}>
            Initialising lab...
          </p>
        </div>
      )}

      {/* "Scroll to explore" hint ─ fades out after 4 s */}
      <div style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        pointerEvents: 'none',
        zIndex: 5,
        opacity: hintVisible ? 1 : 0,
        transition: 'opacity 1.2s ease',
      }}>
        <span style={{
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          color: '#00D4FF',
          letterSpacing: '0.12em',
          textShadow: '0 0 12px #00D4FF88',
        }}>
          Scroll to explore
        </span>
        {/* Animated chevrons */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {[0, 1, 2].map(i => (
            <svg key={i} width="18" height="10" viewBox="0 0 18 10" fill="none"
              style={{ opacity: 0.5 + i * 0.2, animation: `chevronBounce 1.4s ease-in-out ${i * 0.18}s infinite` }}>
              <polyline points="1,1 9,9 17,1" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ))}
        </div>
      </div>

      {/* Chevron keyframe ─ injected once */}
      <style>{`
        @keyframes chevronBounce {
          0%, 100% { transform: translateY(0);   opacity: 0.55; }
          50%       { transform: translateY(4px); opacity: 1;    }
        }
      `}</style>
    </>
  );
}
