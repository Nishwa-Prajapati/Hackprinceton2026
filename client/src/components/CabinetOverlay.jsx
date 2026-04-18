import { useEffect, useRef } from 'react';

export default function CabinetOverlay({ cabinet, onBack }) {
  const overlayRef = useRef(null);

  // Animate in when mounted
  useEffect(() => {
    if (!overlayRef.current) return;
    overlayRef.current.style.opacity = '0';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (overlayRef.current) overlayRef.current.style.opacity = '1';
      });
    });
  }, []);

  if (!cabinet) return null;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 20,
        transition: 'opacity 0.35s ease',
      }}
    >
      {/* Dark vignette — heavy on edges, clear in center */}
      <div style={{
        position: 'absolute',
        inset: 0,
        boxShadow: 'inset 0 0 140px rgba(0,0,0,0.88)',
        pointerEvents: 'none',
      }} />

      {/* Top bar */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        padding: '22px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}>

        {/* Back button — left side */}
        <button
          onClick={onBack}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(255,140,0,0.12)',
            border: '1px solid #FF8C00',
            color: '#FF8C00',
            fontFamily: 'monospace',
            fontSize: '0.82rem',
            letterSpacing: '0.08em',
            padding: '9px 20px',
            cursor: 'pointer',
            borderRadius: '2px',
            textShadow: '0 0 10px #FF8C0088',
            boxShadow: '0 0 12px rgba(255,140,0,0.2)',
            transition: 'background 0.2s, box-shadow 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,140,0,0.26)';
            e.currentTarget.style.boxShadow  = '0 0 22px rgba(255,140,0,0.45)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,140,0,0.12)';
            e.currentTarget.style.boxShadow  = '0 0 12px rgba(255,140,0,0.2)';
          }}
        >
          ← Back to Lab
        </button>

        {/* Cabinet name — center */}
        <div style={{
          fontFamily: 'monospace',
          fontSize: '1.05rem',
          letterSpacing: '0.14em',
          color: '#00D4FF',
          textShadow: '0 0 18px #00D4FF99, 0 0 36px #00D4FF44',
          textTransform: 'uppercase',
          userSelect: 'none',
        }}>
          {cabinet.name}
        </div>

        {/* Spacer — mirrors button width */}
        <div style={{ minWidth: 130 }} />
      </div>

      {/* Escape hint — bottom center */}
      <div style={{
        position: 'absolute',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: 'monospace',
        fontSize: '0.68rem',
        color: '#ffffff44',
        letterSpacing: '0.1em',
        userSelect: 'none',
        pointerEvents: 'none',
      }}>
        Press ESC to exit
      </div>

      {/* Subtle cyan corner accents — sci-fi feel */}
      {['top:0;left:0', 'top:0;right:0', 'bottom:0;left:0', 'bottom:0;right:0'].map((pos, i) => {
        const style = Object.fromEntries(pos.split(';').map(p => p.split(':')));
        const rotations = ['0deg', '90deg', '270deg', '180deg'];
        return (
          <svg
            key={i}
            width="40" height="40"
            viewBox="0 0 40 40"
            style={{
              position: 'absolute',
              ...style,
              opacity: 0.5,
              transform: `rotate(${rotations[i]})`,
              pointerEvents: 'none',
            }}
          >
            <path d="M2 38 L2 2 L38 2" fill="none" stroke="#00D4FF" strokeWidth="1.5" />
          </svg>
        );
      })}
    </div>
  );
}
