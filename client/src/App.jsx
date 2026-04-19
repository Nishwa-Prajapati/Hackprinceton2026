import { useEffect, useRef, useState } from 'react';
import { LabEngine } from './lab/LabEngine';
import { labState } from './lab/LabState';
import useAIAssistant from './ai/AIAssistant';
import EntryScreen from './components/EntryScreen';
import QuizPanel from './components/QuizPanel';

const BADGE_NAMES = {
  acidBase: 'Acid-Base Master',
  combustion: 'Combustion Expert',
  synthesis: 'Synthesis Specialist',
  electrochemistry: 'Electrochemistry Pro',
};

function loadBadges() {
  try { return JSON.parse(localStorage.getItem('labzero_badges') ?? '{}'); } catch { return {}; }
}
function saveBadge(deskKey, name, reactionName) {
  const badges = loadBadges();
  badges[deskKey] = { name, reactionName, earnedAt: new Date().toISOString() };
  localStorage.setItem('labzero_badges', JSON.stringify(badges));
}
import periodicTablePopup from './assets/periodic-table-popup.png';
import { DESK_DATA, findDeskReaction, getDeskApparatus, getDeskData } from './data/desks/index';

const UI_EDGE = 'max(20px, env(safe-area-inset-left), env(safe-area-inset-right))';
const UI_TOP = 'max(20px, env(safe-area-inset-top))';
const UI_BOTTOM = 'max(20px, env(safe-area-inset-bottom))';
const UI_FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const MONO_FONT = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace';

const PANEL_SIDE_BY_DESK = {
  acidBase: 'left',
  combustion: 'right',
  synthesis: 'left',
  electrochemistry: 'right',
};

const DESK_THEME = {
  acidBase: { accent: '#00D4FF', label: 'Acid-Base', scene: 'solution' },
  combustion: { accent: '#FF8C00', label: 'Combustion', scene: 'combustion' },
  synthesis: { accent: '#76f1d2', label: 'Synthesis', scene: 'solution' },
  electrochemistry: { accent: '#6dd6ff', label: 'Electrochemistry', scene: 'electrochemistry' },
};

function getDeskTheme(deskKey) {
  return DESK_THEME[deskKey] ?? { accent: '#00D4FF', label: 'Experiment', scene: 'solution' };
}

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

function getReactionColors(reaction, chemicals, deskKey) {
  const output = reaction?.output ?? {};
  if (deskKey === 'electrochemistry') {
    return {
      initial: output.solution_initial_color ?? output.solution_color ?? getChemicalVisualColor(chemicals[0]),
      result: output.solution_result_color ?? output.result_color ?? getChemicalVisualColor(chemicals[1]) ?? '#ffffff',
    };
  }

  return {
    initial: output.initial_color ?? getChemicalVisualColor(chemicals[0]),
    result: output.result_color ?? getChemicalVisualColor(chemicals[1]) ?? '#ffffff',
  };
}

function buildPromptExamples(deskKey) {
  const chemicals = DESK_DATA[deskKey]?.chemicals ?? [];
  if (chemicals.length < 2) return [];
  const [a, b] = chemicals;
  return [
    `${a.formula} + ${b.formula}`,
    `${a.id} + ${b.id}`,
    `${a.name}`,
  ];
}

function getReactionUnavailableMessage(deskKey, reaction) {
  return reaction?.output?.observation ?? `This reaction is not possible on the ${getDeskTheme(deskKey).label} desk.`;
}

function getOutputTags(output = {}) {
  const tags = [
    output.gas_produced && `${output.gas_name ?? output.gas ?? 'Gas'}${output.gas_formula ? ` (${output.gas_formula})` : ''}`,
    output.fumes && (output.fume_name ?? 'Visible fumes'),
    output.smoke_produced && (output.smoke_name ?? 'Smoke produced'),
    output.precipitate && (output.precipitate_name ?? 'Precipitate formed'),
    output.residue_produced && (output.residue_name ?? 'Residue produced'),
    output.ash_residue && (output.ash_name ?? 'Ash residue'),
    output.heat_released && 'Heat released',
    output.light_produced && 'Light produced',
    output.flame_color && 'Flame visible',
    output.conducts_electricity && 'Current flows',
    output.bulb_brightness && `Bulb: ${String(output.bulb_brightness).replace(/_/g, ' ')}`,
    output.cathode_product && `Cathode: ${output.cathode_product}`,
    output.anode_product && `Anode: ${output.anode_product}`,
    typeof output.result_pH === 'number' && `pH ${output.result_pH}`,
    output.color_change && 'Colour change',
    output.magnetic_change && 'Magnetic change',
  ];

  return tags.filter(Boolean);
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
        <rect x="24" y="62" width="52" height="8" rx="4" fill="rgba(215,223,232,0.88)" />
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
    stirring_rod: <path {...shared} d="M22 68L76 24" />,
    delivery_tube: <path {...shared} d="M22 42c12 0 16-16 30-16s18 18 26 18" />,
    litmus_paper: (
      <>
        <rect x="30" y="26" width="10" height="42" rx="4" fill="rgba(228,85,126,0.82)" />
        <rect x="45" y="22" width="10" height="46" rx="4" fill="rgba(131,118,236,0.86)" />
        <rect x="60" y="28" width="10" height="40" rx="4" fill="rgba(228,85,126,0.82)" />
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
    bunsen_burner: (
      <>
        <rect x="42" y="30" width="16" height="34" rx="8" fill="rgba(232,238,247,0.88)" />
        <rect x="34" y="62" width="32" height="8" rx="4" fill="rgba(170,180,194,0.92)" />
        <path d="M50 18c8 8 6 16 0 22-6-6-8-14 0-22z" fill={accent} opacity="0.82" />
      </>
    ),
    deflagrating_spoon: (
      <>
        <path {...shared} d="M22 60h36" />
        <circle cx="68" cy="60" r="10" stroke="rgba(229,240,255,0.92)" strokeWidth="3" fill="rgba(255,255,255,0.08)" />
      </>
    ),
    gas_jar: (
      <>
        <path {...shared} d="M34 24h32v46a8 8 0 0 1-8 8H42a8 8 0 0 1-8-8z" />
        <path {...shared} d="M34 24h32" />
      </>
    ),
    crucible: (
      <>
        <path {...shared} d="M34 38h32l-4 24H38z" />
        <ellipse cx="50" cy="34" rx="18" ry="6" fill="rgba(255,255,255,0.12)" stroke="rgba(229,240,255,0.92)" strokeWidth="3" />
      </>
    ),
    boiling_tube: (
      <>
        <path {...shared} d="M34 30h32" />
        <path {...shared} d="M40 30v34a10 10 0 0 0 20 0V30" />
      </>
    ),
    crucible_tongs: (
      <>
        <path {...shared} d="M28 66l22-24" />
        <path {...shared} d="M72 66L50 42" />
      </>
    ),
    tongs: (
      <>
        <path {...shared} d="M28 66l22-24" />
        <path {...shared} d="M72 66L50 42" />
      </>
    ),
    heatproof_mat: <rect x="24" y="30" width="52" height="40" rx="6" fill="rgba(255, 196, 86, 0.72)" stroke="rgba(229,240,255,0.92)" strokeWidth="3" />,
    combustion_tube: <path {...shared} d="M24 50h52" />,
    tripod_gauze: (
      <>
        <circle cx="50" cy="38" r="12" stroke="rgba(229,240,255,0.92)" strokeWidth="3" fill="none" />
        <path {...shared} d="M40 46L32 70" />
        <path {...shared} d="M50 50v20" />
        <path {...shared} d="M60 46l8 24" />
      </>
    ),
    wooden_splint: <path {...shared} d="M24 62L76 38" />,
    safety_screen: (
      <>
        <rect x="28" y="24" width="44" height="36" rx="4" fill="rgba(152,232,255,0.2)" stroke="rgba(229,240,255,0.92)" strokeWidth="3" />
        <rect x="24" y="62" width="52" height="8" rx="4" fill="rgba(184,192,204,0.9)" />
      </>
    ),
    magnet: (
      <>
        <path d="M32 66V38c0-8 6-14 14-14s14 6 14 14v28" fill="none" stroke="rgba(229,240,255,0.92)" strokeWidth="12" strokeLinecap="round" />
        <rect x="26" y="58" width="12" height="16" rx="4" fill="#ef6666" />
        <rect x="62" y="58" width="12" height="16" rx="4" fill="#6aa8ff" />
      </>
    ),
    thermometer: (
      <>
        <path {...shared} d="M48 24v36" />
        <circle cx="50" cy="68" r="10" fill="rgba(255,95,95,0.82)" />
        <rect x="47" y="28" width="6" height="32" rx="3" fill="rgba(255,95,95,0.82)" />
      </>
    ),
    electrolysis_cell: (
      <>
        <path {...shared} d="M28 32h44v38a8 8 0 0 1-8 8H36a8 8 0 0 1-8-8z" />
        <rect x="33" y="50" width="34" height="18" rx="8" fill={accent} opacity="0.55" />
        <rect x="40" y="28" width="4" height="30" rx="2" fill="rgba(240,245,250,0.88)" />
        <rect x="56" y="28" width="4" height="30" rx="2" fill="rgba(240,245,250,0.88)" />
      </>
    ),
    dc_power_supply: (
      <>
        <rect x="24" y="28" width="52" height="40" rx="8" fill="rgba(226,234,245,0.86)" />
        <rect x="34" y="36" width="16" height="10" rx="4" fill={accent} opacity="0.6" />
        <circle cx="60" cy="50" r="5" fill="#ef6666" />
        <circle cx="70" cy="50" r="5" fill="#666" />
      </>
    ),
    wires_clips: (
      <>
        <path d="M24 56c10-16 20-18 32-6" fill="none" stroke="#ef6666" strokeWidth="4" strokeLinecap="round" />
        <path d="M76 42c-10 14-18 18-30 10" fill="none" stroke="#6aa8ff" strokeWidth="4" strokeLinecap="round" />
      </>
    ),
    ammeter: (
      <>
        <circle cx="50" cy="50" r="22" fill="rgba(233,239,248,0.88)" />
        <path {...shared} d="M36 58c8-18 20-18 28 0" />
        <path {...shared} d="M50 50l10-6" />
      </>
    ),
    voltmeter: (
      <>
        <circle cx="50" cy="50" r="22" fill="rgba(233,239,248,0.88)" />
        <path {...shared} d="M38 40l12 20 12-20" />
      </>
    ),
    graphite_electrodes: (
      <>
        <rect x="38" y="26" width="8" height="44" rx="4" fill="rgba(66,66,66,0.95)" />
        <rect x="54" y="26" width="8" height="44" rx="4" fill="rgba(66,66,66,0.95)" />
      </>
    ),
    inverted_tubes: (
      <>
        <path {...shared} d="M34 30h12v30a6 6 0 0 1-12 0z" />
        <path {...shared} d="M54 30h12v30a6 6 0 0 1-12 0z" />
      </>
    ),
    glowing_splint: <path d="M24 62L76 38" fill="none" stroke="#f5f0c0" strokeWidth="4" strokeLinecap="round" />,
    burning_splint: (
      <>
        <path d="M24 62L76 38" fill="none" stroke="#f1d4a0" strokeWidth="4" strokeLinecap="round" />
        <path d="M78 32c6 6 4 12 0 16-4-4-6-10 0-16z" fill="#ffb35d" />
      </>
    ),
    bulb_circuit: (
      <>
        <circle cx="50" cy="44" r="14" fill="rgba(255,237,144,0.82)" />
        <path {...shared} d="M42 58h16" />
        <path {...shared} d="M36 68h28" />
      </>
    ),
    cylinder_balance: (
      <>
        <rect x="24" y="58" width="28" height="12" rx="4" fill="rgba(220,228,238,0.88)" />
        <path {...shared} d="M64 26h10v34a6 6 0 0 1-6 6 6 6 0 0 1-4-6z" />
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

function ApparatusMiniCard({ tool, accent }) {
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
      <ApparatusArt icon={tool.icon} accent={accent} />
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

function GenericReactionScene({ experiment }) {
  const { deskKey, reaction, chemicals } = experiment;
  const theme = getDeskTheme(deskKey);
  const colors = getReactionColors(reaction, chemicals, deskKey);
  const output = reaction.output ?? {};
  const resultHeight = output.precipitate || output.residue_produced || output.ash_residue ? '44%' : '52%';
  const hasGas = output.gas_produced || output.bubbles || output.bubbles_at_anode || output.bubbles_at_cathode;
  const showFumes = output.fumes || output.smoke_produced;
  const flameColor = output.flame_color ?? (output.light_produced ? '#ffd36b' : null);
  const hasHeat = output.heat_released || output.heat_needed;
  const heatColor = flameColor ?? '#ffb25a';

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

  const renderCombustionCore = () => (
    <div style={{ position: 'relative', minHeight: '380px' }}>
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '38px',
        transform: 'translateX(-50%)',
        width: '170px',
        height: '170px',
        borderRadius: '50%',
        border: '3px solid rgba(234,245,255,0.82)',
        background: 'radial-gradient(circle at 50% 55%, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
        boxShadow: 'inset 0 0 28px rgba(255,255,255,0.12), 0 0 42px rgba(255,140,0,0.08)',
        overflow: 'hidden',
      }}>
        {(hasHeat || flameColor) && (
          <div style={{
            position: 'absolute',
            left: '50%',
            bottom: '18px',
            width: '116px',
            height: '116px',
            transform: 'translateX(-50%)',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${heatColor}66 0%, ${heatColor}22 52%, transparent 74%)`,
            filter: 'blur(8px)',
            opacity: 0.92,
            animation: 'heatAura 1.5s ease-in-out infinite',
          }} />
        )}
        {flameColor && (
          <div style={{
            position: 'absolute',
            left: '50%',
            bottom: '24px',
            width: '72px',
            height: '104px',
            transform: 'translateX(-50%)',
            background: `radial-gradient(circle at 50% 72%, ${flameColor}, rgba(255,180,65,0.4) 60%, transparent 82%)`,
            clipPath: 'polygon(50% 0%, 65% 18%, 82% 40%, 74% 72%, 50% 100%, 26% 72%, 18% 40%, 35% 18%)',
            opacity: 0.9,
            animation: 'flameDance 1.2s ease-in-out infinite',
          }} />
        )}
        {hasHeat && Array.from({ length: 5 }).map((_, index) => (
          <span
            key={`combustion-heat-${index}`}
            style={{
              position: 'absolute',
              left: `${58 + index * 12}px`,
              bottom: `${74 + (index % 2) * 8}px`,
              width: '3px',
              height: `${62 + index * 8}px`,
              borderRadius: '999px',
              background: `linear-gradient(180deg, transparent 0%, ${heatColor}66 36%, rgba(255,255,255,0.08) 100%)`,
              animation: `heatRibbon 1.6s ease-in-out ${index * 0.12}s infinite`,
            }}
          />
        ))}
        {showFumes && Array.from({ length: 6 }).map((_, index) => (
          <span
            key={`smoke-${index}`}
            style={{
              position: 'absolute',
              left: `${34 + index * 16}px`,
              top: `${14 + (index % 2) * 10}px`,
              width: `${24 + index * 4}px`,
              height: `${24 + index * 4}px`,
              borderRadius: '50%',
              background: output.smoke_color ?? output.fume_color ?? 'rgba(240,240,240,0.75)',
              filter: 'blur(12px)',
              opacity: 0.4,
              animation: `fumeDrift 2.2s ease-in-out ${index * 0.16}s infinite`,
            }}
          />
        ))}
        {(output.ash_residue || output.residue_produced || output.precipitate) && (
          <div style={{
            position: 'absolute',
            left: '34px',
            right: '34px',
            bottom: '16px',
            height: '24px',
            borderRadius: '18px',
            background: output.ash_color ?? output.residue_color ?? output.precipitate_color ?? '#cfcfcf',
            opacity: 0.82,
            animation: 'precipitateSettle 2.2s ease forwards',
          }} />
        )}
      </div>
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '222px',
        transform: 'translateX(-50%)',
        width: '110px',
        height: '10px',
        borderRadius: '999px',
        background: 'rgba(0,0,0,0.32)',
        filter: 'blur(2px)',
      }} />
    </div>
  );

  const renderElectrochemistryCore = () => (
    <div style={{ position: 'relative', minHeight: '380px' }}>
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '34px',
        transform: 'translateX(-50%)',
        width: '280px',
        height: '320px',
      }}>
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '0',
          transform: 'translateX(-50%)',
          width: '164px',
          height: '74px',
          borderRadius: '18px',
          background: 'rgba(231,238,247,0.88)',
          boxShadow: '0 10px 28px rgba(0,0,0,0.14)',
        }}>
          <div style={{
            position: 'absolute',
            left: '20px',
            top: '18px',
            width: '46px',
            height: '18px',
            borderRadius: '8px',
            background: theme.accent,
            opacity: output.conducts_electricity ? 0.92 : 0.65,
            boxShadow: output.conducts_electricity ? `0 0 18px ${theme.accent}` : 'none',
            animation: output.conducts_electricity ? 'currentPulse 1.4s ease-in-out infinite' : 'none',
          }} />
          <div style={{ position: 'absolute', right: '28px', top: '32px', width: '10px', height: '10px', borderRadius: '50%', background: '#ef6666' }} />
          <div style={{ position: 'absolute', right: '12px', top: '32px', width: '10px', height: '10px', borderRadius: '50%', background: '#666' }} />
        </div>
        {output.conducts_electricity && (
          <>
            <div style={{
              position: 'absolute',
              left: '104px',
              top: '70px',
              width: '4px',
              height: '34px',
              borderRadius: '999px',
              background: `linear-gradient(180deg, ${theme.accent}, transparent)`,
              boxShadow: `0 0 12px ${theme.accent}`,
              animation: 'currentFlow 1.2s linear infinite',
            }} />
            <div style={{
              position: 'absolute',
              right: '104px',
              top: '70px',
              width: '4px',
              height: '34px',
              borderRadius: '999px',
              background: `linear-gradient(180deg, ${theme.accent}, transparent)`,
              boxShadow: `0 0 12px ${theme.accent}`,
              animation: 'currentFlow 1.2s linear 0.2s infinite',
            }} />
          </>
        )}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '96px',
          transform: 'translateX(-50%)',
          width: '210px',
          height: '180px',
          border: '4px solid rgba(234,245,255,0.9)',
          borderTopLeftRadius: '34px',
          borderTopRightRadius: '34px',
          borderBottomLeftRadius: '56px',
          borderBottomRightRadius: '56px',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))',
        }}>
          <div style={{
            position: 'absolute',
            left: '18px',
            right: '18px',
            bottom: '16px',
            height: '54%',
            borderRadius: '28px 28px 40px 40px',
            background: colors.initial,
            opacity: output.solution_color_change ? 0.34 : 0.78,
          }} />
          <div style={{
            position: 'absolute',
            left: '18px',
            right: '18px',
            bottom: '16px',
            height: '54%',
            borderRadius: '28px 28px 40px 40px',
            background: colors.result,
            opacity: 0.9,
            animation: output.solution_color_change || output.color_change ? 'resultBlend 2.6s ease forwards' : 'liquidPulse 2.2s ease-in-out infinite',
          }} />
          <div style={{ position: 'absolute', left: '64px', top: '14px', width: '8px', height: '134px', borderRadius: '4px', background: '#262c34' }} />
          <div style={{ position: 'absolute', right: '64px', top: '14px', width: '8px', height: '134px', borderRadius: '4px', background: '#262c34' }} />
          {output.cathode_product && (
            <div style={{
              position: 'absolute',
              left: '60px',
              top: '56px',
              width: '16px',
              height: '74px',
              borderRadius: '10px',
              background: output.cathode_result_color ?? output.precipitate_color ?? '#b87333',
              opacity: 0.44,
              filter: 'blur(0.4px)',
            }} />
          )}
          {output.anode_color_change && (
            <div style={{
              position: 'absolute',
              right: '60px',
              top: '58px',
              width: '16px',
              height: '68px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.16)',
              opacity: 0.46,
            }} />
          )}
          {(output.bubbles || output.bubbles_at_anode) && Array.from({ length: 5 }).map((_, index) => (
            <span key={`anode-bubble-${index}`} style={{
              position: 'absolute',
              right: `${60 + (index % 2) * 10}px`,
              bottom: `${48 + index * 16}px`,
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.28)',
              border: '1px solid rgba(255,255,255,0.5)',
              animation: `bubbleRise 1.6s ease-in ${index * 0.1}s infinite`,
            }} />
          ))}
          {(output.bubbles || output.bubbles_at_cathode) && Array.from({ length: 5 }).map((_, index) => (
            <span key={`cathode-bubble-${index}`} style={{
              position: 'absolute',
              left: `${60 + (index % 2) * 10}px`,
              bottom: `${48 + index * 16}px`,
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.28)',
              border: '1px solid rgba(255,255,255,0.5)',
              animation: `bubbleRise 1.6s ease-in ${index * 0.1}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );

  const renderSolutionCore = () => (
    <div style={{ position: 'relative', minHeight: '380px' }}>
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
        {hasHeat && (
          <>
            <div style={{
              position: 'absolute',
              left: '50%',
              bottom: '68px',
              width: '170px',
              height: '122px',
              transform: 'translateX(-50%)',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${heatColor}44 0%, ${heatColor}16 58%, transparent 74%)`,
              filter: 'blur(10px)',
              opacity: 0.86,
              animation: 'heatAura 1.7s ease-in-out infinite',
            }} />
            {Array.from({ length: 7 }).map((_, index) => (
              <span
                key={`solution-heat-${index}`}
                style={{
                  position: 'absolute',
                  left: `${74 + index * 18}px`,
                  bottom: `${116 + (index % 2) * 8}px`,
                  width: '3px',
                  height: `${72 + (index % 3) * 12}px`,
                  borderRadius: '999px',
                  background: `linear-gradient(180deg, transparent 0%, ${heatColor}5f 36%, rgba(255,255,255,0.08) 100%)`,
                  animation: `heatRibbon 1.7s ease-in-out ${index * 0.1}s infinite`,
                }}
              />
            ))}
          </>
        )}
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

        {(output.precipitate || output.residue_produced || output.ash_residue) && (
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
            background: output.precipitate_color ?? output.residue_color ?? output.ash_color ?? '#d8d8d8',
            opacity: 0.84,
            animation: 'precipitateSettle 2.4s ease forwards',
          }} />
        )}

        {hasGas && Array.from({ length: 8 }).map((_, index) => (
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

        {showFumes && Array.from({ length: 5 }).map((_, index) => (
          <span
            key={`fume-${index}`}
            style={{
              position: 'absolute',
              left: `${52 + index * 30}px`,
              top: `${18 + (index % 2) * 10}px`,
              width: `${28 + index * 7}px`,
              height: `${28 + index * 7}px`,
              borderRadius: '50%',
              background: output.fume_color ?? output.smoke_color ?? 'rgba(245,245,245,0.82)',
              filter: 'blur(12px)',
              opacity: 0.42,
              animation: `fumeDrift 2.2s ease-in-out ${index * 0.2}s infinite`,
            }}
          />
        ))}

        {(output.heat_released || output.light_produced) && (
          <>
            <div style={{
              position: 'absolute',
              inset: '0',
              background: `linear-gradient(180deg, rgba(255,140,0,0.05), ${flameColor ? `${flameColor}55` : 'rgba(255,140,0,0.18)'}, rgba(255,255,255,0.04))`,
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

      {flameColor && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '120px',
          transform: 'translateX(-50%)',
          width: '64px',
          height: '92px',
          background: `radial-gradient(circle at 50% 72%, ${flameColor}, rgba(255,180,65,0.36) 60%, transparent 82%)`,
          clipPath: 'polygon(50% 0%, 66% 20%, 82% 42%, 72% 74%, 50% 100%, 28% 74%, 18% 42%, 34% 20%)',
          opacity: 0.68,
          animation: 'flameDance 1.2s ease-in-out infinite',
        }} />
      )}

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
  );

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

        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 14px',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(234,245,255,0.78)',
            fontFamily: UI_FONT,
            fontSize: '0.9rem',
            whiteSpace: 'nowrap',
            margin: '0 auto 8px',
          }}>
            {deskKey === 'electrochemistry' ? 'Current flowing and reacting' : 'Mixing and reacting'}
          </div>
          {theme.scene === 'combustion' ? renderCombustionCore() : theme.scene === 'electrochemistry' ? renderElectrochemistryCore() : renderSolutionCore()}
        </div>

        {renderBottle(chemicals[1], 'right')}
      </div>
    </div>
  );
}

function ReactionPrompt({
  deskKey,
  reactantA,
  reactantB,
  error,
  onChange,
  onSubmit,
  onDismiss,
  side = 'left',
}) {
  const sideStyle = side === 'left' ? { left: UI_EDGE } : { right: UI_EDGE };
  const desk = getDeskData(deskKey);
  const theme = getDeskTheme(deskKey);
  const examples = buildPromptExamples(deskKey);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 26, pointerEvents: 'none' }}>
      <form
        onSubmit={onSubmit}
        style={{
          position: 'absolute',
          top: 'clamp(104px, 16vh, 132px)',
          width: 'min(350px, calc(100vw - 40px))',
          pointerEvents: 'auto',
          ...sideStyle,
          background: 'linear-gradient(180deg, rgba(17, 22, 32, 0.96) 0%, rgba(11, 15, 24, 0.98) 100%)',
          border: `1px solid ${theme.accent}33`,
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
              color: theme.accent,
              textTransform: 'uppercase',
            }}>
              {theme.label} Input
            </div>
            <div style={{
              marginTop: '6px',
              color: 'rgba(228,238,247,0.8)',
              fontFamily: UI_FONT,
              fontSize: '0.92rem',
              lineHeight: 1.55,
            }}>
              {desk?.desk?.description ?? 'Type any two reactants from the desk by formula, name, or number.'}
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

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {examples.map((example) => (
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
            background: `linear-gradient(90deg, ${theme.accent}33, rgba(255,140,0,0.2))`,
            border: `1px solid ${theme.accent}44`,
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

function ExperimentOverlay({ experiment, onBackToDesk, onTryAnother, speakText }) {
  const { deskKey, deskName, reaction, chemicals, apparatusUsed } = experiment;
  const output = reaction.output ?? {};
  const theme = getDeskTheme(deskKey);
  const outputTags = getOutputTags(output);

  const [quizOpen, setQuizOpen] = useState(false);
  const [earnedBadge, setEarnedBadge] = useState(() => loadBadges()[deskKey] ?? null);
  const [showReExplain, setShowReExplain] = useState(false);

  const badgeName = BADGE_NAMES[deskKey] ?? `${deskName} Expert`;

  const quizContext = {
    desk: deskName,
    reaction: reaction.name,
    formula: reaction.formula ?? reaction.equation ?? '',
    chemicals: chemicals.map((c) => c?.formula ?? c?.name).filter(Boolean),
    output: reaction.output?.primary_product_name ?? reaction.output?.product_name ?? reaction.name,
  };

  function handleScoreResult(score) {
    if (score === 5) {
      saveBadge(deskKey, badgeName, reaction.name);
      setEarnedBadge({ name: badgeName, reactionName: reaction.name, earnedAt: new Date().toISOString() });
      speakText?.(`Outstanding! You've earned the ${badgeName} Badge! You've mastered this reaction. Keep it up!`);
    } else if (score >= 3) {
      speakText?.(`Great effort! You scored ${score} out of 5. Review the questions you missed and try again to earn your badge!`);
    } else {
      setShowReExplain(true);
      speakText?.(`Don't worry — chemistry takes practice! Let's go over the key ideas again before you retry the quiz.`);
    }
  }

  const processWidth = quizOpen ? '58%' : '100%';

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
        width: 'min(96vw, 1280px)',
        maxHeight: '92vh',
        display: 'flex',
        gap: '16px',
        alignItems: 'stretch',
        transition: 'all 0.35s ease',
      }}>
        {/* ── Process Panel ── */}
        <div style={{
          flex: `0 0 ${processWidth}`,
          minWidth: 0,
          overflow: 'auto',
          background: 'linear-gradient(180deg, rgba(16, 21, 31, 0.98) 0%, rgba(10, 14, 22, 0.98) 100%)',
          border: `1px solid ${theme.accent}33`,
          borderRadius: '28px',
          boxShadow: '0 22px 90px rgba(0,0,0,0.52), 0 0 34px rgba(0,212,255,0.08)',
          padding: 'clamp(18px, 3vw, 28px)',
          display: 'grid',
          gap: '18px',
          alignContent: 'start',
          transition: 'flex 0.35s ease',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{
                fontFamily: MONO_FONT,
                fontSize: '0.82rem',
                letterSpacing: '0.14em',
                color: theme.accent,
                textTransform: 'uppercase',
              }}>
                {deskName} Experiment
              </div>
              <div style={{
                marginTop: '8px',
                color: '#f0f6ff',
                fontFamily: UI_FONT,
                fontSize: '1.08rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                {reaction.name}
                {earnedBadge && (
                  <span title={earnedBadge.name} style={{ fontSize: '1.2rem' }}>🏅</span>
                )}
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

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Earn a Badge button */}
              {!quizOpen && (
                <button
                  onClick={() => { setQuizOpen(true); setShowReExplain(false); }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,176,0,0.22), rgba(255,120,0,0.18))',
                    border: '1.5px solid rgba(255,176,0,0.55)',
                    color: '#ffe28a',
                    borderRadius: '14px',
                    padding: '10px 16px',
                    fontFamily: MONO_FONT,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    boxShadow: '0 0 18px rgba(255,160,0,0.25)',
                  }}
                >
                  {earnedBadge ? '🏅 Badge Earned — Retry Quiz' : '🏅 Earn a Badge'}
                </button>
              )}
              {quizOpen && (
                <button
                  onClick={() => setQuizOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#aac4dd',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    fontFamily: MONO_FONT,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                  }}
                >
                  Hide Quiz
                </button>
              )}
              <button
                onClick={onTryAnother}
                style={{
                  background: `${theme.accent}22`,
                  border: `1px solid ${theme.accent}44`,
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

          {/* Re-explain offer */}
          {showReExplain && (
            <div style={{
              padding: '14px 18px',
              borderRadius: '16px',
              background: 'rgba(255,100,80,0.1)',
              border: '1px solid rgba(255,100,80,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap',
            }}>
              <span style={{ color: '#ffb5aa', fontFamily: UI_FONT, fontSize: '0.9rem', flex: 1 }}>
                Let's review the concepts before you retry.
              </span>
              <button
                onClick={() => { setShowReExplain(false); setQuizOpen(true); }}
                style={{
                  background: 'rgba(255,140,0,0.18)',
                  border: '1px solid rgba(255,140,0,0.4)',
                  color: '#ffd49e',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  fontFamily: MONO_FONT,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                }}
              >
                Retry Quiz
              </button>
              <button
                onClick={() => setShowReExplain(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#9db8cc',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  fontFamily: MONO_FONT,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gap: '18px', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(240px, 0.92fr)' }}>
            <div style={{
              padding: '18px',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
            }}>
              <div style={{
                fontFamily: MONO_FONT,
                color: theme.accent,
                fontSize: '0.76rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}>
                Reaction Performance
              </div>
              <GenericReactionScene experiment={experiment} />
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
                  color: theme.accent,
                  fontSize: '0.76rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: '14px',
                }}>
                  Apparatus Used
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                  gap: '12px',
                }}>
                  {apparatusUsed.map((tool) => (
                    <ApparatusMiniCard key={`${tool.id}-${tool.name}`} tool={tool} accent={theme.accent} />
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
                  color: theme.accent,
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
                  color: theme.accent,
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
              color: theme.accent,
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

        {/* ── Quiz Panel (slides in from right) ── */}
        {quizOpen && (
          <div style={{
            flex: '0 0 42%',
            minWidth: 0,
            overflow: 'auto',
            borderRadius: '28px',
            border: '1.5px solid rgba(255,176,0,0.25)',
            boxShadow: '0 16px 60px rgba(0,0,0,0.45), 0 0 28px rgba(255,160,0,0.1)',
            animation: 'quizSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
          }}>
            <style>{`
              @keyframes quizSlideIn {
                from { opacity: 0; transform: translateX(32px); }
                to   { opacity: 1; transform: translateX(0); }
              }
            `}</style>
            <QuizPanel
              context={quizContext}
              badgeName={badgeName}
              onClose={() => setQuizOpen(false)}
              onScoreResult={handleScoreResult}
            />
          </div>
        )}
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
  const guideBubbleTimerRef = useRef(null);
  const assistant = useAIAssistant();

  const [phase, setPhase] = useState('entry');
  const [activeBench, setActiveBench] = useState(null);
  const [periodicOpen, setPeriodicOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [reactionPromptOpen, setReactionPromptOpen] = useState(false);
  const [reactantA, setReactantA] = useState('');
  const [reactantB, setReactantB] = useState('');
  const [reactionError, setReactionError] = useState('');
  const [experimentState, setExperimentState] = useState(null);
  const [guideGreeting, setGuideGreeting] = useState('');

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
      setReactionPromptOpen(Boolean(deskKey));
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
    const offPeriodicOpen = labState.on('periodic:opened', () => setPeriodicOpen(true));
    const offPeriodicClose = labState.on('periodic:closed', () => setPeriodicOpen(false));
    const offGuideWelcome = labState.on('guide:welcome', ({ message }) => {
      const text = message ?? 'Hey, welcome to Lab Zero';
      window.clearTimeout(guideBubbleTimerRef.current);
      setGuideGreeting('');
      assistant.speakText(text);
      guideBubbleTimerRef.current = window.setTimeout(() => {
        setGuideGreeting(text);
      }, 520);
    });
    const offGuideHidden = labState.on('guide:hidden', () => {
      window.clearTimeout(guideBubbleTimerRef.current);
      setGuideGreeting('');
      assistant.stopAll({ preserveContext: true });
    });
    const offReactantSelected = labState.on('bench:reactantSelected', ({ benchId, reactant }) => {
      setActiveBench((currentBench) => {
        if (!currentBench || currentBench.id !== benchId) return currentBench;

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
      offGuideWelcome();
      offGuideHidden();
      offReactantSelected();
      window.clearTimeout(guideBubbleTimerRef.current);
      engine.dispose();
    };
  }, []);

  useEffect(() => {
    const shouldLockUi = periodicOpen || (phase === 'focused' && (reactionPromptOpen || !!experimentState));
    engineRef.current?.setUiLocked(shouldLockUi);

    if (experimentState?.apparatusUsed?.length) {
      engineRef.current?.setExperimentApparatus(experimentState.apparatusUsed.map((tool) => tool.name));
    } else {
      engineRef.current?.clearExperimentApparatus();
    }
  }, [experimentState, periodicOpen, phase, reactionPromptOpen]);

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

  useEffect(() => {
    if (phase === 'focused' && activeBench?.deskKey) {
      assistant.onDeskEnter({
        ...activeBench,
        deskData: getDeskData(activeBench.deskKey),
      });
      return;
    }

    if (phase !== 'focused') {
      assistant.stopAll({ preserveContext: false });
    }
  }, [activeBench, phase]);

  useEffect(() => {
    if (!experimentState) return;

    assistant.onReactionComplete({
      desk: activeBench ?? {
        name: experimentState.deskName,
        deskKey: experimentState.deskKey,
      },
      reaction: experimentState.reaction,
      chemicals: experimentState.chemicals,
    });
  }, [experimentState]);

  useEffect(() => {
    if (periodicOpen) {
      assistant.stopAll({ preserveContext: true });
    }
  }, [periodicOpen]);

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

  function runDeskExperiment(e) {
    e.preventDefault();
    if (!activeBench?.deskKey) return;

    const { reaction, chemicals } = findDeskReaction(activeBench.deskKey, reactantA, reactantB);

    if (!chemicals[0] || !chemicals[1]) {
      setReactionError(`Enter two valid ${getDeskTheme(activeBench.deskKey).label} reactants using the formula, full name, or desk number.`);
      return;
    }

    if (!reaction || reaction.type === 'no_reaction') {
      setReactionError(getReactionUnavailableMessage(activeBench.deskKey, reaction));
      return;
    }

    const apparatusCatalog = getDeskApparatus(activeBench.deskKey);
    const apparatusUsed = (reaction.apparatus_needed ?? [])
      .map((id) => apparatusCatalog.find((tool) => tool.id === id))
      .filter(Boolean);

    setExperimentState({
      deskKey: activeBench.deskKey,
      deskName: activeBench.name,
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

  function reopenReactionPrompt() {
    setExperimentState(null);
    setReactionError('');
    setReactantA('');
    setReactantB('');
    setReactionPromptOpen(true);
  }

  const promptSide = PANEL_SIDE_BY_DESK[activeBench?.deskKey] ?? 'right';
  const benchTheme = getDeskTheme(activeBench?.deskKey);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'block' }}
      />

      {phase === 'entry' && <EntryScreen onEntered={handleGateOpened} />}

      {phase !== 'entry' && !activeBench && guideGreeting && (
        <div
          style={{
            position: 'fixed',
            top: 'clamp(54px, 10vh, 112px)',
            right: 'clamp(18px, 3.5vw, 42px)',
            width: 'min(20.5rem, 27vw)',
            minWidth: '220px',
            maxWidth: 'calc(100vw - 48px)',
            pointerEvents: 'none',
            zIndex: 18,
            animation: 'guideCloudIn 0.52s cubic-bezier(0.22, 1, 0.36, 1) both',
          }}
        >
          <div style={{ position: 'relative', width: '100%', minHeight: 138 }}>
            <svg
              viewBox="0 0 280 150"
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                filter: 'drop-shadow(0 14px 24px rgba(8, 12, 24, 0.16))',
              }}
            >
              <path
                d="M60 122c-25 0-44-16-44-38 0-18 13-33 31-37 4-24 24-42 50-42 17 0 32 8 42 20 8-6 18-10 30-10 27 0 49 18 53 43 18 4 32 19 32 37 0 24-22 41-51 41H60z"
                fill="rgba(255,255,255,0.97)"
                stroke="rgba(199,214,230,0.96)"
                strokeWidth="2.2"
              />
              <path
                d="M72 118c-4 14-14 24-31 29 8-11 9-20 6-31"
                fill="rgba(255,255,255,0.97)"
                stroke="rgba(199,214,230,0.96)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div style={{
              position: 'relative',
              color: '#243243',
              minHeight: 138,
              padding: '20px 26px 30px 34px',
              fontFamily: UI_FONT,
              fontSize: '0.92rem',
              lineHeight: 1.3,
              fontWeight: 600,
              maxWidth: '18rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              margin: '0 auto',
            }}>
              {guideGreeting}
            </div>
          </div>
        </div>
      )}

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

            {activeBench.deskKey ? (
              <button
                onClick={reopenReactionPrompt}
                style={{
                  pointerEvents: 'auto',
                  background: `${benchTheme.accent}22`,
                  border: `1px solid ${benchTheme.accent}55`,
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

      {phase === 'focused' && activeBench?.deskKey && reactionPromptOpen && !experimentState && (
        <ReactionPrompt
          deskKey={activeBench.deskKey}
          reactantA={reactantA}
          reactantB={reactantB}
          error={reactionError}
          onChange={handleReactantInput}
          onSubmit={runDeskExperiment}
          onDismiss={() => {
            setReactionPromptOpen(false);
            setReactionError('');
          }}
          side={promptSide}
        />
      )}

      {phase === 'focused' && experimentState && (
        <ExperimentOverlay
          experiment={experimentState}
          onBackToDesk={closeExperimentToDesk}
          onTryAnother={reopenReactionPrompt}
          speakText={assistant.speakText}
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

      {phase !== 'entry' && (
        <div style={{
          position: 'fixed',
          right: `max(18px, env(safe-area-inset-right))`,
          bottom: `max(18px, env(safe-area-inset-bottom))`,
          zIndex: 42,
          display: 'flex',
          alignItems: 'flex-end',
          gap: '12px',
        }}>
          {!!assistant.statusText && (
            <div style={{
              maxWidth: 'min(24rem, 62vw)',
              background: 'rgba(13, 18, 28, 0.94)',
              border: `1px solid ${assistant.isListening ? '#ff8c00aa' : '#00d4ffaa'}`,
              borderRadius: '18px',
              color: '#eef8ff',
              padding: '11px 14px',
              fontFamily: UI_FONT,
              fontSize: '0.92rem',
              lineHeight: 1.35,
              boxShadow: assistant.isListening
                ? '0 10px 24px rgba(255, 140, 0, 0.22)'
                : '0 10px 24px rgba(0, 212, 255, 0.16)',
            }}>
              {assistant.statusText}
            </div>
          )}

          <button
            type="button"
            onClick={assistant.onMicClick}
            disabled={!assistant.supportsSpeechInput}
            title={assistant.supportsSpeechInput ? 'Ask the AI lab assistant' : 'Voice input is unavailable in this browser'}
            style={{
              width: '62px',
              height: '62px',
              borderRadius: '50%',
              border: assistant.isListening ? '1px solid #ff8c00' : '1px solid #00d4ff',
              background: assistant.isListening
                ? 'radial-gradient(circle at 30% 30%, rgba(255,163,64,0.95), rgba(110,38,0,0.98))'
                : assistant.isSpeaking
                  ? 'radial-gradient(circle at 30% 30%, rgba(131,233,255,0.96), rgba(0,88,112,0.98))'
                  : 'radial-gradient(circle at 30% 30%, rgba(52,63,84,0.96), rgba(12,16,26,0.98))',
              color: '#f4fbff',
              cursor: assistant.supportsSpeechInput ? 'pointer' : 'not-allowed',
              display: 'grid',
              placeItems: 'center',
              boxShadow: assistant.isListening
                ? '0 0 0 10px rgba(255, 140, 0, 0.12), 0 14px 28px rgba(0,0,0,0.28)'
                : assistant.isSpeaking
                  ? '0 0 0 8px rgba(0, 212, 255, 0.12), 0 14px 28px rgba(0,0,0,0.24)'
                  : '0 14px 28px rgba(0,0,0,0.24)',
              opacity: assistant.supportsSpeechInput ? 1 : 0.58,
              animation: assistant.isListening ? 'assistantPulse 1.2s ease-in-out infinite' : 'none',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V6.5a3.5 3.5 0 1 0-7 0V12a3.5 3.5 0 0 0 3.5 3.5Z"
                fill="currentColor"
              />
              <path
                d="M5 11.75a.75.75 0 0 1 1.5 0 5.5 5.5 0 1 0 11 0 .75.75 0 0 1 1.5 0 6.98 6.98 0 0 1-6.25 6.95V21a.75.75 0 0 1-1.5 0v-2.3A6.98 6.98 0 0 1 5 11.75Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      )}

      {assistant.quizContext && (
        <QuizPanel
          context={assistant.quizContext}
          onClose={assistant.clearQuiz}
        />
      )}

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
        @keyframes flameDance {
          0%, 100% { transform: translateX(-50%) scaleY(0.94); opacity: 0.74; }
          50% { transform: translateX(-50%) scaleY(1.08) scaleX(1.04); opacity: 0.96; }
        }
        @keyframes heatAura {
          0%, 100% { transform: translateX(-50%) scale(0.92); opacity: 0.52; }
          50% { transform: translateX(-50%) scale(1.06); opacity: 0.92; }
        }
        @keyframes currentPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        @keyframes currentFlow {
          0% { opacity: 0; transform: scaleY(0.4); transform-origin: top; }
          40% { opacity: 0.9; }
          100% { opacity: 0; transform: translateY(30px) scaleY(1.1); transform-origin: top; }
        }
        @keyframes guideCloudIn {
          0% { opacity: 0; transform: translate3d(18px, 12px, 0) scale(0.9); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes assistantPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </>
  );
}
