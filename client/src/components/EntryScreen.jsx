import { useEffect, useState } from 'react';
import entryLogo from '../assets/entry-logo.png';

export default function EntryScreen({ onEntered }) {
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    const handle = (e) => {
      if (e.key === 'Enter' && !opening) triggerOpen();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [opening]);

  function triggerOpen() {
    setOpening(true);
    // After gate slide finishes (0.85s), tell App to start camera fly-in
    setTimeout(() => onEntered(), 880);
  }

  return (
    <>
      <style>{`
        @keyframes entryPulse {
          0%, 100% { opacity: 0.5; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
        }
        @keyframes scanSweep {
          0% { transform: translateY(-120%); opacity: 0; }
          18% { opacity: 1; }
          100% { transform: translateY(130vh); opacity: 0; }
        }
        @keyframes logoGlow {
          0%, 100% {
            filter: drop-shadow(0 0 16px rgba(82, 245, 255, 0.45)) drop-shadow(0 0 36px rgba(177, 94, 255, 0.35));
          }
          50% {
            filter: drop-shadow(0 0 24px rgba(82, 245, 255, 0.65)) drop-shadow(0 0 54px rgba(255, 97, 214, 0.42));
          }
        }
        @keyframes panelGlow {
          0%, 100% { box-shadow: 0 0 18px rgba(57, 233, 255, 0.24), 0 0 42px rgba(255, 104, 212, 0.12); }
          50% { box-shadow: 0 0 28px rgba(57, 233, 255, 0.4), 0 0 56px rgba(255, 104, 212, 0.22); }
        }
        @keyframes accessBlink {
          0%, 100% { opacity: 0.65; }
          50% { opacity: 1; }
        }
      `}</style>

      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'radial-gradient(circle at 50% 42%, rgba(123,190,255,0.2), transparent 28%), linear-gradient(180deg, #23242f 0%, #161822 100%)',
        overflow: 'hidden',
        touchAction: 'none',
      }}>
        <div style={{
          position: 'absolute',
          inset: 'clamp(14px, 1.8vw, 24px)',
          border: '1px solid rgba(120, 239, 255, 0.14)',
          boxShadow: 'inset 0 0 40px rgba(255,255,255,0.06), 0 0 50px rgba(0,0,0,0.38)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(110,241,255,0.9), transparent)',
          animation: 'scanSweep 3.4s linear infinite',
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'absolute',
          top: 'clamp(38px, 7vh, 68px)',
          bottom: 'clamp(38px, 7vh, 68px)',
          left: 'clamp(28px, 5vw, 68px)',
          right: 'clamp(28px, 5vw, 68px)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'clamp(12px, 1.6vw, 22px)',
        }}>
          {['left', 'right'].map(side => (
            <div
              key={side}
              style={{
                position: 'relative',
                overflow: 'hidden',
                transform: opening
                  ? side === 'left' ? 'translateX(-112%)' : 'translateX(112%)'
                  : 'translateX(0)',
                transition: 'transform 1.15s cubic-bezier(0.2, 0.8, 0.18, 1)',
                background: side === 'left'
                  ? 'linear-gradient(135deg, #cfd3dc 0%, #9ea4af 24%, #c7ccd6 48%, #858b97 100%)'
                  : 'linear-gradient(225deg, #cfd3dc 0%, #9ea4af 24%, #c7ccd6 48%, #858b97 100%)',
                border: '2px solid rgba(221, 233, 242, 0.55)',
                animation: 'panelGlow 2.8s ease-in-out infinite',
                boxShadow: side === 'left'
                  ? 'inset -12px 0 30px rgba(255,255,255,0.18), inset 0 0 60px rgba(0,0,0,0.24)'
                  : 'inset 12px 0 30px rgba(255,255,255,0.18), inset 0 0 60px rgba(0,0,0,0.24)',
              }}
            >
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
                  linear-gradient(120deg, rgba(255,255,255,0.18), transparent 18%, transparent 82%, rgba(255,255,255,0.12)),
                  linear-gradient(90deg, rgba(74, 249, 255, 0.24), rgba(255, 95, 210, 0.16)),
                  radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08), transparent 55%)
                `,
                mixBlendMode: 'screen',
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute',
                inset: '8% 7%',
                backgroundImage: `
                  linear-gradient(90deg, rgba(70,86,110,0.22) 0 2px, transparent 2px 100%),
                  linear-gradient(rgba(70,86,110,0.2) 0 2px, transparent 2px 100%),
                  radial-gradient(circle, rgba(87,99,121,0.26) 24%, transparent 25%)
                `,
                backgroundSize: '22% 100%, 100% 18%, 14px 14px',
                backgroundPosition: 'center, center, center',
                opacity: 0.58,
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute',
                inset: '10% 8%',
                border: '1px solid rgba(87, 239, 255, 0.2)',
                boxShadow: 'inset 0 0 0 1px rgba(255, 94, 213, 0.12)',
                clipPath: side === 'left'
                  ? 'polygon(0 0, 92% 0, 100% 18%, 100% 82%, 92% 100%, 0 100%, 0 70%, 6% 50%, 0 30%)'
                  : 'polygon(8% 0, 100% 0, 100% 30%, 94% 50%, 100% 70%, 100% 100%, 8% 100%, 0 82%, 0 18%)',
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute',
                top: '50%',
                [side === 'left' ? 'right' : 'left']: '6.8%',
                width: '3.8rem',
                height: '0.42rem',
                borderRadius: '999px',
                transform: 'translateY(-50%)',
                background: 'linear-gradient(90deg, #4b515d, #edf2f8, #7a8290)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.22), 0 0 18px rgba(119, 241, 255, 0.16)',
              }} />
              <div style={{
                position: 'absolute',
                top: '12%',
                bottom: '12%',
                [side === 'left' ? 'right' : 'left']: 0,
                width: '5px',
                background: 'linear-gradient(180deg, rgba(81, 245, 255, 0.9), rgba(255, 103, 215, 0.55), rgba(81, 245, 255, 0.9))',
                boxShadow: '0 0 22px rgba(86, 244, 255, 0.55), 0 0 44px rgba(255, 108, 213, 0.28)',
              }} />
            </div>
          ))}
        </div>

        <div style={{
          position: 'absolute',
          left: '50%',
          top: 'clamp(46px, 8vh, 80px)',
          bottom: 'clamp(46px, 8vh, 80px)',
          width: '4px',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg, transparent, rgba(90,243,255,0.95), rgba(255,103,214,0.65), transparent)',
          boxShadow: '0 0 20px rgba(86,244,255,0.7), 0 0 44px rgba(255, 98, 213, 0.22)',
        }} />

        <div style={{
          position: 'absolute',
          right: 'clamp(18px, 4.2vw, 52px)',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 'clamp(62px, 6vw, 78px)',
          height: 'clamp(96px, 11vw, 126px)',
          borderRadius: '0.55rem',
          background: 'linear-gradient(180deg, rgba(23,35,45,0.9), rgba(57,75,92,0.94))',
          border: '1px solid rgba(110,245,255,0.45)',
          boxShadow: '0 0 26px rgba(74, 245, 255, 0.28), inset 0 0 18px rgba(0, 0, 0, 0.36)',
          cursor: opening ? 'default' : 'pointer',
          pointerEvents: opening ? 'none' : 'auto',
        }}
        onClick={triggerOpen}>
          <div style={{
            position: 'absolute',
            inset: '0.7rem',
            borderRadius: '0.35rem',
            background: 'linear-gradient(180deg, rgba(55,247,255,0.45), rgba(13,53,68,0.95))',
            boxShadow: 'inset 0 0 22px rgba(115,255,255,0.28)',
          }} />
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '1.2rem',
            width: '1.7rem',
            height: '1.7rem',
            transform: 'translateX(-50%)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(180,255,255,1) 0%, rgba(60,241,255,0.95) 40%, rgba(9,74,93,0.95) 100%)',
            boxShadow: '0 0 20px rgba(77, 244, 255, 0.75)',
            animation: 'accessBlink 1.8s ease-in-out infinite',
          }} />
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                bottom: `${1 + i * 1.25}rem`,
                width: '2rem',
                height: '0.26rem',
                transform: 'translateX(-50%)',
                borderRadius: '999px',
                background: 'linear-gradient(90deg, rgba(130,255,255,0.08), rgba(104,247,255,0.8), rgba(130,255,255,0.08))',
              }}
            />
          ))}
        </div>

        {!opening && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.35rem',
            zIndex: 2,
          }}>
            <img
              src={entryLogo}
              alt="LabZero logo"
              style={{
                pointerEvents: 'none',
                width: 'min(62vw, 40rem)',
                maxWidth: '100%',
                height: 'auto',
                objectFit: 'contain',
                animation: 'logoGlow 2.8s ease-in-out infinite',
                filter: 'drop-shadow(0 0 18px rgba(84,245,255,0.32)) drop-shadow(0 0 40px rgba(255,124,220,0.2))',
                userSelect: 'none',
              }}
            />

            <div style={{
              fontFamily: 'monospace',
              fontSize: '0.72rem',
              letterSpacing: '0.36em',
              color: 'rgba(205, 245, 255, 0.7)',
              textTransform: 'uppercase',
            }}>
              Authorized Research Facility
            </div>

            <div style={{
              position: 'absolute',
              bottom: 'clamp(18px, 3.2vh, 28px)',
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: 'monospace',
              fontSize: '0.62rem',
              letterSpacing: '0.22em',
              color: 'rgba(226, 238, 246, 0.36)',
              textTransform: 'uppercase',
            }}>
              Gate Sequence Alpha-01
            </div>
          </div>
        )}
      </div>

      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at center, transparent 0%, transparent 36%, rgba(7, 10, 16, 0.32) 100%)',
        pointerEvents: 'none',
        zIndex: 105,
      }} />
    </>
  );
}
