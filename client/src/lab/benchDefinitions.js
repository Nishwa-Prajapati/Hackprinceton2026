import * as THREE from 'three';

const DEFAULT_CHEMICALS = [
  { id: 'hcl', name: 'Hydrochloric Acid', formula: 'HCl', bottleColor: '#FFEB99', fillColor: '#FFF9CC' },
  { id: 'naoh', name: 'Sodium Hydroxide', formula: 'NaOH', bottleColor: '#B5EAD7', fillColor: '#D4F5E9' },
  { id: 'h2so4', name: 'Sulfuric Acid', formula: 'H2SO4', bottleColor: '#FFD6A5', fillColor: '#FFF0DC' },
  { id: 'ethanol', name: 'Ethanol', formula: 'C2H5OH', bottleColor: '#E1F5FE', fillColor: '#F0FBFF' },
  { id: 'cuso4', name: 'Copper Sulfate Solution', formula: 'CuSO4', bottleColor: '#1565C0', fillColor: '#64B5F6' },
  { id: 'water', name: 'Water', formula: 'H2O', bottleColor: '#E1F5FE', fillColor: '#F5FBFF' },
  { id: 'ammonia', name: 'Ammonia Solution', formula: 'NH3', bottleColor: '#E0F0FF', fillColor: '#EEF7FF' },
  { id: 'agno3', name: 'Silver Nitrate Solution', formula: 'AgNO3', bottleColor: '#ECEFF1', fillColor: '#F5F7F8' },
  { id: 'nacl', name: 'Sodium Chloride Solution', formula: 'NaCl', bottleColor: '#E3F2FD', fillColor: '#F5FBFF' },
  { id: 'kmno4', name: 'Potassium Permanganate', formula: 'KMnO4', bottleColor: '#D8B4FE', fillColor: '#EDE0FF' },
  { id: 'acetone', name: 'Acetone', formula: 'C3H6O', bottleColor: '#FFFDE7', fillColor: '#FFFFF0' },
  { id: 'fecl3', name: 'Ferric Chloride', formula: 'FeCl3', bottleColor: '#BCAAA4', fillColor: '#D7CCC8' }
];

const DEFAULT_APPARATUS = [
  { id: 'beaker', name: 'Beaker', icon: 'beaker' },
  { id: 'test_tube', name: 'Test Tube', icon: 'test_tube' },
  { id: 'rack', name: 'Test Tube Rack', icon: 'rack' },
  { id: 'dropper', name: 'Dropper / Pipette', icon: 'dropper' },
  { id: 'burner', name: 'Bunsen Burner', icon: 'bunsen_burner' },
  { id: 'flask', name: 'Conical Flask', icon: 'conical_flask' },
  { id: 'rod', name: 'Stirring Rod', icon: 'stirring_rod' },
  { id: 'tube', name: 'Delivery Tube', icon: 'delivery_tube' },
  { id: 'paper', name: 'Litmus Paper', icon: 'litmus_paper' },
  { id: 'glass', name: 'Watch Glass', icon: 'watch_glass' },
  { id: 'cylinder', name: 'Measuring Cylinder', icon: 'measuring_cylinder' },
  { id: 'meter', name: 'pH Meter', icon: 'ph_meter' }
];

const BENCH_LAYOUT = [
  {
    id: 'zone1',
    key: 'acid-base',
    fallbackTitle: 'Acid-Base Reactions',
    fallbackDescription: 'Acid and base experiments with indicators, salts, and gas evolution.',
    accent: 0x00d4ff,
    position: new THREE.Vector3(-3.15, 0, 7.2),
    cameraOffsetX: 0.55
  },
  {
    id: 'zone2',
    key: 'combustion',
    fallbackTitle: 'Combustion Reactions',
    fallbackDescription: 'Fuel, oxidant, flame, and combustion product demonstrations.',
    accent: 0xff8c00,
    position: new THREE.Vector3(3.15, 0, 1.35),
    cameraOffsetX: -0.55
  },
  {
    id: 'zone3',
    key: 'electrochemistry',
    fallbackTitle: 'Electrochemistry',
    fallbackDescription: 'Electrolysis, conductivity, electrodes, and redox setups.',
    accent: 0x00d4ff,
    position: new THREE.Vector3(-3.15, 0, -4.7),
    cameraOffsetX: 0.55
  },
  {
    id: 'zone4',
    key: 'synthesis',
    fallbackTitle: 'Synthesis Reactions',
    fallbackDescription: 'Combination reactions where simpler substances form new compounds.',
    accent: 0xff8c00,
    position: new THREE.Vector3(3.15, 0, -10.75),
    cameraOffsetX: -0.55
  }
];

function toHexColor(value, fallback) {
  try {
    return `#${new THREE.Color(value).getHexString()}`;
  } catch {
    return fallback;
  }
}

function pickChemicalFillColor(chemical) {
  return (
    chemical.liquid_color ??
    chemical.solid_color ??
    chemical.gas_color ??
    chemical.particle_color ??
    chemical.result_color ??
    chemical.bottle_color ??
    '#9fd7ff'
  );
}

function buildDisplayLabel(chemical) {
  const formula = typeof chemical.formula === 'string' ? chemical.formula.trim() : '';
  if (formula && formula.length <= 16 && !formula.includes(' ')) {
    return formula;
  }

  const words = chemical.name.split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 3).map(word => word[0]).join('').toUpperCase();
  if (initials.length >= 2 && initials.length <= 4) {
    return initials;
  }

  return chemical.name.slice(0, 10).toUpperCase();
}

function normalizeChemical(chemical) {
  const formula = chemical.formula ?? '';
  const contentMode = chemical.state === 'gas' || chemical.gas_color
    ? 'gas'
    : chemical.state === 'solid' || chemical.solid_color || chemical.particle_color
      ? 'solid'
      : 'liquid';

  return {
    id: chemical.id,
    name: chemical.name,
    formula,
    displayLabel: buildDisplayLabel(chemical),
    hoverName: formula ? `${chemical.name} (${formula})` : chemical.name,
    contentMode,
    bottleColor: toHexColor(chemical.bottle_color ?? pickChemicalFillColor(chemical), '#d7ebff'),
    fillColor: toHexColor(pickChemicalFillColor(chemical), '#9fd7ff')
  };
}

function normalizeApparatus(apparatus) {
  return {
    id: apparatus.id ?? apparatus.name,
    name: apparatus.name ?? 'Apparatus',
    icon: apparatus.icon ?? 'apparatus'
  };
}

function indexByKey(desks) {
  return new Map(desks.map(desk => [desk.key, desk]));
}

export function buildBenchDefinitions(desks = []) {
  const deskMap = indexByKey(desks);

  return BENCH_LAYOUT.map(layout => {
    const deskData = deskMap.get(layout.key);

    return {
      ...layout,
      title: deskData?.desk?.name ?? layout.fallbackTitle,
      description: deskData?.desk?.description ?? layout.fallbackDescription,
      chemicals: (deskData?.chemicals ?? DEFAULT_CHEMICALS).slice(0, 12).map(normalizeChemical),
      apparatus: (deskData?.apparatus ?? DEFAULT_APPARATUS).map(normalizeApparatus)
    };
  });
}

export const DEFAULT_BENCH_DEFINITIONS = buildBenchDefinitions();
