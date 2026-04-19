import * as THREE from 'three';

const DEFAULT_DESK_DATA = {
  'acid-base': {
    chemicals: [
      { id: 1, name: 'Hydrochloric Acid', formula: 'HCl', bottle_color: '#FFEB99', liquid_color: '#FFF9CC' },
      { id: 2, name: 'Sodium Hydroxide', formula: 'NaOH', bottle_color: '#B5EAD7', liquid_color: '#D4F5E9' },
      { id: 3, name: 'Sulfuric Acid', formula: 'H2SO4', bottle_color: '#FFD6A5', liquid_color: '#FFF0DC' },
      { id: 4, name: 'Acetic Acid', formula: 'CH3COOH', bottle_color: '#FFFFCC', liquid_color: '#FAFAD2' },
      { id: 5, name: 'Sodium Carbonate', formula: 'Na2CO3', bottle_color: '#C9F0FF', liquid_color: '#E0F7FF' },
      { id: 6, name: 'Sodium Bicarbonate', formula: 'NaHCO3', bottle_color: '#E8F5E9', liquid_color: '#F1FBF2' },
      { id: 7, name: 'Calcium Hydroxide', formula: 'Ca(OH)2', bottle_color: '#EDE7F6', liquid_color: '#F3EEFF' },
      { id: 8, name: 'Ammonia Solution', formula: 'NH3 (aq)', bottle_color: '#E0F0FF', liquid_color: '#EEF7FF' },
      { id: 9, name: 'Phenolphthalein', formula: 'C20H14O4', bottle_color: '#FFE4F0', liquid_color: '#FFF0F7' },
      { id: 10, name: 'Universal Indicator', formula: 'mixture', bottle_color: '#C8F5C8', liquid_color: '#DFFFDF' },
      { id: 11, name: 'Litmus Solution', formula: 'natural dye mixture', bottle_color: '#D8B4FE', liquid_color: '#EDE0FF' },
      { id: 12, name: 'Citric Acid', formula: 'C6H8O7', bottle_color: '#FFFDE7', liquid_color: '#FFFFE0' }
    ],
    apparatus: [
      { id: 1, name: 'Beaker', icon: 'beaker' },
      { id: 2, name: 'Test Tube', icon: 'test_tube' },
      { id: 3, name: 'Test Tube Rack', icon: 'rack' },
      { id: 4, name: 'Dropper / Pipette', icon: 'dropper' },
      { id: 5, name: 'Burette', icon: 'burette' },
      { id: 6, name: 'Conical Flask', icon: 'conical_flask' },
      { id: 7, name: 'Stirring Rod', icon: 'stirring_rod' },
      { id: 8, name: 'Delivery Tube', icon: 'delivery_tube' },
      { id: 9, name: 'Litmus Paper Strips', icon: 'litmus_paper' },
      { id: 10, name: 'Watch Glass', icon: 'watch_glass' },
      { id: 11, name: 'Measuring Cylinder', icon: 'measuring_cylinder' },
      { id: 12, name: 'pH Meter', icon: 'ph_meter' }
    ]
  },
  combustion: {
    chemicals: [
      { id: 1, name: 'Magnesium Ribbon', formula: 'Mg', state: 'solid', bottle_color: '#E8E8E8', solid_color: '#C0C0C0' },
      { id: 2, name: 'Sulfur Powder', formula: 'S', state: 'solid', bottle_color: '#FFF176', solid_color: '#FFD600' },
      { id: 3, name: 'Charcoal / Carbon', formula: 'C', state: 'solid', bottle_color: '#424242', solid_color: '#212121' },
      { id: 4, name: 'Ethanol', formula: 'C2H5OH', state: 'liquid', bottle_color: '#E1F5FE', liquid_color: '#F0FBFF' },
      { id: 5, name: 'Candle Wax (Paraffin)', formula: 'C25H52', state: 'solid', bottle_color: '#FFFDE7', solid_color: '#FFFFF0' },
      { id: 6, name: 'Methane Gas', formula: 'CH4', state: 'gas', bottle_color: '#E8F5E9', gas_color: '#F1FBF2' },
      { id: 7, name: 'Iron Filings / Wool', formula: 'Fe', state: 'solid', bottle_color: '#EFEBE9', solid_color: '#A1887F' },
      { id: 8, name: 'Calcium', formula: 'Ca', state: 'solid', bottle_color: '#F3E5F5', solid_color: '#CE93D8' },
      { id: 9, name: 'Oxygen Gas', formula: 'O2', state: 'gas', bottle_color: '#E3F2FD', gas_color: '#EBF5FB' },
      { id: 10, name: 'Limewater', formula: 'Ca(OH)2 (aq)', state: 'liquid', bottle_color: '#E8F8F5', liquid_color: '#F0FBF8' },
      { id: 11, name: 'Cobalt Chloride Paper', formula: 'CoCl2 paper', state: 'solid', bottle_color: '#FCE4EC', solid_color: '#1565C0' },
      { id: 12, name: 'Copper(II) Oxide', formula: 'CuO', state: 'solid', bottle_color: '#3E2723', solid_color: '#1B0000' }
    ],
    apparatus: [
      { id: 1, name: 'Bunsen Burner', icon: 'bunsen_burner' },
      { id: 2, name: 'Deflagrating Spoon', icon: 'deflagrating_spoon' },
      { id: 3, name: 'Gas Jar / Bell Jar', icon: 'gas_jar' },
      { id: 4, name: 'Crucible with Lid', icon: 'crucible' },
      { id: 5, name: 'Delivery Tube & Stopper', icon: 'delivery_tube' },
      { id: 6, name: 'Boiling Tube', icon: 'boiling_tube' },
      { id: 7, name: 'Crucible Tongs', icon: 'crucible_tongs' },
      { id: 8, name: 'Heat-Proof Mat', icon: 'heatproof_mat' },
      { id: 9, name: 'Combustion Tube (Hard Glass)', icon: 'combustion_tube' },
      { id: 10, name: 'Tripod & Gauze', icon: 'tripod_gauze' },
      { id: 11, name: 'Wooden Splint', icon: 'wooden_splint' },
      { id: 12, name: 'Safety Goggles & Screen', icon: 'safety_screen' }
    ]
  },
  electrochemistry: {
    chemicals: [
      { id: 1, name: 'Copper Sulfate Solution', formula: 'CuSO4 (aq)', bottle_color: '#1565C0', liquid_color: '#64B5F6' },
      { id: 2, name: 'Sodium Chloride Solution (Brine)', formula: 'NaCl (aq)', bottle_color: '#E3F2FD', liquid_color: '#F5FBFF' },
      { id: 3, name: 'Dilute Sulfuric Acid', formula: 'H2SO4 (aq)', bottle_color: '#FFD6A5', liquid_color: '#FFF5E6' },
      { id: 4, name: 'Dilute Hydrochloric Acid', formula: 'HCl (aq)', bottle_color: '#FFEB99', liquid_color: '#FFFBE6' },
      { id: 5, name: 'Sodium Hydroxide Solution', formula: 'NaOH (aq)', bottle_color: '#B5EAD7', liquid_color: '#D4F5E9' },
      { id: 6, name: 'Glucose Solution (Sugar Water)', formula: 'C6H12O6 (aq)', bottle_color: '#FFF9C4', liquid_color: '#FAFACD' },
      { id: 7, name: 'Distilled Water', formula: 'H2O', bottle_color: '#E1F5FE', liquid_color: '#F5FBFF' },
      { id: 8, name: 'Copper Chloride Solution', formula: 'CuCl2 (aq)', bottle_color: '#006064', liquid_color: '#4DB6AC' },
      { id: 9, name: 'Graphite (Carbon) Electrode', formula: 'C (graphite)', state: 'solid', bottle_color: '#424242', solid_color: '#212121' },
      { id: 10, name: 'Copper Electrode', formula: 'Cu', state: 'solid', bottle_color: '#B87333', solid_color: '#B87333' },
      { id: 11, name: 'Zinc Electrode', formula: 'Zn', state: 'solid', bottle_color: '#B0BEC5', solid_color: '#90A4AE' },
      { id: 12, name: 'Silver Nitrate Solution', formula: 'AgNO3 (aq)', bottle_color: '#ECEFF1', liquid_color: '#F5F7F8' }
    ],
    apparatus: [
      { id: 1, name: 'Electrolysis Cell / Beaker', icon: 'electrolysis_cell' },
      { id: 2, name: 'DC Power Supply (Battery)', icon: 'dc_power_supply' },
      { id: 3, name: 'Connecting Wires & Crocodile Clips', icon: 'wires_clips' },
      { id: 4, name: 'Ammeter', icon: 'ammeter' },
      { id: 5, name: 'Voltmeter', icon: 'voltmeter' },
      { id: 6, name: 'Graphite / Inert Electrodes', icon: 'graphite_electrodes' },
      { id: 7, name: 'Inverted Test Tubes (gas collection)', icon: 'inverted_tubes' },
      { id: 8, name: 'Glowing Splint (O2 test)', icon: 'glowing_splint' },
      { id: 9, name: 'Burning Splint (H2 test)', icon: 'burning_splint' },
      { id: 10, name: 'Moist Litmus Paper (Cl2 test)', icon: 'litmus_paper' },
      { id: 11, name: 'Conductivity Tester / Bulb Circuit', icon: 'bulb_circuit' },
      { id: 12, name: 'Measuring Cylinder & Weighing Balance', icon: 'cylinder_balance' }
    ]
  },
  synthesis: {
    chemicals: [
      { id: 1, name: 'Iron Powder', formula: 'Fe', state: 'solid', bottle_color: '#BCAAA4', particle_color: '#757575' },
      { id: 2, name: 'Sulfur Powder', formula: 'S', state: 'solid', bottle_color: '#FFF176', particle_color: '#FFEE58' },
      { id: 3, name: 'Magnesium Ribbon', formula: 'Mg', state: 'solid', bottle_color: '#E0E0E0', particle_color: '#BDBDBD' },
      { id: 4, name: 'Oxygen Gas', formula: 'O2', state: 'gas', bottle_color: '#E0F7FA', gas_color: '#B2EBF2' },
      { id: 5, name: 'Hydrogen Gas', formula: 'H2', state: 'gas', bottle_color: '#E3F2FD', gas_color: '#BBDEFB' },
      { id: 6, name: 'Nitrogen Gas', formula: 'N2', state: 'gas', bottle_color: '#F3E5F5', gas_color: '#E1BEE7' },
      { id: 7, name: 'Calcium Oxide (Quicklime)', formula: 'CaO', state: 'solid', bottle_color: '#FFF9C4', particle_color: '#FFF59D' },
      { id: 8, name: 'Water', formula: 'H2O', bottle_color: '#E1F5FE', liquid_color: '#F0FBFF' },
      { id: 9, name: 'Sulfur Trioxide', formula: 'SO3', state: 'gas', bottle_color: '#FFCCBC', gas_color: '#FFAB91' },
      { id: 10, name: 'Sodium Metal', formula: 'Na', state: 'solid', bottle_color: '#C8E6C9', particle_color: '#A5D6A7' },
      { id: 11, name: 'Chlorine Gas', formula: 'Cl2', state: 'gas', bottle_color: '#F9FBE7', gas_color: '#F0F4C3' },
      { id: 12, name: 'Aluminium Powder', formula: 'Al', state: 'solid', bottle_color: '#ECEFF1', particle_color: '#CFD8DC' }
    ],
    apparatus: [
      { id: 1, name: 'Test Tube', icon: 'test_tube' },
      { id: 2, name: 'Test Tube Rack', icon: 'rack' },
      { id: 3, name: 'Bunsen Burner', icon: 'bunsen_burner' },
      { id: 4, name: 'Crucible with Lid', icon: 'crucible' },
      { id: 5, name: 'Beaker', icon: 'beaker' },
      { id: 6, name: 'Dropper / Pipette', icon: 'dropper' },
      { id: 7, name: 'Tongs / Crucible Tongs', icon: 'tongs' },
      { id: 8, name: 'Heat-proof Mat', icon: 'heatproof_mat' },
      { id: 9, name: 'Magnet', icon: 'magnet' },
      { id: 10, name: 'Delivery Tube', icon: 'delivery_tube' },
      { id: 11, name: 'Gas Jar with Lid', icon: 'gas_jar' },
      { id: 12, name: 'Thermometer', icon: 'thermometer' }
    ]
  }
};

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
    stickerLabel: chemical.name,
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
    const deskData = deskMap.get(layout.key) ?? DEFAULT_DESK_DATA[layout.key] ?? {};

    return {
      ...layout,
      title: deskData?.desk?.name ?? layout.fallbackTitle,
      description: deskData?.desk?.description ?? layout.fallbackDescription,
      chemicals: (deskData.chemicals ?? []).slice(0, 12).map(normalizeChemical),
      apparatus: (deskData.apparatus ?? []).map(normalizeApparatus)
    };
  });
}

export const DEFAULT_BENCH_DEFINITIONS = buildBenchDefinitions();
