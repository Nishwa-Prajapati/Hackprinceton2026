import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';

// ── bench zone → server desk ID ──────────────────────────────────────────────
const ZONE_TO_DESK = {
  zone1: 'desk_1',
  zone2: 'desk_2',
  zone3: 'desk_4',
  zone4: 'desk_3',
};

// ── Real-world context by reaction type ──────────────────────────────────────
const REAL_WORLD = {
  neutralization:        ['Antacids neutralise stomach acid', 'Water treatment pH control', 'Agriculture soil adjustment'],
  gas_evolution:         ['CO₂ fire extinguishers', 'Baking powder in cooking', 'Industrial acid cleaning'],
  no_reaction:           ['Safe chemical storage pairing', 'Pharmaceutical compatibility checks'],
  indicator_test:        ['pH paper in swimming pools', 'Soil testing kits', 'Medical urine analysis'],
  precipitation:         ['Water softening plants', 'Photography silver halide', 'Kidney stone formation'],
  fume_evolution:        ['Smelling salts (ammonia)', 'Industrial cleaning agents'],
  combustion:            ['Car engines & jet turbines', 'Power station fuel burning', 'Rocket propellants'],
  incomplete_combustion: ['Diesel particulate emissions', 'Charcoal smelting', 'Carbon black production'],
  metal_combustion:      ['Fireworks & flares', 'Emergency signal flares', 'Welding (thermite)'],
  electrolysis:          ['Aluminium extraction (Hall–Héroult)', 'Electroplating jewellery', 'Hydrogen fuel production'],
  conductivity_test:     ['Water quality sensors', 'Battery electrolyte checks', 'Soil salinity meters'],
  electroplating:        ['Chrome car parts', 'Zinc-coated (galvanised) steel', 'Gold jewellery coating'],
  synthesis:             ['Fertiliser (Haber process NH₃)', 'Iron & steel production', 'Quicklime manufacture'],
  decomposition:         ['Limestone → lime kilns', 'Hydrogen peroxide antiseptics', 'Baking soda in cooking'],
};

// ── Danger Aura system ───────────────────────────────────────────────────────
function getHazardLevel(hazard = '') {
  const h = hazard.toLowerCase();
  if (
    h.includes('never look') || h.includes('burns_bright') ||
    h.includes('very_reactive') || h.includes('extreme') ||
    h.includes('violent') || h.includes('explosion')
  ) return 'extreme';
  if (
    h.includes('toxic') || h.includes('corrosive') || h.includes('highly_flammable') ||
    h.includes('fumes') || h.includes('handle dry') || h.includes('compressed_gas') ||
    h.includes('produces_co') || h.includes('ventil') || h.includes('asphyxiant') ||
    h.includes('oxidiser')
  ) return 'high';
  if (
    h.includes('flammable') || h.includes('irritant') || h.includes('caution') ||
    h.includes('mild') || h.includes('sparks') || h.includes('fire hazard') ||
    h.includes('promotes burning')
  ) return 'moderate';
  return 'safe';
}

const HAZARD = {
  extreme: { color: '#ff3535', rgb: '255,53,53',  icon: '☠', label: 'HAZARD',  anim: 'auraExtreme',  speed: '0.85s' },
  high:    { color: '#FF8C00', rgb: '255,140,0',  icon: '⚠', label: 'DANGER',  anim: 'auraHigh',     speed: '1.3s'  },
  moderate:{ color: '#fbbf24', rgb: '251,191,36', icon: '⚡', label: 'CAUTION', anim: 'auraModerate', speed: '2.2s'  },
  safe:    { color: '#34d399', rgb: '52,211,153', icon: '✓', label: 'SAFE',    anim: null,            speed: null    },
};

const HAZARD_ORDER = ['extreme', 'high', 'moderate', 'safe'];
function worstHazard(levels) {
  return levels.reduce(
    (worst, lvl) => HAZARD_ORDER.indexOf(lvl) < HAZARD_ORDER.indexOf(worst) ? lvl : worst,
    'safe'
  );
}

// ── Erlenmeyer flask SVG ──────────────────────────────────────────────────────
function FlaskSVG({ bodyColor = '#88ccff', size = 64, isSelected = false, hazardLevel = 'safe' }) {
  const hz = HAZARD[hazardLevel];
  const glowColor = isSelected ? 'rgba(0,212,255,0.8)' : `rgba(${hz.rgb},0.6)`;
  const glowSize  = isSelected ? 7 : hazardLevel === 'extreme' ? 9 : hazardLevel === 'high' ? 7 : 4;
  return (
    <svg
      width={size} height={Math.round(size * 1.35)} viewBox="0 0 80 108" fill="none"
      style={{ filter: `drop-shadow(0 0 ${glowSize}px ${glowColor})`, transition: 'filter 0.3s' }}
    >
      {/* Stopper */}
      <rect x="27" y="2" width="26" height="7" rx="3.5" fill="#8badc0" opacity="0.9" />
      {/* Neck */}
      <rect x="30" y="8" width="20" height="28" rx="2"
        fill="rgba(180,225,245,0.4)" stroke="rgba(130,190,215,0.65)" strokeWidth="1.2" />
      {/* Body shell */}
      <path d="M30 36 L10 82 Q8 100 40 101 Q72 100 70 82 L50 36 Z"
        fill="rgba(180,225,245,0.22)" stroke="rgba(130,190,215,0.65)" strokeWidth="1.2" />
      {/* Liquid */}
      <path d="M13 84 Q10 100 40 101 Q70 100 67 84 L50 60 L30 60 Z"
        fill={bodyColor} opacity="0.87" />
      {/* Hazard tint overlay on liquid for high/extreme */}
      {(hazardLevel === 'extreme' || hazardLevel === 'high') && (
        <path d="M13 84 Q10 100 40 101 Q70 100 67 84 L50 60 L30 60 Z"
          fill={hz.color} opacity="0.18" />
      )}
      {/* Shimmer */}
      <ellipse cx="22" cy="80" rx="5" ry="2.5"
        fill="white" opacity="0.25" transform="rotate(-25 22 80)" />
    </svg>
  );
}

// Beaker SVG used in mixing animation
function BeakerSVG({ fillColor, size = 80 }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 80 100" fill="none">
      <path d="M8 8 L8 80 Q8 94 40 94 Q72 94 72 80 L72 8 Z"
        fill="rgba(180,225,245,0.15)" stroke="rgba(130,190,215,0.5)" strokeWidth="1.5" />
      <rect x="8" y="5" width="64" height="6" rx="1.5"
        fill="rgba(180,225,245,0.28)" stroke="rgba(130,190,215,0.5)" strokeWidth="1" />
      <path d="M72 12 Q82 10 80 6 L72 8 Z" fill="rgba(130,190,215,0.5)" />
      {fillColor && (
        <path d="M10 82 Q10 92 40 93 Q70 92 70 82 L70 35 L10 35 Z"
          fill={fillColor} opacity="0.82"
          style={{ animation: 'beakerFill 2s ease-out 0.5s both', transformOrigin: 'bottom center' }} />
      )}
      <ellipse cx="22" cy="72" rx="5" ry="2"
        fill="white" opacity="0.2" transform="rotate(-20 22 72)" />
    </svg>
  );
}

// ── SELECT STAGE ──────────────────────────────────────────────────────────────
function SelectStage({ chemicals, selected, onSelect, onRun }) {
  const ready      = selected.length === 2;
  const selChems   = selected.map(id => chemicals.find(c => String(c.id) === id)).filter(Boolean);
  const selLevels  = selChems.map(c => getHazardLevel(c.hazard));
  const comboHazard = worstHazard(selLevels);
  const showWarning = ready && (comboHazard === 'extreme' || comboHazard === 'high');
  const comboHz    = HAZARD[comboHazard];

  // Run button color escalates with danger
  const runColor =
    ready && comboHazard === 'extreme' ? '#ff3535' :
    ready && comboHazard === 'high'    ? '#FF8C00' :
    ready                              ? '#00D4FF' :
    null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Instruction bar */}
      <div style={{
        padding: '8px 18px', textAlign: 'center',
        fontFamily: 'monospace', fontSize: '0.72rem', letterSpacing: '0.12em',
        color: '#00D4FF', opacity: 0.75, textTransform: 'uppercase',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,212,255,0.03)',
      }}>
        Select 2 chemicals to react &nbsp;·&nbsp; {selected.length} / 2 chosen
      </div>

      {/* Flask grid */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 14px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))',
        gap: 10, alignContent: 'start',
      }}>
        {chemicals.map(chem => {
          const sel          = selected.includes(String(chem.id));
          const liqColor     = chem.liquid_color || chem.solid_color || '#88ccff';
          const hazardLevel  = getHazardLevel(chem.hazard);
          const hz           = HAZARD[hazardLevel];

          return (
            <button
              key={chem.id}
              onClick={() => onSelect(String(chem.id))}
              style={{
                background: sel
                  ? 'rgba(0,212,255,0.1)'
                  : `rgba(${hz.rgb},0.05)`,
                border: `1.5px solid ${sel ? 'rgba(0,212,255,0.75)' : hz.color + '50'}`,
                borderRadius: 8,
                padding: '10px 6px 8px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 5,
                position: 'relative',
                transition: 'transform 0.12s, border-color 0.2s',
                animation: hz.anim && !sel
                  ? `${hz.anim} ${hz.speed} ease-in-out infinite`
                  : sel ? 'selectedPulse 1.6s ease-in-out infinite' : 'none',
              }}
            >
              {/* ── Hazard badge top-left ── */}
              <div style={{
                position: 'absolute', top: 4, left: 4,
                display: 'flex', alignItems: 'center', gap: 2,
                background: `rgba(${hz.rgb},0.18)`,
                border: `1px solid rgba(${hz.rgb},0.45)`,
                borderRadius: 3, padding: '1px 5px',
              }}>
                <span style={{ fontSize: '0.52rem', lineHeight: 1 }}>{hz.icon}</span>
                <span style={{
                  fontFamily: 'monospace', fontSize: '0.44rem',
                  color: hz.color, letterSpacing: '0.07em', fontWeight: 'bold',
                }}>
                  {hz.label}
                </span>
              </div>

              {/* ── Selection number badge top-right ── */}
              {sel && (
                <div style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 17, height: 17, borderRadius: '50%',
                  background: '#00D4FF', color: '#000810',
                  fontFamily: 'monospace', fontSize: '0.62rem', fontWeight: 'bold',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 8px rgba(0,212,255,0.7)',
                }}>
                  {selected.indexOf(String(chem.id)) + 1}
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <FlaskSVG bodyColor={liqColor} size={48} isSelected={sel} hazardLevel={hazardLevel} />
              </div>

              <div style={{
                fontFamily: 'monospace', fontSize: '0.63rem',
                color: sel ? '#72f3ff' : '#b0c4d8',
                textAlign: 'center', lineHeight: 1.3, letterSpacing: '0.02em',
              }}>
                {chem.name}
              </div>
              <div style={{
                fontFamily: 'monospace', fontSize: '0.6rem',
                color: sel ? '#00D4FF' : hz.color,
                opacity: sel ? 1 : 0.8, fontWeight: sel ? 'bold' : 'normal',
              }}>
                {chem.formula}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Combined hazard warning banner ── */}
      {showWarning && (
        <div style={{
          margin: '0 14px 0',
          padding: '8px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          background: `rgba(${comboHz.rgb},0.1)`,
          border: `1px solid rgba(${comboHz.rgb},0.4)`,
          borderRadius: 6,
          animation: `combinedWarn 1s ease-in-out infinite`,
        }}>
          <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{comboHz.icon}</span>
          <div>
            <div style={{
              fontFamily: 'monospace', fontSize: '0.67rem', letterSpacing: '0.12em',
              color: comboHz.color, textTransform: 'uppercase', fontWeight: 'bold',
            }}>
              {comboHazard === 'extreme' ? 'Extreme Hazard Combination' : 'High Risk Combination'}
            </div>
            <div style={{
              fontFamily: 'monospace', fontSize: '0.61rem', color: '#ffffff55', marginTop: 2,
            }}>
              {comboHazard === 'extreme'
                ? 'This reaction is highly dangerous — use protective equipment'
                : 'Handle with care — ensure ventilation and eye protection'}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm / run bar ── */}
      <div style={{
        borderTop: showWarning
          ? `1px solid rgba(${comboHz.rgb},0.35)`
          : '1px solid rgba(255,255,255,0.07)',
        marginTop: showWarning ? 8 : 0,
        padding: '11px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        justifyContent: 'space-between',
        background: showWarning
          ? `rgba(${comboHz.rgb},0.06)`
          : 'rgba(0,0,0,0.28)',
        minHeight: 58,
        transition: 'background 0.3s, border-color 0.3s',
      }}>

        {/* Selected chemical pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' }}>
          {selChems.length === 0 && (
            <span style={{
              fontFamily: 'monospace', fontSize: '0.67rem',
              color: '#ffffff28', letterSpacing: '0.06em',
            }}>
              No chemicals selected
            </span>
          )}
          {selChems.map((c, i) => {
            const lvl = getHazardLevel(c.hazard);
            const hz2 = HAZARD[lvl];
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                {i > 0 && (
                  <span style={{ color: '#FF8C00', fontFamily: 'monospace', fontSize: '1.1rem' }}>+</span>
                )}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: `rgba(${hz2.rgb},0.12)`,
                  border: `1px solid rgba(${hz2.rgb},0.4)`,
                  borderRadius: 4, padding: '4px 10px',
                }}>
                  <span style={{ fontSize: '0.65rem' }}>{hz2.icon}</span>
                  <div style={{
                    width: 9, height: 9, borderRadius: '50%',
                    background: c.liquid_color || c.solid_color || '#88ccff',
                    border: '1px solid rgba(255,255,255,0.25)',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: hz2.color }}>
                    {c.formula}
                  </span>
                </div>
              </div>
            );
          })}
          {selChems.length === 1 && (
            <span style={{ fontFamily: 'monospace', fontSize: '0.67rem', color: '#ffffff44' }}>
              Pick one more…
            </span>
          )}
        </div>

        {/* Run reaction button */}
        <button
          onClick={onRun}
          disabled={!ready}
          style={{
            background: ready ? `rgba(${runColor === '#ff3535' ? '255,53,53' : runColor === '#FF8C00' ? '255,140,0' : '0,212,255'},0.14)` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${ready ? runColor : 'rgba(255,255,255,0.1)'}`,
            color: ready ? runColor : '#ffffff28',
            fontFamily: 'monospace', fontSize: '0.76rem', letterSpacing: '0.1em',
            padding: '10px 20px', cursor: ready ? 'pointer' : 'not-allowed',
            borderRadius: 3, textTransform: 'uppercase', whiteSpace: 'nowrap',
            boxShadow: ready ? `0 0 20px rgba(${runColor === '#ff3535' ? '255,53,53' : runColor === '#FF8C00' ? '255,140,0' : '0,212,255'},0.3)` : 'none',
            transition: 'all 0.25s',
            animation: ready && comboHazard === 'extreme' ? 'runBtnExtreme 0.85s ease-in-out infinite' : 'none',
          }}
        >
          {ready
            ? comboHazard === 'extreme' ? '☠ Run Reaction'
            : comboHazard === 'high'    ? '⚠ Run Reaction'
            :                             '⚗ Run Reaction'
            : '⚗ Run Reaction'}
        </button>
      </div>

      <style>{`
        /* ── Aura pulse keyframes ── */
        @keyframes auraExtreme {
          0%,100% { box-shadow: 0 0 10px 2px rgba(255,53,53,0.4),  inset 0 0 10px rgba(255,53,53,0.08); }
          50%      { box-shadow: 0 0 26px 7px rgba(255,53,53,0.8),  inset 0 0 18px rgba(255,53,53,0.22); }
        }
        @keyframes auraHigh {
          0%,100% { box-shadow: 0 0 9px 2px rgba(255,140,0,0.35),  inset 0 0 8px rgba(255,140,0,0.07); }
          50%      { box-shadow: 0 0 22px 5px rgba(255,140,0,0.65), inset 0 0 14px rgba(255,140,0,0.17); }
        }
        @keyframes auraModerate {
          0%,100% { box-shadow: 0 0 7px 1px rgba(251,191,36,0.25); }
          50%      { box-shadow: 0 0 16px 3px rgba(251,191,36,0.5); }
        }
        @keyframes selectedPulse {
          0%,100% { box-shadow: 0 0 12px 2px rgba(0,212,255,0.35); }
          50%      { box-shadow: 0 0 22px 5px rgba(0,212,255,0.65); }
        }
        @keyframes combinedWarn {
          0%,100% { opacity: 0.85; }
          50%      { opacity: 1; }
        }
        @keyframes runBtnExtreme {
          0%,100% { box-shadow: 0 0 14px rgba(255,53,53,0.35); }
          50%      { box-shadow: 0 0 30px rgba(255,53,53,0.75); transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}

// ── MIXING ANIMATION STAGE ───────────────────────────────────────────────────
function MixingStage({ chemA, chemB }) {
  const colorA       = chemA?.liquid_color || chemA?.solid_color || '#88ccff';
  const colorB       = chemB?.liquid_color || chemB?.solid_color || '#ffaa44';
  const hazA         = getHazardLevel(chemA?.hazard);
  const hazB         = getHazardLevel(chemB?.hazard);
  const combo        = worstHazard([hazA, hazB]);
  const comboHz      = HAZARD[combo];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 18,
    }}>
      <div style={{
        fontFamily: 'monospace', fontSize: '0.72rem', letterSpacing: '0.18em',
        color: comboHz.color, textTransform: 'uppercase', opacity: 0.85,
        animation: combo !== 'safe' ? `combinedWarn 1s ease-in-out infinite` : 'none',
      }}>
        {combo === 'extreme' ? '☠ Dangerous reaction in progress…'
         : combo === 'high'  ? '⚠ Mixing in progress…'
         :                     'Mixing in progress…'}
      </div>

      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 10,
        position: 'relative', height: 155,
      }}>
        <div style={{ animation: 'pourIntoBeakerA 1.4s ease-in-out 0.2s forwards', transformOrigin: 'bottom right' }}>
          <FlaskSVG bodyColor={colorA} size={68} hazardLevel={hazA} />
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <BeakerSVG fillColor={colorA} size={74} />
          <div style={{
            position: 'absolute', bottom: 22, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', gap: 7,
          }}>
            {[0, 0.18, 0.36, 0.54, 0.72].map((d, i) => (
              <div key={i} style={{
                width: 7 - i * 0.5, height: 7 - i * 0.5,
                borderRadius: '50%',
                border: `1px solid rgba(${comboHz.rgb},${0.5 + i * 0.07})`,
                background: `rgba(${comboHz.rgb},${0.1 + i * 0.04})`,
                animation: `bubbleRise 1s ease-out ${0.7 + d}s infinite`,
              }} />
            ))}
          </div>
        </div>
        <div style={{ animation: 'pourIntoBeakerB 1.4s ease-in-out 0.2s forwards', transformOrigin: 'bottom left' }}>
          <FlaskSVG bodyColor={colorB} size={68} hazardLevel={hazB} />
        </div>
      </div>

      <div style={{
        fontFamily: 'monospace', fontSize: '0.72rem', letterSpacing: '0.07em',
        color: '#ffffff44', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: colorA, textShadow: `0 0 8px ${colorA}` }}>{chemA?.formula}</span>
        <span>+</span>
        <span style={{ color: colorB, textShadow: `0 0 8px ${colorB}` }}>{chemB?.formula}</span>
        <span>→</span>
        <span style={{ color: '#ffffff44', fontStyle: 'italic' }}>calculating…</span>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 0.2, 0.4].map((d, i) => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: comboHz.color,
            animation: `dotPulse 0.9s ease-in-out ${d}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes pourIntoBeakerA {
          0%   { transform: rotate(0deg) translate(0, 0); }
          50%  { transform: rotate(55deg) translate(22px, -10px); }
          100% { transform: rotate(50deg) translate(20px, -8px); }
        }
        @keyframes pourIntoBeakerB {
          0%   { transform: rotate(0deg) translate(0, 0); }
          50%  { transform: rotate(-55deg) translate(-22px, -10px); }
          100% { transform: rotate(-50deg) translate(-20px, -8px); }
        }
        @keyframes beakerFill {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }
        @keyframes bubbleRise {
          0%   { transform: translateY(0) scale(1);        opacity: 0.7; }
          60%  { transform: translateY(-18px) scale(1.15); opacity: 1;   }
          100% { transform: translateY(-32px) scale(0.4);  opacity: 0;   }
        }
        @keyframes dotPulse {
          0%,100% { transform: scale(0.7); opacity: 0.4; }
          50%      { transform: scale(1.3); opacity: 1;   }
        }
        @keyframes combinedWarn {
          0%,100% { opacity: 0.8; }
          50%      { opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

// ── RESULT FLASHCARD ──────────────────────────────────────────────────────────
function ReactionBadge({ icon, label, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: `${color}16`, border: `1px solid ${color}44`,
      borderRadius: 4, padding: '3px 9px',
      fontFamily: 'monospace', fontSize: '0.64rem', color,
    }}>
      {icon} {label}
    </span>
  );
}

function ResultFlashcard({ reaction, chemA, chemB, onReset }) {
  const colorA   = chemA?.liquid_color || chemA?.solid_color || '#88ccff';
  const colorB   = chemB?.liquid_color || chemB?.solid_color || '#ffaa44';
  const realWorld = REAL_WORLD[reaction?.type] || [];
  const combo     = worstHazard([getHazardLevel(chemA?.hazard), getHazardLevel(chemB?.hazard)]);
  const comboHz   = HAZARD[combo];

  if (!reaction) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 18, padding: '24px 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.8rem' }}>🚫</div>
        <div style={{ fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '0.1em', color: '#FF8C00', textTransform: 'uppercase' }}>
          No Reaction
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.77rem', color: '#ffffff55', maxWidth: 280, lineHeight: 1.7 }}>
          {chemA?.formula} and {chemB?.formula} do not react under standard laboratory conditions.
        </div>
        <button onClick={onReset} style={secondaryBtn}>← Try different chemicals</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header — tinted by hazard level */}
      <div style={{
        background: combo !== 'safe'
          ? `linear-gradient(135deg, rgba(${comboHz.rgb},0.15), rgba(${comboHz.rgb},0.04))`
          : 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(114,243,255,0.04))',
        borderBottom: `1px solid rgba(${comboHz.rgb},0.22)`,
        padding: '14px 20px',
        animation: 'flashcardIn 0.4s ease-out',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <div style={{
            fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.2em',
            color: comboHz.color, textTransform: 'uppercase', opacity: 0.85,
          }}>
            Reaction Complete ✓
          </div>
          {/* Hazard indicator in result */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: `rgba(${comboHz.rgb},0.15)`, border: `1px solid rgba(${comboHz.rgb},0.4)`,
            borderRadius: 3, padding: '2px 8px',
          }}>
            <span style={{ fontSize: '0.65rem' }}>{comboHz.icon}</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.58rem', color: comboHz.color, letterSpacing: '0.08em' }}>
              {comboHz.label}
            </span>
          </div>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#f0f8ff', letterSpacing: '0.05em' }}>
          {reaction.name}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 13 }}>

        {/* Equation */}
        <div style={{
          background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(0,212,255,0.18)',
          borderRadius: 6, padding: '11px 16px',
          fontFamily: 'monospace', fontSize: '0.88rem', color: '#72f3ff',
          letterSpacing: '0.05em', textAlign: 'center',
        }}>
          {reaction.formula}
        </div>

        {/* Color strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Swatch color={colorA} label={chemA?.formula} />
          <span style={{ fontFamily: 'monospace', color: '#FF8C00', fontSize: '1rem' }}>+</span>
          <Swatch color={colorB} label={chemB?.formula} />
          {reaction.output?.result_color && (
            <>
              <span style={{ fontFamily: 'monospace', color: '#ffffff55' }}>→</span>
              <Swatch color={reaction.output.result_color} label="product" />
            </>
          )}
        </div>

        {/* Observation */}
        {reaction.output?.observation && (
          <Section label="Observation" accent="#FF8C00">
            {reaction.output.observation}
          </Section>
        )}

        {/* Phenomena badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {reaction.output?.gas_produced  && <ReactionBadge icon="💨" label={`${reaction.output.gas_name || 'Gas'} produced`} color="#00D4FF" />}
          {reaction.output?.heat_released && <ReactionBadge icon="🔥" label="Exothermic"    color="#FF8C00" />}
          {reaction.output?.precipitate   && <ReactionBadge icon="⬇"  label="Precipitate"   color="#a78bfa" />}
          {reaction.output?.color_change  && <ReactionBadge icon="🎨" label="Colour change"  color="#34d399" />}
          {reaction.output?.fumes         && <ReactionBadge icon="🌫" label="Fumes released" color="#f87171" />}
        </div>

        {/* Why this happens */}
        {reaction.educational_note && (
          <Section label="Why this happens" accent="#a78bfa">
            {reaction.educational_note}
          </Section>
        )}

        {/* Reaction type */}
        {reaction.type && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.62rem', color: '#ffffff44', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Type</span>
            <span style={{
              background: 'rgba(52,211,153,0.09)', border: '1px solid rgba(52,211,153,0.25)',
              borderRadius: 4, padding: '2px 10px',
              fontFamily: 'monospace', fontSize: '0.72rem', color: '#34d399', textTransform: 'capitalize',
            }}>
              {reaction.type.replace(/_/g, ' ')}
            </span>
          </div>
        )}

        {/* Real-world uses */}
        {realWorld.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.62rem', color: '#fbbf24', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Real-World Uses
            </div>
            {realWorld.map((use, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.14)',
                borderRadius: 4, padding: '6px 10px',
              }}>
                <span style={{ color: '#fbbf24', fontSize: '0.7rem', flexShrink: 0, marginTop: 1 }}>▸</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#d4c090', lineHeight: 1.5 }}>{use}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.2)' }}>
        <button onClick={onReset} style={secondaryBtn}>← Try Another Reaction</button>
      </div>

      <style>{`
        @keyframes flashcardIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Swatch({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 14, height: 14, borderRadius: 3, background: color, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
      <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#c8d8e8' }}>{label}</span>
    </div>
  );
}

function Section({ label, accent, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ fontFamily: 'monospace', fontSize: '0.62rem', letterSpacing: '0.15em', color: accent, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'monospace', fontSize: '0.75rem', color: '#c0d0e0', lineHeight: 1.65,
        background: `${accent}08`, border: `1px solid ${accent}1a`, borderRadius: 4, padding: '8px 12px',
      }}>
        {children}
      </div>
    </div>
  );
}

const secondaryBtn = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)',
  color: '#c8d8e8', fontFamily: 'monospace', fontSize: '0.74rem',
  letterSpacing: '0.08em', padding: '9px 20px', cursor: 'pointer',
  borderRadius: 3, width: '100%', transition: 'background 0.15s',
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function ChemicalBench({ benchId, benchName, onExit }) {
  const deskId = ZONE_TO_DESK[benchId] || 'desk_1';

  const [desk,     setDesk]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState(null);
  const [stage,    setStage]    = useState('select');
  const [selected, setSelected] = useState([]);
  const [reaction, setReaction] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setLoading(true); setFetchErr(null); setDesk(null);
    setStage('select'); setSelected([]); setReaction(null);
    apiClient.get(`/api/desks/${deskId}`)
      .then(r  => setDesk(r.data))
      .catch(() => setFetchErr('Could not load chemicals — is the server running?'))
      .finally(() => setLoading(false));
    return () => clearTimeout(timerRef.current);
  }, [deskId]);

  function handleSelect(id) {
    if (stage !== 'select') return;
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) :
      prev.length >= 2  ? [prev[1], id] :
                          [...prev, id]
    );
  }

  async function handleRun() {
    if (selected.length < 2) return;
    setStage('mixing');
    try {
      const res = await apiClient.post(`/api/desks/${deskId}/lookup`, { reactants: selected });
      const rxn = res.data.found ? res.data.reaction : null;
      timerRef.current = setTimeout(() => { setReaction(rxn); setStage('result'); }, 2800);
    } catch {
      timerRef.current = setTimeout(() => { setReaction(null); setStage('result'); }, 2800);
    }
  }

  function reset() { setSelected([]); setStage('select'); setReaction(null); }

  const chemicals = desk?.chemicals || [];
  const selChems  = selected.map(id => chemicals.find(c => String(c.id) === id)).filter(Boolean);

  // Panel border color escalates with hazard when in select mode
  const selLevels    = selChems.map(c => getHazardLevel(c.hazard));
  const panelHazard  = stage === 'select' ? worstHazard(selLevels) : 'safe';
  const panelHz      = HAZARD[panelHazard];
  const panelBorder  = panelHazard !== 'safe'
    ? `rgba(${panelHz.rgb},0.55)`
    : 'rgba(0,212,255,0.22)';
  const panelGlow    = panelHazard !== 'safe'
    ? `0 0 60px rgba(${panelHz.rgb},0.2), 0 24px 80px rgba(0,0,0,0.65)`
    : '0 0 60px rgba(0,212,255,0.1), 0 24px 80px rgba(0,0,0,0.65)';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 22,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        pointerEvents: 'auto',
        width: 'min(94vw, 700px)',
        height: 'min(90vh, 640px)',
        background: 'linear-gradient(160deg, rgba(18,22,38,0.97) 0%, rgba(10,13,26,0.97) 100%)',
        border: `1px solid ${panelBorder}`,
        borderRadius: 10,
        boxShadow: panelGlow,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'panelSlideIn 0.3s cubic-bezier(0.16,1,0.3,1)',
        transition: 'border-color 0.4s, box-shadow 0.4s',
      }}>

        {/* Panel header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.28)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: panelHazard !== 'safe' ? panelHz.color : '#00D4FF',
              boxShadow: `0 0 9px ${panelHazard !== 'safe' ? panelHz.color : '#00D4FF'}`,
              transition: 'background 0.4s, box-shadow 0.4s',
            }} />
            <span style={{
              fontFamily: 'monospace', fontSize: '0.82rem', letterSpacing: '0.14em',
              color: '#72f3ff', textTransform: 'uppercase',
            }}>
              {benchName} Bench
            </span>
            {stage !== 'select' && (
              <span style={{ fontFamily: 'monospace', fontSize: '0.62rem', color: '#ffffff33', textTransform: 'uppercase' }}>
                / {stage === 'mixing' ? 'Mixing' : 'Result'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            {stage !== 'select' && (
              <button onClick={reset} style={headerBtn('#00D4FF')}>Reset</button>
            )}
            <button onClick={onExit} style={headerBtn('#FF8C00')}>✕ Exit</button>
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {loading  && <Centred text="Loading chemicals…" />}
          {fetchErr && <Centred text={fetchErr} color="#f87171" />}

          {!loading && !fetchErr && stage === 'select' && (
            <SelectStage chemicals={chemicals} selected={selected} onSelect={handleSelect} onRun={handleRun} />
          )}
          {stage === 'mixing' && (
            <MixingStage chemA={selChems[0]} chemB={selChems[1]} />
          )}
          {stage === 'result' && (
            <ResultFlashcard reaction={reaction} chemA={selChems[0]} chemB={selChems[1]} onReset={reset} />
          )}
        </div>
      </div>

      <style>{`
        @keyframes panelSlideIn {
          from { opacity: 0; transform: translateY(22px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}

function Centred({ text, color = '#c8d8e8' }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace', fontSize: '0.8rem', color, opacity: 0.7,
    }}>
      {text}
    </div>
  );
}

function headerBtn(accent) {
  return {
    background: `rgba(${accent === '#FF8C00' ? '255,140,0' : '0,212,255'},0.08)`,
    border: `1px solid ${accent}55`, color: accent,
    fontFamily: 'monospace', fontSize: '0.72rem', letterSpacing: '0.08em',
    padding: '6px 14px', cursor: 'pointer', borderRadius: 3, transition: 'background 0.15s',
  };
}
