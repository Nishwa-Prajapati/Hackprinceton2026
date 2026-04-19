import { useEffect, useRef, useState } from 'react';
import { LabEngine } from './lab/LabEngine';
import { labState } from './lab/LabState';
import EntryScreen from './components/EntryScreen';
import periodicTablePopup from './assets/periodic-table-popup.png';
import { findDeskReaction, getDeskApparatus } from './data/desks/index';

const UI_EDGE = 'max(20px, env(safe-area-inset-left), env(safe-area-inset-right))';
const UI_TOP = 'max(20px, env(safe-area-inset-top))';
const UI_BOTTOM = 'max(20px, env(safe-area-inset-bottom))';
const ACID_BASE_DESK = 'acidBase';
const UI_FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const MONO_FONT = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace';
const PANEL_SIDE_BY_DESK = {
  acidBase: 'left',
  combustion: 'right',
  synthesis: 'left',
  electrochemistry: 'right',
};

function getChemicalVisualColor(chemical) {
  return (
    chemical?.liquid_color
    ?? chemical?.bottle_color
    ?? chemical?.solid_color
    ?? chemical?.gas_color
    ?? chemical?.particle_color
    ?? '#a8dfff'
  );
}

function getReactionColors(reaction, chemicals) {
  return {
    initial: reaction?.output?.initial_color ?? getChemicalVisualColor(chemicals[0]),
    result: reaction?.output?.result_color ?? getChemicalVisualColor(chemicals[1]) ?? '#ffffff',
  };
}

function ApparatusArt({ icon, accent = '#00D4FF' }) {
  const shared = {
    stroke: 'rgba(229,240,255,0.92)',
    strokeWidth: '3',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  };

  const liquid = <rect x="33" y="50" width="34" height="18" rx="8" fill={accent} opacity="0.55" />;

  const shapes = {
    beaker: (
      <>
        <path {...shared} d="M30 24h40v46a8 8 0 0 1-8 8H38a8 8 0 0 1-8-8z" />
        {liquid}
      </>
    ),
    test_tube: (
      <>
        <path {...shared} d="M42 18h16v46a8 8 0 0 1-8 8 8 8 0 0 1-8-8z" />
        <rect x="44" y="50" width="12" height="18" rx="6" fill={accent} opacity="0.5" />
      </>
    ),
    rack: (
      <>
        <rect x="24" y="62" width="52" height="8" rx="4" fill="rgba(215, 223, 232, 0.88)" />
        <rect x="28" y="42" width="8" height="26" rx="4" fill="rgba(222,239,255,0.86)" />
        <rect x="46" y="38" width="8" height="30" rx="4" fill="rgba(222,239,255,0.86)" />
        <rect x="64" y="44" width="8" height="24" rx="4" fill="rgba(222,239,255,0.86)" />
      </>
    ),
    dropper: (
      <>
        <circle cx="31" cy="39" r="10" fill="rgba(224,232,243,0.92)" />
        <path {...shared} d="M39 39h24" />
        <path {...shared} d="M63 39l12 12" />
        <circle cx="78" cy="56" r="4" fill={accent} opacity="0.7" />
      </>
    ),
    burette: (
      <>
        <path {...shared} d="M48 16h4v52h-4z" />
        <path {...shared} d="M39 42h22" />
        <path {...shared} d="M58 42l10 8" />
      </>
    ),
    conical_flask: (
      <>
        <path {...shared} d="M44 16h12v16l16 36a8 8 0 0 1-7 11H35a8 8 0 0 1-7-11l16-36z" />
        <path d="M35 56h30v12a8 8 0 0 1-8 8H43a8 8 0 0 1-8-8z" fill={accent} opacity="0.55" />
      </>
    ),
    stirring_rod: (
      <>
        <path {...shared} d="M22 68L76 24" />
      </>
    ),
    delivery_tube: (
      <>
        <path {...shared} d="M22 42c12 0 16-16 30-16s18 18 26 18" />
      </>
    ),
    litmus_paper: (
      <>
        <rect x="30" y="26" width="10" height="42" rx="4" fill="rgba(228, 85, 126, 0.82)" />
        <rect x="45" y="22" width="10" height="46" rx="4" fill="rgba(131, 118, 236, 0.86)" />
        <rect x="60" y="28" width="10" height="40" rx="4" fill="rgba(228, 85, 126, 0.82)" />
      </>
    ),
    watch_glass: (
      <>
        <path {...shared} d="M26 56c10-12 38-12 48 0" />
        <path {...shared} d="M30 56c7 8 27 8 40 0" opacity="0.55" />
      </>
    ),
    measuring_cylinder: (
      <>
        <path {...shared} d="M42 18h16v52a8 8 0 0 1-8 8 8 8 0 0 1-8-8z" />
        <rect x="44" y="50" width="12" height="18" rx="5" fill={accent} opacity="0.5" />
        <path {...shared} d="M38 78h24" />
      </>
    ),
    ph_meter: (
      <>
        <rect x="34" y="20" width="32" height="42" rx="8" fill="rgba(227,236,247,0.9)" />
        <rect x="40" y="28" width="20" height="12" rx="4" fill={accent} opacity="0.72" />
        <path {...shared} d="M50 62v16" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 100 100" style={{ width: '78px', height: '78px' }} aria-hidden="true">
      <defs>
        <linearGradient id={`apparatus-bg-${icon}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="80" height="80" rx="22" fill={`url(#apparatus-bg-${icon})`} />
      {shapes[icon] ?? (
        <>
          <rect x="30" y="28" width="40" height="44" rx="12" fill="rgba(228,236,246,0.88)" />
          <rect x="38" y="38" width="24" height="14" rx="6" fill={accent} opacity="0.5" />
        </>
      )}
    </svg>
  );
}

function ApparatusMiniCard({ tool }) {
  return (
    <div
      style={{
        border: '1px solid rgba(0,212,255,0.14)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
        borderRadius: '20px',
        padding: '10px',
        display: 'grid',
        placeItems: 'center',
        boxShadow: '0 10px 24px rgba(0,0,0,0.16)',
      }}
    >
      <ApparatusArt icon={tool.icon} />
      <div style={{
        marginTop: '6px',
        fontFamily: UI_FONT,
        fontSize: '0.76rem',
        color: '#e9fbff',
        lineHeight: 1.35,
        textAlign: 'center',
      }}>
        {tool.name}
      </div>
    </div>
  );
}

function AnimatedReactionScene({ experiment }) {
  const { reaction, chemicals } = experiment;
  const colors = getReactionColors(reaction, chemicals);
  const output = reaction.output ?? {};
  const resultHeight = output.precipitate ? '44%' : '52%';

  const renderBottle = (chemical, side) => {
    const transform = side === 'left' ? 'rotate(-22deg)' : 'rotate(22deg)';
    const origin = side === 'left' ? '85% 70%' : '15% 70%';
    const streamStyle = side === 'left'
      ? {
          left: '50%',
          top: '112px',
          transform: 'translateX(-34px) rotate(14deg)',
          transformOrigin: 'top center',
          background: `linear-gradient(180deg, ${getChemicalVisualColor(chemical)} 0%, rgba(255,255,255,0.08) 100%)`,
        }
      : {
          right: '50%',
          top: '112px',
          transform: 'translateX(34px) rotate(-14deg)',
          transformOrigin: 'top center',
          background: `linear-gradient(180deg, ${getChemicalVisualColor(chemical)} 0%, rgba(255,255,255,0.08) 100%)`,
        };

    return (
      <div style={{
        width: '120px',
        display: 'grid',
        justifyItems: 'center',
        gap: '10px',
      }}>
        <div style={{
          fontFamily: MONO_FONT,
          fontSize: '0.72rem',
          letterSpacing: '0.08em',
          color: '#dff7ff',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          {chemical.formula}
        </div>
        <div style={{
          position: 'relative',
          width: '76px',
          height: '102px',
          transform,
          transformOrigin: origin,
        }}>
          <div style={{
            position: 'absolute',
            left: '22px',
            top: '0',
            width: '32px',
            height: '22px',
            borderRadius: '12px 12px 4px 4px',
            border: '2px solid rgba(238,247,255,0.78)',
            background: 'rgba(255,255,255,0.06)',
          }} />
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '16px',
            width: '52px',
            height: '74px',
            borderRadius: '20px 20px 22px 22px',
            border: '3px solid rgba(238,247,255,0.82)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              inset: '38px 6px 6px 6px',
              borderRadius: '14px',
              background: getChemicalVisualColor(chemical),
              opacity: 0.88,
            }} />
          </div>
        </div>
        <div style={{
          position: 'absolute',
          width: '8px',
          height: '122px',
          borderRadius: '999px',
          opacity: 0.78,
          animation: side === 'left' ? 'pourLeft 1.9s ease-in-out infinite' : 'pourRight 1.9s ease-in-out infinite',
          ...streamStyle,
        }} />
      </div>
    );
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '430px',
      padding: '14px 10px 0',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.25fr 1fr',
        alignItems: 'start',
        gap: '10px',
      }}>
        {renderBottle(chemicals[0], 'left')}

        <div style={{ position: 'relative', minHeight: '380px' }}>
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '22px',
            transform: 'translateX(-50%)',
            padding: '8px 14px',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(234, 245, 255, 0.78)',
            fontFamily: UI_FONT,
            fontSize: '0.9rem',
            whiteSpace: 'nowrap',
          }}>
            Mixing and reacting
          </div>

          <div style={{
            position: 'absolute',
            left: '50%',
            top: '78px',
            transform: 'translateX(-50%)',
            width: '260px',
            height: '290px',
            border: '4px solid rgba(234,245,255,0.9)',
            borderTopLeftRadius: '44px',
            borderTopRightRadius: '44px',
            borderBottomLeftRadius: '70px',
            borderBottomRightRadius: '70px',
            overflow: 'hidden',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))',
            boxShadow: 'inset 0 0 36px rgba(255,255,255,0.16), 0 0 42px rgba(0,212,255,0.08)',
          }}>
            <div style={{
              position: 'absolute',
              inset: '24px 22px auto 22px',
              top: 'auto',
              bottom: '18px',
              height: resultHeight,
              borderRadius: '34px 34px 50px 50px',
              background: colors.initial,
              opacity: output.color_change ? 0.34 : 0.78,
            }} />
            <div style={{
              position: 'absolute',
              inset: '24px 22px auto 22px',
              top: 'auto',
              bottom: '18px',
              height: resultHeight,
              borderRadius: '34px 34px 50px 50px',
              background: colors.result,
              opacity: 0.92,
              animation: output.color_change ? 'resultBlend 2.6s ease forwards' : 'liquidPulse 2.2s ease-in-out infinite',
            }} />

            {output.precipitate && (
              <div style={{
                position: 'absolute',
                left: '22px',
                right: '22px',
                bottom: '18px',
                height: '54px',
                borderBottomLeftRadius: '50px',
                borderBottomRightRadius: '50px',
                borderTopLeftRadius: '18px',
                borderTopRightRadius: '18px',
                background: output.precipitate_color ?? '#d8d8d8',
                opacity: 0.84,
                animation: 'precipitateSettle 2.4s ease forwards',
              }} />
            )}

            {output.gas_produced && Array.from({ length: 8 }).map((_, index) => (
              <span
                key={`bubble-${index}`}
                style={{
                  position: 'absolute',
                  left: `${40 + index * 24}px`,
                  bottom: `${42 + (index % 3) * 12}px`,
                  width: `${10 + (index % 3) * 6}px`,
                  height: `${10 + (index % 3) * 6}px`,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.28)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  animation: `bubbleRise 1.5s ease-in ${index * 0.14}s infinite`,
                }}
              />
            ))}

            {output.fumes && Array.from({ length: 5 }).map((_, index) => (
              <span
                key={`fume-${index}`}
                style={{
                  position: 'absolute',
                  left: `${52 + index * 30}px`,
                  top: `${18 + (index % 2) * 10}px`,
                  width: `${28 + index * 7}px`,
                  height: `${28 + index * 7}px`,
                  borderRadius: '50%',
                  background: output.fume_color ?? 'rgba(245,245,245,0.82)',
                  filter: 'blur(12px)',
                  opacity: 0.42,
                  animation: `fumeDrift 2.2s ease-in-out ${index * 0.2}s infinite`,
                }}
              />
            ))}

            {output.heat_released && (
              <>
                <div style={{
                  position: 'absolute',
                  inset: '0',
                  background: 'linear-gradient(180deg, rgba(255,140,0,0.05), rgba(255,140,0,0.18), rgba(255,255,255,0.04))',
                  mixBlendMode: 'screen',
                  animation: 'heatPulse 1.4s ease-in-out infinite',
                }} />
                {Array.from({ length: 5 }).map((_, index) => (
                  <span
                    key={`heat-${index}`}
                    style={{
                      position: 'absolute',
                      left: `${88 + index * 20}px`,
                      bottom: '40px',
                      width: '2px',
                      height: '120px',
                      borderRadius: '999px',
                      background: 'linear-gradient(180deg, rgba(255,180,80,0.05), rgba(255,160,40,0.4), rgba(255,255,255,0.04))',
                      animation: `heatRibbon 1.9s ease-in-out ${index * 0.14}s infinite`,
                    }}
                  />
                ))}
              </>
            )}
          </div>

          <div style={{
            position: 'absolute',
            left: '50%',
            bottom: '6px',
            transform: 'translateX(-50%)',
            width: '180px',
            height: '16px',
            borderRadius: '999px',
            background: 'rgba(0,0,0,0.34)',
            filter: 'blur(2px)',
          }} />
        </div>

        {renderBottle(chemicals[1], 'right')}
      </div>
    </div>
  );
}

function AcidBaseReactionPrompt({
  reactantA,
  reactantB,
  error,
  onChange,
  onSubmit,
  onDismiss,
  side = 'left',
}) {
  const sideStyle = side === 'left'
    ? { left: UI_EDGE }
    : { right: UI_EDGE };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 26, pointerEvents: 'none' }}>
      <form
        onSubmit={onSubmit}
        style={{
          position: 'absolute',
          top: 'clamp(104px, 16vh, 132px)',
          width: 'min(340px, calc(100vw - 40px))',
          pointerEvents: 'auto',
          ...sideStyle,
          background: 'linear-gradient(180deg, rgba(17, 22, 32, 0.96) 0%, rgba(11, 15, 24, 0.98) 100%)',
          border: '1px solid rgba(0, 212, 255, 0.18)',
          borderRadius: '22px',
          boxShadow: '0 16px 60px rgba(0,0,0,0.34), 0 0 20px rgba(0,212,255,0.08)',
          padding: '20px',
          display: 'grid',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{
              fontFamily: MONO_FONT,
              fontSize: '0.82rem',
              letterSpacing: '0.12em',
              color: '#8fe8f2',
              textTransform: 'uppercase',
            }}>
              Acid-Base Input
            </div>
            <div style={{
              marginTop: '6px',
              color: 'rgba(228,238,247,0.8)',
              fontFamily: UI_FONT,
              fontSize: '0.92rem',
              lineHeight: 1.55,
            }}>
              Type any two reactants from the desk by formula, name, or number.
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#d7dde7',
              borderRadius: '12px',
              padding: '8px 10px',
              cursor: 'pointer',
              fontFamily: MONO_FONT,
              fontSize: '0.74rem',
            }}
          >
            Close
          </button>
        </div>

        <label style={{ display: 'grid', gap: '6px' }}>
          <span style={{ color: '#dff7ff', fontFamily: UI_FONT, fontSize: '0.88rem', fontWeight: 600 }}>Reactant 1</span>
          <input
            name="reactantA"
            value={reactantA}
            onChange={onChange}
            autoFocus
            style={{
              width: '100%',
              padding: '12px 13px',
              borderRadius: '14px',
              background: 'rgba(9, 13, 20, 0.94)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#f6fbff',
              fontSize: '0.96rem',
              fontFamily: UI_FONT,
              outline: 'none',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: '6px' }}>
          <span style={{ color: '#dff7ff', fontFamily: UI_FONT, fontSize: '0.88rem', fontWeight: 600 }}>Reactant 2</span>
          <input
            name="reactantB"
            value={reactantB}
            onChange={onChange}
            style={{
              width: '100%',
              padding: '12px 13px',
              borderRadius: '14px',
              background: 'rgba(9, 13, 20, 0.94)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#f6fbff',
              fontSize: '0.96rem',
              fontFamily: UI_FONT,
              outline: 'none',
            }}
          />
        </label>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          {['HCl + NaOH', '1 + 2', 'Hydrochloric Acid'].map((example) => (
            <span
              key={example}
              style={{
                padding: '7px 10px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(223,247,255,0.7)',
                fontFamily: MONO_FONT,
                fontSize: '0.66rem',
              }}
            >
              {example}
            </span>
          ))}
        </div>

        {error && (
          <div style={{
            padding: '11px 12px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 109, 109, 0.24)',
            background: 'rgba(88, 18, 18, 0.28)',
            color: '#ffd6d6',
            lineHeight: 1.6,
            fontFamily: UI_FONT,
            fontSize: '0.9rem',
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          style={{
            justifySelf: 'start',
            background: 'linear-gradient(90deg, rgba(0,212,255,0.18), rgba(255,140,0,0.2))',
            border: '1px solid rgba(0,212,255,0.24)',
            color: '#eefcff',
            borderRadius: '14px',
            padding: '11px 16px',
            fontFamily: MONO_FONT,
            fontSize: '0.8rem',
            letterSpacing: '0.08em',
            cursor: 'pointer',
          }}
        >
          Run Reaction
        </button>
      </form>
    </div>
  );
}

function AcidBaseExperimentOverlay({ experiment, onBackToDesk, onTryAnother }) {
  const { reaction, chemicals, apparatusUsed } = experiment;
  const output = reaction.output ?? {};

  const outputTags = [
    output.gas_produced && `${output.gas_name ?? 'Gas'}${output.gas_formula ? ` (${output.gas_formula})` : ''}`,
    output.fumes && (output.fume_name ?? 'Visible fumes'),
    output.precipitate && (output.precipitate_name ?? 'Precipitate formed'),
    output.heat_released && 'Heat released',
    typeof output.result_pH === 'number' && `pH ${output.result_pH}`,
    output.color_change && 'Colour change',
  ].filter(Boolean);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 27,
      background: 'rgba(4, 9, 17, 0.56)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'min(4vw, 28px)',
    }}>
      <div style={{
        width: 'min(96vw, 1180px)',
        maxHeight: '92vh',
        overflow: 'auto',
        background: 'linear-gradient(180deg, rgba(16, 21, 31, 0.98) 0%, rgba(10, 14, 22, 0.98) 100%)',
        border: '1px solid rgba(0,212,255,0.18)',
        borderRadius: '28px',
        boxShadow: '0 22px 90px rgba(0,0,0,0.52), 0 0 34px rgba(0,212,255,0.08)',
        padding: 'clamp(18px, 3vw, 28px)',
        display: 'grid',
        gap: '18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{
              fontFamily: MONO_FONT,
              fontSize: '0.82rem',
              letterSpacing: '0.14em',
              color: '#8fe8f2',
              textTransform: 'uppercase',
            }}>
              Acid-Base Experiment
            </div>
            <div style={{
              marginTop: '8px',
              color: '#f0f6ff',
              fontFamily: UI_FONT,
              fontSize: '1.08rem',
              fontWeight: 600,
            }}>
              {reaction.name}
            </div>
            <div style={{
              marginTop: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 13px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: '#ffe0b5',
              fontFamily: MONO_FONT,
              fontSize: '0.78rem',
            }}>
              {chemicals[0].formula} + {chemicals[1].formula} → {reaction.formula}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={onTryAnother}
              style={{
                background: 'rgba(0,212,255,0.12)',
                border: '1px solid rgba(0,212,255,0.26)',
                color: '#dff7ff',
                borderRadius: '14px',
                padding: '10px 14px',
                fontFamily: MONO_FONT,
                fontSize: '0.76rem',
                cursor: 'pointer',
              }}
            >
              Try Another
            </button>
            <button
              onClick={onBackToDesk}
              style={{
                background: 'rgba(255,140,0,0.12)',
                border: '1px solid rgba(255,140,0,0.3)',
                color: '#ffcb8c',
                borderRadius: '14px',
                padding: '10px 14px',
                fontFamily: MONO_FONT,
                fontSize: '0.76rem',
                cursor: 'pointer',
              }}
            >
              ← Back to Desk
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '18px', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.92fr)' }}>
          <div style={{
            padding: '18px',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
          }}>
            <div style={{
              fontFamily: MONO_FONT,
              color: '#8fe8f2',
              fontSize: '0.76rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}>
              Reaction Performance
            </div>
            <AnimatedReactionScene experiment={experiment} />
          </div>

          <div style={{ display: 'grid', gap: '18px' }}>
            <div style={{
              padding: '18px',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
            }}>
              <div style={{
                fontFamily: MONO_FONT,
                color: '#8fe8f2',
                fontSize: '0.76rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '14px',
              }}>
                Apparatus Used
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
                gap: '12px',
              }}>
                {apparatusUsed.map((tool) => (
                  <ApparatusMiniCard
                    key={`${tool.id}-${tool.name}`}
                    tool={tool}
                  />
                ))}
              </div>
            </div>

            <div style={{
              padding: '18px',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
            }}>
              <div style={{
                fontFamily: MONO_FONT,
                color: '#8fe8f2',
                fontSize: '0.76rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}>
                Output Highlights
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {outputTags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '999px',
                      background: 'rgba(255,140,0,0.12)',
                      border: '1px solid rgba(255,140,0,0.22)',
                      color: '#ffe2bf',
                      fontFamily: UI_FONT,
                      fontSize: '0.88rem',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div style={{
              padding: '18px',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              color: 'rgba(233,244,255,0.82)',
              lineHeight: 1.74,
              fontFamily: UI_FONT,
            }}>
              <div style={{
                fontFamily: MONO_FONT,
                color: '#8fe8f2',
                fontSize: '0.76rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}>
                Observation
              </div>
              {output.observation}
            </div>
          </div>
        </div>

        <div style={{
          padding: '18px',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(90deg, rgba(0,212,255,0.06), rgba(255,140,0,0.08))',
          color: '#edf7ff',
          lineHeight: 1.74,
          fontFamily: UI_FONT,
        }}>
          <div style={{
            fontFamily: MONO_FONT,
            color: '#8fe8f2',
            fontSize: '0.76rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            Educational Note
          </div>
          {reaction.educational_note}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const tooltipRef = useRef(null);
  const reactantARef = useRef('');
  const reactantBRef = useRef('');

  const [phase, setPhase] = useState('entry');
  const [activeBench, setActiveBench] = useState(null);
  const [periodicOpen, setPeriodicOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [reactionPromptOpen, setReactionPromptOpen] = useState(false);
  const [reactantA, setReactantA] = useState('');
  const [reactantB, setReactantB] = useState('');
  const [reactionError, setReactionError] = useState('');
  const [experimentState, setExperimentState] = useState(null);

  useEffect(() => {
    reactantARef.current = reactantA;
    reactantBRef.current = reactantB;
  }, [reactantA, reactantB]);

  useEffect(() => {
    const engine = new LabEngine();
    engineRef.current = engine;
    engine.init(canvasRef.current);
    engine.setTooltipEl(tooltipRef.current);

    const offBenchFocus = labState.on('bench:focused', ({ id, name, deskKey }) => {
      setActiveBench({ id, name, deskKey });
      setPhase('focused');
      setExperimentState(null);
      setReactionError('');
      setReactantA('');
      setReactantB('');
      setReactionPromptOpen(deskKey === ACID_BASE_DESK);
    });
    const offBenchExit = labState.on('bench:exited', () => {
      setActiveBench(null);
      setPhase('roaming');
      setExperimentState(null);
      setReactionPromptOpen(false);
      setReactionError('');
      setReactantA('');
      setReactantB('');
    });
    const offPeriodicOpen = labState.on('periodic:opened', () => {
      setPeriodicOpen(true);
    });
    const offPeriodicClose = labState.on('periodic:closed', () => {
      setPeriodicOpen(false);
    });
    const offReactantSelected = labState.on('bench:reactantSelected', ({ benchId, reactant }) => {
      setActiveBench((currentBench) => {
        if (!currentBench || currentBench.id !== benchId || currentBench.deskKey !== ACID_BASE_DESK) {
          return currentBench;
        }

        const value = reactant?.formula ?? reactant?.name ?? '';
        if (!value) return currentBench;

        setExperimentState(null);
        setReactionPromptOpen(true);
        setReactionError('');
        if (!reactantARef.current) {
          setReactantA(value);
        } else if (!reactantBRef.current) {
          setReactantB(value);
        } else {
          setReactantB(value);
        }

        return currentBench;
      });
    });

    return () => {
      offBenchFocus();
      offBenchExit();
      offPeriodicOpen();
      offPeriodicClose();
      offReactantSelected();
      engine.dispose();
    };
  }, []);

  useEffect(() => {
    const shouldLockUi = periodicOpen || (phase === 'focused' && activeBench?.deskKey === ACID_BASE_DESK && (reactionPromptOpen || !!experimentState));
    engineRef.current?.setUiLocked(shouldLockUi);

    if (experimentState?.apparatusUsed?.length) {
      engineRef.current?.setExperimentApparatus(experimentState.apparatusUsed.map((tool) => tool.name));
    } else {
      engineRef.current?.clearExperimentApparatus();
    }
  }, [activeBench?.deskKey, experimentState, periodicOpen, phase, reactionPromptOpen]);

  useEffect(() => {
    const handle = (e) => {
      if (e.key === 'Escape' && periodicOpen) {
        labState.emit('periodic:closed', {});
        return;
      }

      if (e.key === 'Escape' && experimentState) {
        setExperimentState(null);
        return;
      }

      if (e.key === 'Escape' && reactionPromptOpen) {
        setReactionPromptOpen(false);
        setReactionError('');
        return;
      }

      if ((e.key === 'Escape' || e.key === 'Enter') && phase === 'focused' && !reactionPromptOpen && !experimentState) {
        engineRef.current?.exitBench();
      }
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [experimentState, periodicOpen, phase, reactionPromptOpen]);

  function handleGateOpened() {
    setPhase('roaming');
    setHintVisible(true);
    engineRef.current?.flyIn(() => setTimeout(() => setHintVisible(false), 4000));
  }

  function handleReactantInput(e) {
    const { name, value } = e.target;
    if (name === 'reactantA') setReactantA(value);
    if (name === 'reactantB') setReactantB(value);
    if (reactionError) setReactionError('');
  }

  function runAcidBaseExperiment(e) {
    e.preventDefault();

    const { reaction, chemicals } = findDeskReaction(ACID_BASE_DESK, reactantA, reactantB);

    if (!chemicals[0] || !chemicals[1]) {
      setReactionError('Enter two valid Acid-Base reactants using the formula, full name, or desk number.');
      return;
    }

    if (!reaction || reaction.type === 'no_reaction') {
      setReactionError(reaction?.output?.observation ?? 'This reaction is not possible on the Acid-Base desk.');
      return;
    }

    const apparatusCatalog = getDeskApparatus(ACID_BASE_DESK);
    const apparatusUsed = (reaction.apparatus_needed ?? [])
      .map((id) => apparatusCatalog.find((tool) => tool.id === id))
      .filter(Boolean);

    setExperimentState({
      reaction,
      chemicals,
      apparatusUsed,
    });
    setReactionPromptOpen(false);
    setReactionError('');
  }

  function closeExperimentToDesk() {
    setExperimentState(null);
  }

  function reopenAcidBasePrompt() {
    setExperimentState(null);
    setReactionError('');
    setReactionPromptOpen(true);
  }

  const promptSide = PANEL_SIDE_BY_DESK[activeBench?.deskKey] ?? 'right';

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'block' }}
      />

      {phase === 'entry' && <EntryScreen onEntered={handleGateOpened} />}

      {phase === 'focused' && activeBench && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
          <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 100px rgba(0,0,0,0.75)' }} />

          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: `${UI_TOP} ${UI_EDGE} 0 ${UI_EDGE}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
          }}>
            <button
              onClick={() => engineRef.current?.exitBench()}
              style={{
                pointerEvents: 'auto',
                background: 'rgba(255,140,0,0.12)',
                border: '1px solid #FF8C00',
                color: '#FF8C00',
                fontFamily: MONO_FONT,
                fontSize: '0.78rem',
                letterSpacing: '0.08em',
                padding: '9px 18px',
                cursor: 'pointer',
                borderRadius: '12px',
                textShadow: '0 0 10px #FF8C0088',
                boxShadow: '0 0 12px rgba(255,140,0,0.2)',
              }}
            >
              ← Back to Lab
            </button>

            <div style={{
              fontFamily: MONO_FONT,
              fontSize: '0.92rem',
              letterSpacing: '0.14em',
              color: '#72f3ff',
              textShadow: '0 0 16px rgba(114,243,255,0.7)',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}>
              {activeBench.name} Bench
            </div>

            {activeBench.deskKey === ACID_BASE_DESK ? (
              <button
                onClick={reopenAcidBasePrompt}
                style={{
                  pointerEvents: 'auto',
                  background: 'rgba(0,212,255,0.12)',
                  border: '1px solid rgba(0,212,255,0.3)',
                  color: '#dff7ff',
                  fontFamily: MONO_FONT,
                  fontSize: '0.76rem',
                  letterSpacing: '0.08em',
                  padding: '9px 14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                }}
              >
                Open Reaction Input
              </button>
            ) : (
              <div style={{ minWidth: 140 }} />
            )}
          </div>

          <div style={{
            position: 'absolute',
            bottom: UI_BOTTOM,
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: MONO_FONT,
            fontSize: '0.66rem',
            color: '#ffffff44',
            letterSpacing: '0.1em',
            padding: '0 16px',
            textAlign: 'center',
          }}>
            Press Enter or ESC to exit
          </div>

          {['top:0;left:0', 'top:0;right:0', 'bottom:0;left:0', 'bottom:0;right:0'].map((pos, i) => {
            const s = Object.fromEntries(pos.split(';').map((p) => p.split(':')));
            const rotations = ['0deg', '90deg', '270deg', '180deg'];
            return (
              <svg
                key={i}
                width="40"
                height="40"
                viewBox="0 0 40 40"
                style={{ position: 'absolute', ...s, opacity: 0.5, transform: `rotate(${rotations[i]})`, pointerEvents: 'none' }}
              >
                <path d="M2 38 L2 2 L38 2" fill="none" stroke="#FF8C00" strokeWidth="1.5" />
              </svg>
            );
          })}
        </div>
      )}

      {phase === 'focused' && activeBench?.deskKey === ACID_BASE_DESK && reactionPromptOpen && !experimentState && (
        <AcidBaseReactionPrompt
          reactantA={reactantA}
          reactantB={reactantB}
          error={reactionError}
          onChange={handleReactantInput}
          onSubmit={runAcidBaseExperiment}
          onDismiss={() => {
            setReactionPromptOpen(false);
            setReactionError('');
          }}
          side={promptSide}
        />
      )}

      {phase === 'focused' && activeBench?.deskKey === ACID_BASE_DESK && experimentState && (
        <AcidBaseExperimentOverlay
          experiment={experimentState}
          onBackToDesk={closeExperimentToDesk}
          onTryAnother={reopenAcidBasePrompt}
        />
      )}

      {periodicOpen && (
        <div
          onWheel={(e) => e.preventDefault()}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 25,
            background: 'rgba(10, 14, 20, 0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'min(5vw, 40px)',
          }}
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
              <div style={{ fontFamily: MONO_FONT, fontSize: '1rem', letterSpacing: '0.14em', color: '#dff7ff', textTransform: 'uppercase' }}>Periodic Table</div>
              <button
                onClick={() => labState.emit('periodic:closed', {})}
                style={{ background: 'rgba(255,140,0,0.12)', border: '1px solid #FF8C00', color: '#FF8C00', fontFamily: MONO_FONT, fontSize: '0.8rem', letterSpacing: '0.08em', padding: '8px 18px', cursor: 'pointer', borderRadius: '12px' }}
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

      <div style={{
        position: 'fixed',
        bottom: UI_BOTTOM,
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
        padding: '0 16px',
        textAlign: 'center',
        maxWidth: 'min(92vw, 40rem)',
      }}>
        <span style={{ fontFamily: MONO_FONT, fontSize: '0.78rem', color: '#00D4FF', letterSpacing: '0.12em', textShadow: '0 0 12px #00D4FF88' }}>
          Drag to look around • W A S D or arrow keys to move • Scroll to glide forward or back
        </span>
        {[0, 1, 2].map((i) => (
          <svg key={i} width="18" height="10" viewBox="0 0 18 10" fill="none"
            style={{ opacity: 0.5 + i * 0.2, animation: `chevronBounce 1.4s ease-in-out ${i * 0.18}s infinite` }}>
            <polyline points="1,1 9,9 17,1" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ))}
      </div>

      <div ref={tooltipRef} style={{
        position: 'fixed',
        top: 0,
        left: 0,
        fontFamily: MONO_FONT,
        fontSize: '0.72rem',
        color: '#00D4FF',
        letterSpacing: '0.06em',
        background: 'rgba(13,13,26,0.92)',
        border: '1px solid #00D4FF44',
        padding: '5px 11px',
        pointerEvents: 'none',
        zIndex: 30,
        visibility: 'hidden',
        opacity: 0,
        transition: 'opacity 0.12s',
        whiteSpace: 'nowrap',
        maxWidth: 'min(80vw, 20rem)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }} />

      <style>{`
        @keyframes chevronBounce {
          0%, 100% { transform: translateY(0); opacity: 0.55; }
          50% { transform: translateY(4px); opacity: 1; }
        }
        @keyframes bubbleRise {
          0% { transform: translateY(0) scale(0.55); opacity: 0; }
          18% { opacity: 0.84; }
          100% { transform: translateY(-142px) scale(1.12); opacity: 0; }
        }
        @keyframes fumeDrift {
          0%, 100% { transform: translateY(0) translateX(0) scale(0.86); opacity: 0.14; }
          50% { transform: translateY(-16px) translateX(8px) scale(1.08); opacity: 0.54; }
        }
        @keyframes heatPulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.62; }
        }
        @keyframes heatRibbon {
          0%, 100% { transform: translateY(0) scaleY(0.86); opacity: 0.18; }
          50% { transform: translateY(-16px) scaleY(1.08); opacity: 0.44; }
        }
        @keyframes resultBlend {
          0% { transform: translateY(24px); opacity: 0.24; }
          100% { transform: translateY(0); opacity: 0.92; }
        }
        @keyframes liquidPulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.07); }
        }
        @keyframes precipitateSettle {
          0% { transform: scaleY(0.16); transform-origin: bottom; opacity: 0.16; }
          100% { transform: scaleY(1); transform-origin: bottom; opacity: 0.84; }
        }
        @keyframes pourLeft {
          0%, 100% { opacity: 0.2; height: 82px; }
          35%, 70% { opacity: 0.84; height: 138px; }
        }
        @keyframes pourRight {
          0%, 100% { opacity: 0.2; height: 82px; }
          35%, 70% { opacity: 0.84; height: 138px; }
        }
      `}</style>
    </>
  );
}
