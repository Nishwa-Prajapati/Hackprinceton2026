/**
 * BenchBuilder — 3D apparatus models ported from main branch, reskinned for
 * the bright sci-fi lab aesthetic (#2a2a35 base, #ddd9d0 tops, #FF8C00 orange, #00D4FF cyan).
 */
import * as THREE from 'three';
import gsap from 'gsap';

// ─── Reagent data (from main branch) ─────────────────────────────────────────

const DEFAULT_REAGENTS = [
  { name: 'Hydrochloric Acid', formula: 'HCl', liquid_color: '#69c5ff' },
  { name: 'Sodium Hydroxide', formula: 'NaOH', liquid_color: '#ffce6b' },
  { name: 'Sulfuric Acid', formula: 'H2SO4', liquid_color: '#a980ff' },
  { name: 'Ethanol', formula: 'C2H5OH', liquid_color: '#70d99e' },
  { name: 'Copper Sulfate', formula: 'CuSO4', liquid_color: '#4f8dff' },
  { name: 'Water', formula: 'H2O', liquid_color: '#b6e3ff' },
  { name: 'Ammonia', formula: 'NH3', liquid_color: '#ff9c76' },
  { name: 'Silver Nitrate', formula: 'AgNO3', liquid_color: '#f8d96b' },
  { name: 'Sodium Chloride', formula: 'NaCl', liquid_color: '#97d4ff' },
  { name: 'Potassium Permanganate', formula: 'KMnO4', liquid_color: '#bf79ff' },
  { name: 'Acetone', formula: 'CH3COCH3', liquid_color: '#ffb97c' },
  { name: 'Ferric Chloride', formula: 'FeCl3', liquid_color: '#dbc35e' },
];

const LIQUID_COLORS = [
  0x69c5ff, 0xffce6b, 0xa980ff, 0x70d99e,
  0x4f8dff, 0xb6e3ff, 0xff9c76, 0xf8d96b,
  0x97d4ff, 0xbf79ff, 0xffb97c, 0xdbc35e,
];

function parseColor(value, fallback) {
  if (typeof value === 'string' && value.trim()) return new THREE.Color(value).getHex();
  return fallback;
}

function normalizeToolKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function getHazardStyle(hazard, deskKey) {
  const token = String(hazard ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (!token) return null;

  if (token.includes('safe') || token.includes('low_hazard') || token.includes('inert')) {
    return { color: 0x22c55e, label: 'Safe', glow: 1.05 };
  }
  if (
    token.includes('highly_corrosive')
    || token.includes('toxic')
    || token.includes('choking')
    || token.includes('burns_bright_white')
    || token.includes('burns_intensely')
    || token.includes('highly_reactive')
    || token.includes('fire_risk')
  ) {
    return { color: 0xff3b30, label: 'Highly Harmful', glow: 1.32 };
  }
  if (
    token.includes('corrosive')
    || token.includes('pungent')
    || token.includes('oxidising')
    || token.includes('oxidizer')
    || token.includes('flammable')
    || token.includes('reacts_with_moisture')
    || token.includes('sparks')
    || token.includes('ventilation')
    || token.includes('burns')
  ) {
    return { color: 0xff8a00, label: 'Moderately Harmful', glow: 1.18 };
  }
  if (token.includes('mild')) {
    return { color: 0xffd400, label: 'Mild', glow: 1.08 };
  }

  return { color: 0xffd400, label: 'Mild', glow: 1.08 };
}

function normalizeReagents(chemicals = [], deskKey = null) {
  const source = chemicals.length ? chemicals.slice(0, 12) : DEFAULT_REAGENTS;
  return source.map((chemical, index) => ({
    hazard: chemical.hazard ?? '',
    id: chemical.id ?? index + 1,
    name: chemical.name ?? chemical.formula ?? `Reagent ${index + 1}`,
    formula: chemical.formula ?? chemical.label ?? `R${index + 1}`,
    displayName: chemical.name
      ? `${chemical.name}${chemical.formula ? ` (${chemical.formula})` : ''}`
      : chemical.formula ?? `Reagent ${index + 1}`,
    color: parseColor(
      chemical.liquid_color
        ?? chemical.gas_color
        ?? chemical.solid_color
        ?? chemical.particle_color
        ?? chemical.bottle_color,
      LIQUID_COLORS[index % LIQUID_COLORS.length]
    ),
    hazardStyle: getHazardStyle(chemical.hazard, deskKey),
  }));
}

function makeLabelTexture(text, {
  width = 256,
  height = 96,
  background = '#f3f1e8',
  border = '#675f52',
  color = '#252525',
  font = '700 30px Arial',
} = {}) {
  const cv = document.createElement('canvas');
  cv.width = width;
  cv.height = height;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = border;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, width - 6, height - 6);

  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── Hover system (from main) ─────────────────────────────────────────────────

function createHoverHitbox(radius, height) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
}

function registerHoverTarget(targets, controllers, key, name, hitObject, scaleTarget, materials, opts = {}) {
  const baseScale     = scaleTarget.scale.clone();
  const hoverScale    = opts.hoverScale    ?? 1.06;
  const emissiveBoost = opts.emissiveBoost ?? 0.22;
  const tracked = materials.filter(Boolean).map(m => ({
    material: m,
    baseEI: typeof m.emissiveIntensity === 'number' ? m.emissiveIntensity : 0,
  }));

  hitObject.userData.hoverKey  = key;
  hitObject.userData.hoverName = name;
  targets.push(hitObject);

  controllers.set(key, hovered => {
    scaleTarget.scale.copy(baseScale).multiplyScalar(hovered ? hoverScale : 1);
    tracked.forEach(({ material, baseEI }) => {
      if ('emissiveIntensity' in material)
        material.emissiveIntensity = baseEI + (hovered ? emissiveBoost : 0);
    });
    opts.onHoverChange?.(hovered);
  });
}

// ─── Apparatus builders (reskinned for dark lab) ──────────────────────────────

function createBeaker(x, z, accentColor, hoverTargets, hoverControllers) {
  const g = new THREE.Group();

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8f3ff, roughness: 0.05, transmission: 0.94,
    transparent: true, opacity: 0.62, thickness: 0.24,
  });
  const liquidMat = new THREE.MeshStandardMaterial({
    color: accentColor, emissive: accentColor, emissiveIntensity: 0.22, roughness: 0.12,
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.155, 0.36, 32, 1, true), glassMat);
  body.position.y = 0.18; body.castShadow = true;
  g.add(body);
  const beakerLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.18, 24), liquidMat);
  beakerLiquid.position.y = 0.1;
  g.add(beakerLiquid);
  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(0.152, 0.009, 10, 32),
    new THREE.MeshStandardMaterial({ color: 0xeefaff, metalness: 0.18, roughness: 0.2 })
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.36;
  g.add(lip);

  const hb = createHoverHitbox(0.18, 0.44);
  hb.position.y = 0.18;
  g.add(hb);
  g.position.set(x, 1.02, z);
  registerHoverTarget(hoverTargets, hoverControllers, `beaker-${x}-${z}`, 'Beaker', hb, g, [glassMat, liquidMat]);
  return g;
}

function createFlask(x, z, liquidColor, hoverTargets, hoverControllers) {
  const g = new THREE.Group();

  const flaskMat = new THREE.MeshPhysicalMaterial({
    color: 0xf3fbff, roughness: 0.05, transmission: 0.94,
    transparent: true, opacity: 0.58, thickness: 0.28,
  });
  const liquidMat = new THREE.MeshStandardMaterial({
    color: liquidColor, emissive: liquidColor, emissiveIntensity: 0.18, roughness: 0.12,
  });

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.185, 28, 28), flaskMat);
  bulb.scale.set(1, 1.08, 1);
  bulb.position.y = 0.11; bulb.castShadow = true;
  g.add(bulb);

  const liquid = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 24, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), liquidMat
  );
  liquid.position.y = 0.03;
  g.add(liquid);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.34, 16), flaskMat);
  neck.position.y = 0.34; neck.castShadow = true;
  g.add(neck);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.048, 0.006, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0xf3fbff, metalness: 0.15, roughness: 0.2 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.51;
  g.add(rim);

  const hb = createHoverHitbox(0.18, 0.58);
  hb.position.y = 0.22;
  g.add(hb);
  g.position.set(x, 1.03, z);
  registerHoverTarget(hoverTargets, hoverControllers, `flask-${x}-${z}`, 'Conical Flask', hb, g, [flaskMat, liquidMat]);
  return g;
}

function createBurner(x, z, hoverTargets, hoverControllers) {
  const g = new THREE.Group();

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x5e697b, metalness: 0.82, roughness: 0.2,
    emissive: 0x000000, emissiveIntensity: 0,
  });
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xff8c00, emissive: 0xff5500, emissiveIntensity: 0.9,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.08, 24), metalMat);
  base.position.y = 0.04;
  g.add(base);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.05, 18), metalMat);
  collar.position.y = 0.115;
  g.add(collar);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.25, 16), metalMat);
  stem.position.y = 0.18; stem.castShadow = true;
  g.add(stem);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 16), flameMat);
  flame.position.y = 0.39;
  g.add(flame);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.06, 14), metalMat);
  nozzle.position.y = 0.34;
  g.add(nozzle);

  const hb = createHoverHitbox(0.14, 0.56);
  hb.position.y = 0.22;
  g.add(hb);
  g.position.set(x, 1, z);
  registerHoverTarget(hoverTargets, hoverControllers, `burner-${x}-${z}`, 'Bunsen Burner', hb, g, [metalMat, flameMat]);
  return g;
}

function createTubeRack(x, z, hoverTargets, hoverControllers) {
  const g = new THREE.Group();

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x3a4455, metalness: 0.45, roughness: 0.5,
    emissive: 0x000000, emissiveIntensity: 0,
  });
  const tubeMat = new THREE.MeshPhysicalMaterial({
    color: 0xeef8ff, roughness: 0.04, transmission: 0.92,
    transparent: true, opacity: 0.6, thickness: 0.1,
  });

  const railBottom = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.18), railMat);
  railBottom.position.y = 0.03;
  g.add(railBottom);
  const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.18), railMat);
  railTop.position.y = 0.28;
  g.add(railTop);

  [-0.21, -0.07, 0.07, 0.21].forEach(ox => {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.26, 18), tubeMat);
    tube.position.set(ox, 0.14, 0); tube.castShadow = true;
    g.add(tube);
  });

  const hb = createHoverHitbox(0.36, 0.4);
  hb.position.y = 0.15;
  g.add(hb);
  g.position.set(x, 1.01, z);
  registerHoverTarget(hoverTargets, hoverControllers, `rack-${x}-${z}`, 'Test Tube Rack', hb, g, [railMat, tubeMat]);
  return g;
}

function createBottle({ id, name, label, displayName, color, hazardStyle = null, x, y, z }, hoverTargets, hoverControllers) {
  const g = new THREE.Group();

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xeef8ff, roughness: 0.06, transmission: 0.88,
    transparent: true, opacity: 0.5, thickness: 0.2,
  });
  const liquidMat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.16, roughness: 0.2,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x2a3040, roughness: 0.45, metalness: 0.3,
  });
  const labelBorderMat = hazardStyle == null
    ? null
    : new THREE.MeshBasicMaterial({
      color: hazardStyle.color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

  const bottleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.1, 0.34, 20), glassMat);
  bottleBody.position.y = 0.17;
  g.add(bottleBody);
  const bottleLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.084, 0.19, 20), liquidMat);
  bottleLiquid.position.y = 0.095;
  g.add(bottleLiquid);
  const bottleNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.11, 16), glassMat);
  bottleNeck.position.y = 0.395;
  g.add(bottleNeck);
  const bottleCap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16), capMat);
  bottleCap.position.y = 0.48;
  g.add(bottleCap);

  const hazardOutlineMat = hazardStyle == null
    ? null
    : new THREE.MeshBasicMaterial({
      color: hazardStyle.color,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  const hazardOutlineBody = hazardOutlineMat
    ? new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.115, 0.37, 28), hazardOutlineMat)
    : null;
  if (hazardOutlineBody) {
    hazardOutlineBody.position.y = 0.17;
    hazardOutlineBody.scale.setScalar(1.02);
    g.add(hazardOutlineBody);
  }
  const hazardOutlineNeck = hazardOutlineMat
    ? new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.125, 20), hazardOutlineMat)
    : null;
  if (hazardOutlineNeck) {
    hazardOutlineNeck.position.y = 0.395;
    g.add(hazardOutlineNeck);
  }
  const hazardOutlineCap = hazardOutlineMat
    ? new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.009, 8, 24), hazardOutlineMat)
    : null;
  if (hazardOutlineCap) {
    hazardOutlineCap.rotation.x = Math.PI / 2;
    hazardOutlineCap.position.y = 0.51;
    g.add(hazardOutlineCap);
  }

  const sticker = new THREE.Mesh(
    new THREE.PlaneGeometry(0.14, 0.075),
    new THREE.MeshBasicMaterial({
      map: makeLabelTexture(label, { width: 256, height: 128, font: '700 38px Arial' }),
      transparent: true,
      depthWrite: false,
    })
  );
  sticker.position.set(0, 0.21, 0.102);
  g.add(sticker);
  const hazardLabelBorder = labelBorderMat
    ? new THREE.Mesh(new THREE.PlaneGeometry(0.162, 0.097), labelBorderMat)
    : null;
  if (hazardLabelBorder) {
    hazardLabelBorder.position.set(0, 0.21, 0.101);
    g.add(hazardLabelBorder);
  }

  const hb = createHoverHitbox(0.13, 0.58);
  hb.position.y = 0.24;
  hb.userData.reactantId = id ?? null;
  hb.userData.reactantName = name ?? displayName ?? label;
  hb.userData.reactantFormula = label;
  hb.userData.reactantDisplayName = displayName ?? label;
  g.add(hb);
  g.position.set(x, y, z);
  const hoverTitle = hazardStyle?.label
    ? `${displayName ?? label} • ${hazardStyle.label}`
    : displayName ?? label;
  registerHoverTarget(hoverTargets, hoverControllers, `bottle-${label}-${x}`, hoverTitle, hb, g, [glassMat, liquidMat, capMat], {
    hoverScale: 1.05,
    emissiveBoost: 0.14,
    onHoverChange: (hovered) => {
      if (!hazardOutlineMat) return;
      hazardOutlineMat.opacity = hovered ? 0.96 : 0;
      if (labelBorderMat) labelBorderMat.opacity = hovered ? 0.92 : 0;
      liquidMat.emissive.setHex(hovered ? hazardStyle.color : color);
      liquidMat.color.setHex(color);
      liquidMat.emissiveIntensity = hovered ? 0.42 * (hazardStyle?.glow ?? 1) : 0.16;
      capMat.emissive.setHex(hovered ? hazardStyle.color : 0x000000);
      capMat.emissiveIntensity = hovered ? 0.38 : 0;
    },
  });
  return g;
}

function createReagentRack(accentColor, hoverTargets, hoverControllers, chemicals, deskKey = null) {
  const g = new THREE.Group();
  const reagents = normalizeReagents(chemicals, deskKey);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.45, metalness: 0.6 });
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x1e2030, roughness: 0.4, metalness: 0.15 });

  // Two shelves
  [[0, 1.14, -0.38], [0, 1.5, -0.38]].forEach(([x, y, z]) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.08, 0.38), shelfMat);
    shelf.position.set(x, y, z); shelf.castShadow = shelf.receiveShadow = true;
    g.add(shelf);
  });

  // Cyan LED strips under each shelf
  [[0, 1.09, -0.38], [0, 1.45, -0.38]].forEach(([x, y, z]) => {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.02, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x00D4FF, emissive: 0x00D4FF, emissiveIntensity: 1.2 })
    );
    strip.position.set(x, y, z);
    g.add(strip);
  });

  // Vertical supports
  [[-0.94, 1.31], [0.94, 1.31], [-0.94, 1.57], [0.94, 1.57]].forEach(([x, y]) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), frameMat);
    s.position.set(x, y, -0.38); s.castShadow = true;
    g.add(s);
  });

  const rearRail = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 0.08), frameMat);
  rearRail.position.set(0, 1.69, -0.54);
  g.add(rearRail);

  // 12 reagent bottles
  const spacing = 0.34;
  reagents.forEach(({ id, name, formula, displayName, color, hazardStyle }, i) => {
    const row = i < 6 ? 0 : 1;
    const col = i % 6;
    g.add(createBottle({
      id, name, label: formula, displayName, color, hazardStyle,
      x: -0.85 + col * spacing,
      y: row === 0 ? 1.18 : 1.54,
      z: row === 0 ? -0.28 : -0.48,
    }, hoverTargets, hoverControllers));
  });

  return g;
}

function createDeskStorage(benchId, benchTitle, apparatus, hoverTargets, hoverControllers, accentHex, deskKey, apparatusHighlightKeys) {
  const group = new THREE.Group();
  const clickTargets = [];
  const state = { open: false };

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x363b47, roughness: 0.48, metalness: 0.34 });
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x505764, roughness: 0.42, metalness: 0.25 });
  const trimMat = new THREE.MeshStandardMaterial({ color: accentHex, emissive: accentHex, emissiveIntensity: 0.35, roughness: 0.22 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xdff7ff,
    transparent: true,
    opacity: 0.26,
    transmission: 0.78,
    roughness: 0.08,
    thickness: 0.12,
  });
  const glassEdgeMat = new THREE.MeshStandardMaterial({ color: 0x8fa6b6, roughness: 0.24, metalness: 0.72 });
  const glasswareMat = new THREE.MeshPhysicalMaterial({
    color: 0xeef8ff,
    transparent: true,
    opacity: 0.58,
    transmission: 0.9,
    roughness: 0.05,
    thickness: 0.12,
  });
  const toolMat = new THREE.MeshStandardMaterial({ color: 0x768090, roughness: 0.34, metalness: 0.7 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 0.14, roughness: 0.24 });
  const stripPaperMat = new THREE.MeshStandardMaterial({ color: 0xf5f1da, roughness: 0.88 });
  const meterBodyMat = new THREE.MeshStandardMaterial({ color: 0x2f3b4d, roughness: 0.4, metalness: 0.25 });
  const meterScreenMat = new THREE.MeshStandardMaterial({ color: 0xaef5ff, emissive: 0x6beeff, emissiveIntensity: 0.4 });
  const meterPanelMat = new THREE.MeshStandardMaterial({ color: 0x202734, roughness: 0.4, metalness: 0.3 });
  const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xf5f2eb, roughness: 0.78, metalness: 0.02 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.84, metalness: 0.02 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.52, metalness: 0.38 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.3, metalness: 0.85 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xaab6c8, roughness: 0.28, metalness: 0.88 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xb88a53, roughness: 0.72, metalness: 0.02 });
  const warningMat = new THREE.MeshStandardMaterial({ color: 0xffcc4d, emissive: 0xffb700, emissiveIntensity: 0.12, roughness: 0.44 });
  const gaugeMat = new THREE.MeshStandardMaterial({ color: 0xf3f5f7, roughness: 0.32, metalness: 0.08 });

  const leftSide = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.92, 1.32), frameMat);
  leftSide.position.set(-1.28, 0.46, 0);
  group.add(leftSide);
  const rightSide = leftSide.clone();
  rightSide.position.x = 1.28;
  group.add(rightSide);

  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.92, 0.08), frameMat);
  backPanel.position.set(0, 0.46, -0.62);
  group.add(backPanel);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.08, 1.24), shelfMat);
  floor.position.set(0, 0.04, 0);
  floor.receiveShadow = true;
  group.add(floor);

  const midShelf = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.05, 1.05), shelfMat);
  midShelf.position.set(0, 0.43, -0.02);
  group.add(midShelf);

  const topRail = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.12, 0.12), frameMat);
  topRail.position.set(0, 0.84, 0.58);
  group.add(topRail);

  const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.11, 0.12), frameMat);
  bottomRail.position.set(0, 0.08, 0.58);
  group.add(bottomRail);

  const accentStrip = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.03, 0.03), trimMat);
  accentStrip.position.set(0, 0.81, 0.61);
  group.add(accentStrip);

  const innerLight = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.02, 0.02), accentMat);
  innerLight.position.set(0, 0.77, -0.56);
  group.add(innerLight);

  const apparatusByIcon = new Map(apparatus.map((item, index) => [item.icon ?? `slot-${index}`, item]));

  const getApparatusItem = (icon, fallbackName) => apparatusByIcon.get(icon) ?? { name: fallbackName, icon };

  const registerStorageHover = (key, name, holder, hitboxSize, materials = [], opts = {}) => {
    const hb = new THREE.Mesh(
      new THREE.BoxGeometry(hitboxSize.x, hitboxSize.y, hitboxSize.z),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hb.userData.preventBenchFocus = true;
    holder.add(hb);
    apparatusHighlightKeys.set(normalizeToolKey(name), key);
    registerHoverTarget(hoverTargets, hoverControllers, key, name, hb, holder, materials, {
      hoverScale: opts.hoverScale ?? 1.04,
      emissiveBoost: opts.emissiveBoost ?? 0.12,
    });
    return holder;
  };

  const makeBeaker = (item = getApparatusItem('beaker', 'Beaker')) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.16, 24, 1, true), glasswareMat);
    body.position.y = 0.08;
    g.add(body);
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.08, 20), new THREE.MeshStandardMaterial({ color: 0x9ce3ff, emissive: 0x66cfff, emissiveIntensity: 0.12 }));
    liquid.position.y = 0.04;
    g.add(liquid);
    return registerStorageHover(`${benchId}-beaker`, item.name, g, { x: 0.2, y: 0.22, z: 0.18 }, [glasswareMat]);
  };

  const makeTestTube = (item = getApparatusItem('test_tube', 'Test Tube')) => {
    const g = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.22, 16), glasswareMat);
    tube.position.y = 0.11;
    g.add(tube);
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.09, 14), new THREE.MeshStandardMaterial({ color: 0xfed2a2, emissive: 0xffb46b, emissiveIntensity: 0.1 }));
    liquid.position.y = 0.045;
    g.add(liquid);
    return registerStorageHover(`${benchId}-test-tube`, item.name, g, { x: 0.11, y: 0.25, z: 0.11 }, [glasswareMat]);
  };

  const makeTestTubeRack = (item = getApparatusItem('rack', 'Test Tube Rack')) => {
    const g = new THREE.Group();
    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.1), toolMat);
    rail1.position.y = 0.03;
    g.add(rail1);
    const rail2 = rail1.clone();
    rail2.position.y = 0.16;
    g.add(rail2);
    [-0.07, 0, 0.07].forEach((x) => {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 14), glasswareMat);
      tube.position.set(x, 0.08, 0);
      g.add(tube);
    });
    return registerStorageHover(`${benchId}-rack`, item.name, g, { x: 0.26, y: 0.22, z: 0.14 }, [toolMat, glasswareMat]);
  };

  const makeDropper = (item = getApparatusItem('dropper', 'Dropper / Pipette')) => {
    const g = new THREE.Group();
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), new THREE.MeshStandardMaterial({ color: 0x4b5970, roughness: 0.5 }));
    bulb.position.x = -0.14;
    g.add(bulb);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 12), glasswareMat);
    stem.rotation.z = Math.PI / 2;
    g.add(stem);
    return registerStorageHover(`${benchId}-dropper`, item.name, g, { x: 0.34, y: 0.08, z: 0.08 }, [glasswareMat]);
  };

  const makeBurette = (item = getApparatusItem('burette', 'Burette')) => {
    const g = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.52, 12), glasswareMat);
    tube.rotation.z = Math.PI / 2;
    g.add(tube);
    const stopcock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, 0.025), toolMat);
    stopcock.position.set(0.09, -0.02, 0);
    g.add(stopcock);
    return registerStorageHover(`${benchId}-burette`, item.name, g, { x: 0.58, y: 0.08, z: 0.08 }, [glasswareMat, toolMat]);
  };

  const makeConicalFlask = (item = getApparatusItem('conical_flask', 'Conical Flask')) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 0.2, 20), glasswareMat);
    body.position.y = 0.08;
    g.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.09, 16), glasswareMat);
    neck.position.y = 0.22;
    g.add(neck);
    return registerStorageHover(`${benchId}-flask`, item.name, g, { x: 0.18, y: 0.32, z: 0.18 }, [glasswareMat]);
  };

  const makeStirringRod = (item = getApparatusItem('stirring_rod', 'Stirring Rod')) => {
    const g = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.34, 10), glasswareMat);
    rod.rotation.z = Math.PI / 2;
    g.add(rod);
    return registerStorageHover(`${benchId}-stirring-rod`, item.name, g, { x: 0.38, y: 0.05, z: 0.05 }, [glasswareMat]);
  };

  const makeDeliveryTube = (item = getApparatusItem('delivery_tube', 'Delivery Tube'), withStopper = false) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.12, 0.04, 0),
      new THREE.Vector3(-0.02, 0.1, 0),
      new THREE.Vector3(0.08, 0.08, 0),
      new THREE.Vector3(0.14, -0.02, 0),
    ]);
    const g = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.01, 10, false), glasswareMat);
    g.add(tube);
    if (withStopper) {
      const stopper = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.018, 0.045, 12), rubberMat);
      stopper.rotation.z = -0.34;
      stopper.position.set(-0.12, 0.03, 0);
      g.add(stopper);
    }
    return registerStorageHover(`${benchId}-delivery-tube`, item.name, g, { x: 0.34, y: 0.16, z: 0.06 }, [glasswareMat, rubberMat]);
  };

  const makeLitmusPack = (item = getApparatusItem('litmus_paper', 'Litmus Paper Strips')) => {
    const g = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.08), stripPaperMat);
    g.add(pad);
    [-0.02, 0, 0.02].forEach((x, index) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.09, 0.01), new THREE.MeshStandardMaterial({ color: index % 2 === 0 ? 0xc34db6 : 0x4d6fd8 }));
      strip.position.set(x, 0.045, 0.025);
      g.add(strip);
    });
    return registerStorageHover(`${benchId}-litmus-paper`, item.name, g, { x: 0.16, y: 0.16, z: 0.1 }, [stripPaperMat]);
  };

  const makeWatchGlass = (item = getApparatusItem('watch_glass', 'Watch Glass')) => {
    const g = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 18, 0, Math.PI * 2, 0, Math.PI / 2.6), glasswareMat);
    bowl.scale.y = 0.22;
    bowl.rotation.x = Math.PI;
    g.add(bowl);
    return registerStorageHover(`${benchId}-watch-glass`, item.name, g, { x: 0.18, y: 0.08, z: 0.18 }, [glasswareMat]);
  };

  const makeMeasuringCylinder = (item = getApparatusItem('measuring_cylinder', 'Measuring Cylinder')) => {
    const g = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.28, 16), glasswareMat);
    tube.position.y = 0.14;
    g.add(tube);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.025, 18), toolMat);
    base.position.y = 0.012;
    g.add(base);
    return registerStorageHover(`${benchId}-measuring-cylinder`, item.name, g, { x: 0.16, y: 0.34, z: 0.16 }, [glasswareMat, toolMat]);
  };

  const makePhMeter = (item = getApparatusItem('ph_meter', 'pH Meter')) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.05), meterBodyMat);
    body.position.y = 0.16;
    g.add(body);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.06), meterScreenMat);
    screen.position.set(0, 0.23, 0.026);
    g.add(screen);
    const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.14, 10), toolMat);
    probe.position.y = -0.06;
    g.add(probe);
    return registerStorageHover(`${benchId}-ph-meter`, item.name, g, { x: 0.18, y: 0.42, z: 0.1 }, [meterBodyMat, meterScreenMat]);
  };

  const makeBunsenBurner = (item = getApparatusItem('bunsen_burner', 'Bunsen Burner')) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.04, 20), toolMat);
    base.position.y = 0.02;
    g.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 14), steelMat);
    stem.position.y = 0.12;
    g.add(stem);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.022, 0.045, 12), steelMat);
    nozzle.position.y = 0.225;
    g.add(nozzle);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.085, 14), new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff7a00, emissiveIntensity: 0.6 }));
    flame.position.y = 0.31;
    g.add(flame);
    return registerStorageHover(`${benchId}-bunsen-burner`, item.name, g, { x: 0.16, y: 0.38, z: 0.16 }, [toolMat, steelMat], { hoverScale: 1.03 });
  };

  const makeDeflagratingSpoon = (item = getApparatusItem('deflagrating_spoon', 'Deflagrating Spoon')) => {
    const g = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.34, 10), steelMat);
    handle.rotation.z = Math.PI / 2;
    g.add(handle);
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 14, 0, Math.PI * 2, 0, Math.PI / 2), steelMat);
    cup.rotation.z = Math.PI;
    cup.position.x = 0.18;
    g.add(cup);
    return registerStorageHover(`${benchId}-deflagrating-spoon`, item.name, g, { x: 0.42, y: 0.09, z: 0.09 }, [steelMat]);
  };

  const makeGasJar = (item = getApparatusItem('gas_jar', 'Gas Jar / Bell Jar')) => {
    const g = new THREE.Group();
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 24, 1, true), glasswareMat);
    jar.position.y = 0.11;
    g.add(jar);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.006, 8, 18), steelMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.22;
    g.add(rim);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.02, 18), rubberMat);
    lid.position.y = 0.235;
    g.add(lid);
    return registerStorageHover(`${benchId}-gas-jar`, item.name, g, { x: 0.22, y: 0.3, z: 0.22 }, [glasswareMat, steelMat, rubberMat]);
  };

  const makeCrucible = (item = getApparatusItem('crucible', 'Crucible with Lid')) => {
    const g = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.085, 0.09, 18, 1, true), ceramicMat);
    bowl.position.y = 0.045;
    g.add(bowl);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 14), ceramicMat);
    base.position.y = 0.01;
    g.add(base);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.07, 0.03, 18), ceramicMat);
    lid.position.y = 0.11;
    g.add(lid);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 10), ceramicMat);
    knob.position.y = 0.135;
    g.add(knob);
    return registerStorageHover(`${benchId}-crucible`, item.name, g, { x: 0.2, y: 0.18, z: 0.2 }, [ceramicMat]);
  };

  const makeBoilingTube = (item = getApparatusItem('boiling_tube', 'Boiling Tube')) => {
    const g = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 16), glasswareMat);
    tube.rotation.z = Math.PI / 2;
    g.add(tube);
    return registerStorageHover(`${benchId}-boiling-tube`, item.name, g, { x: 0.34, y: 0.12, z: 0.12 }, [glasswareMat]);
  };

  const makeTongs = (item = getApparatusItem('crucible_tongs', 'Crucible Tongs')) => {
    const g = new THREE.Group();
    const left = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 10), steelMat);
    left.rotation.z = Math.PI / 2 + 0.18;
    left.position.x = -0.01;
    g.add(left);
    const right = left.clone();
    right.rotation.z = Math.PI / 2 - 0.18;
    right.position.x = 0.01;
    g.add(right);
    const hinge = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 10), steelMat);
    g.add(hinge);
    return registerStorageHover(`${benchId}-tongs-${item.icon}`, item.name, g, { x: 0.36, y: 0.12, z: 0.08 }, [steelMat]);
  };

  const makeHeatproofMat = (item = getApparatusItem('heatproof_mat', 'Heat-Proof Mat')) => {
    const g = new THREE.Group();
    const mat = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.22), warningMat);
    g.add(mat);
    return registerStorageHover(`${benchId}-heatproof-mat`, item.name, g, { x: 0.28, y: 0.06, z: 0.24 }, [warningMat], { hoverScale: 1.02 });
  };

  const makeCombustionTube = (item = getApparatusItem('combustion_tube', 'Combustion Tube (Hard Glass)')) => {
    const g = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.46, 16), glasswareMat);
    tube.rotation.z = Math.PI / 2;
    g.add(tube);
    return registerStorageHover(`${benchId}-combustion-tube`, item.name, g, { x: 0.5, y: 0.08, z: 0.08 }, [glasswareMat]);
  };

  const makeTripodGauze = (item = getApparatusItem('tripod_gauze', 'Tripod & Gauze')) => {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.006, 6, 18), steelMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12;
    g.add(ring);
    [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((angle) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 8), steelMat);
      leg.position.set(Math.cos(angle) * 0.06, 0.04, Math.sin(angle) * 0.06);
      leg.rotation.z = 0.14 * Math.cos(angle);
      g.add(leg);
    });
    const gauze = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 18), blackMat);
    gauze.position.y = 0.125;
    g.add(gauze);
    return registerStorageHover(`${benchId}-tripod-gauze`, item.name, g, { x: 0.22, y: 0.26, z: 0.22 }, [steelMat, blackMat]);
  };

  const makeWoodenSplint = (item = getApparatusItem('wooden_splint', 'Wooden Splint'), lit = false) => {
    const g = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.012, 0.018), woodMat);
    g.add(stick);
    if (lit) {
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), new THREE.MeshStandardMaterial({ color: 0xff7b2f, emissive: 0xff4a00, emissiveIntensity: 0.65 }));
      ember.position.x = 0.145;
      g.add(ember);
    }
    return registerStorageHover(`${benchId}-${lit ? 'burning' : 'wooden'}-splint`, item.name, g, { x: 0.32, y: 0.05, z: 0.06 }, [woodMat]);
  };

  const makeSafetyScreen = (item = getApparatusItem('safety_screen', 'Safety Goggles & Screen')) => {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.02), steelMat);
    frame.position.y = 0.12;
    g.add(frame);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.15), glassMat);
    pane.position.set(0, 0.12, 0.013);
    g.add(pane);
    const feet = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.08), blackMat);
    feet.position.y = 0.015;
    g.add(feet);
    return registerStorageHover(`${benchId}-safety-screen`, item.name, g, { x: 0.28, y: 0.26, z: 0.12 }, [steelMat, glassMat, blackMat]);
  };

  const makeMagnet = (item = getApparatusItem('magnet', 'Magnet')) => {
    const g = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.09, -0.05, 0),
      new THREE.Vector3(-0.09, 0.07, 0),
      new THREE.Vector3(0.09, 0.07, 0),
      new THREE.Vector3(0.09, -0.05, 0),
    ]);
    const body = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.028, 10, false), warningMat);
    g.add(body);
    const tipA = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.06), new THREE.MeshStandardMaterial({ color: 0xd64545, roughness: 0.4 }));
    tipA.position.set(-0.09, -0.05, 0);
    g.add(tipA);
    const tipB = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.06), new THREE.MeshStandardMaterial({ color: 0x3a73d9, roughness: 0.4 }));
    tipB.position.set(0.09, -0.05, 0);
    g.add(tipB);
    return registerStorageHover(`${benchId}-magnet`, item.name, g, { x: 0.28, y: 0.18, z: 0.08 }, [warningMat]);
  };

  const makeThermometer = (item = getApparatusItem('thermometer', 'Thermometer')) => {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 10), glasswareMat);
    stem.position.y = 0.14;
    g.add(stem);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 10), new THREE.MeshStandardMaterial({ color: 0xe04f4f, emissive: 0xb81f1f, emissiveIntensity: 0.12 }));
    bulb.position.y = 0.01;
    g.add(bulb);
    const mercury = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0xe04f4f }));
    mercury.position.y = 0.09;
    g.add(mercury);
    return registerStorageHover(`${benchId}-thermometer`, item.name, g, { x: 0.1, y: 0.34, z: 0.08 }, [glasswareMat]);
  };

  const makeElectrolysisCell = (item = getApparatusItem('electrolysis_cell', 'Electrolysis Cell / Beaker')) => {
    const g = new THREE.Group();
    const beaker = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.105, 0.18, 24, 1, true), glasswareMat);
    beaker.position.y = 0.09;
    g.add(beaker);
    const solution = new THREE.Mesh(new THREE.CylinderGeometry(0.086, 0.086, 0.09, 20), new THREE.MeshStandardMaterial({ color: 0x64b5f6, emissive: 0x3a8ae8, emissiveIntensity: 0.1 }));
    solution.position.y = 0.045;
    g.add(solution);
    [-0.038, 0.038].forEach((x) => {
      const electrode = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.16, 0.012), blackMat);
      electrode.position.set(x, 0.11, 0);
      g.add(electrode);
    });
    return registerStorageHover(`${benchId}-electrolysis-cell`, item.name, g, { x: 0.24, y: 0.26, z: 0.2 }, [glasswareMat, blackMat]);
  };

  const makePowerSupply = (item = getApparatusItem('dc_power_supply', 'DC Power Supply (Battery)')) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.16), meterPanelMat);
    body.position.y = 0.07;
    g.add(body);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.045), meterScreenMat);
    screen.position.set(0, 0.1, 0.081);
    g.add(screen);
    const redPort = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 10), new THREE.MeshStandardMaterial({ color: 0xd14b4b }));
    redPort.rotation.x = Math.PI / 2;
    redPort.position.set(0.055, 0.045, 0.085);
    g.add(redPort);
    const blackPort = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 10), blackMat);
    blackPort.rotation.x = Math.PI / 2;
    blackPort.position.set(-0.055, 0.045, 0.085);
    g.add(blackPort);
    return registerStorageHover(`${benchId}-power-supply`, item.name, g, { x: 0.28, y: 0.18, z: 0.2 }, [meterPanelMat, meterScreenMat, blackMat]);
  };

  const makeWiresClips = (item = getApparatusItem('wires_clips', 'Connecting Wires & Crocodile Clips')) => {
    const g = new THREE.Group();
    const redCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.12, 0, 0),
      new THREE.Vector3(-0.05, 0.08, 0.01),
      new THREE.Vector3(0.05, 0.06, -0.01),
      new THREE.Vector3(0.12, 0.01, 0),
    ]);
    const blackCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.12, -0.03, 0),
      new THREE.Vector3(-0.04, 0.03, 0.01),
      new THREE.Vector3(0.03, 0.01, -0.01),
      new THREE.Vector3(0.12, -0.04, 0),
    ]);
    const redWire = new THREE.Mesh(new THREE.TubeGeometry(redCurve, 24, 0.008, 8, false), new THREE.MeshStandardMaterial({ color: 0xd14b4b }));
    const blackWire = new THREE.Mesh(new THREE.TubeGeometry(blackCurve, 24, 0.008, 8, false), blackMat);
    g.add(redWire);
    g.add(blackWire);
    [-0.12, 0.12].forEach((x, index) => {
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.018, 0.02), index === 0 ? new THREE.MeshStandardMaterial({ color: 0xd14b4b }) : blackMat);
      clip.position.set(x, index === 0 ? 0 : -0.03, 0);
      g.add(clip);
    });
    return registerStorageHover(`${benchId}-wires-clips`, item.name, g, { x: 0.3, y: 0.16, z: 0.08 }, [blackMat]);
  };

  const makeMeter = (item, screenColor, keySuffix) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.08), gaugeMat);
    body.position.y = 0.09;
    g.add(body);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.02, 18), new THREE.MeshStandardMaterial({ color: screenColor, emissive: screenColor, emissiveIntensity: 0.18 }));
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0, 0.11, 0.045);
    g.add(dial);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.006, 0.01), blackMat);
    needle.position.set(0.012, 0.11, 0.055);
    needle.rotation.z = -0.35;
    g.add(needle);
    return registerStorageHover(`${benchId}-${keySuffix}`, item.name, g, { x: 0.2, y: 0.22, z: 0.12 }, [gaugeMat, blackMat]);
  };

  const makeGraphiteElectrodes = (item = getApparatusItem('graphite_electrodes', 'Graphite / Inert Electrodes')) => {
    const g = new THREE.Group();
    [0, 0.06].forEach((x) => {
      const rod = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.24, 0.016), blackMat);
      rod.position.set(x, 0.12, 0);
      g.add(rod);
    });
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.08), toolMat);
    tray.position.set(0.03, 0.015, 0);
    g.add(tray);
    return registerStorageHover(`${benchId}-graphite-electrodes`, item.name, g, { x: 0.18, y: 0.3, z: 0.1 }, [blackMat, toolMat]);
  };

  const makeInvertedTubes = (item = getApparatusItem('inverted_tubes', 'Inverted Test Tubes (gas collection)')) => {
    const g = new THREE.Group();
    const trough = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.14), glasswareMat);
    trough.position.y = 0.025;
    g.add(trough);
    [-0.05, 0.05].forEach((x) => {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.18, 14), glasswareMat);
      tube.position.set(x, 0.14, 0);
      g.add(tube);
    });
    return registerStorageHover(`${benchId}-inverted-tubes`, item.name, g, { x: 0.28, y: 0.28, z: 0.16 }, [glasswareMat]);
  };

  const makeBulbCircuit = (item = getApparatusItem('bulb_circuit', 'Conductivity Tester / Bulb Circuit')) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.14), meterPanelMat);
    base.position.y = 0.02;
    g.add(base);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), new THREE.MeshStandardMaterial({ color: 0xfff3a0, emissive: 0xffe061, emissiveIntensity: 0.42 }));
    bulb.position.y = 0.1;
    g.add(bulb);
    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 8), steelMat);
    leftPost.position.set(-0.05, 0.06, 0);
    g.add(leftPost);
    const rightPost = leftPost.clone();
    rightPost.position.x = 0.05;
    g.add(rightPost);
    return registerStorageHover(`${benchId}-bulb-circuit`, item.name, g, { x: 0.28, y: 0.18, z: 0.16 }, [meterPanelMat, steelMat]);
  };

  const makeCylinderBalance = (item = getApparatusItem('cylinder_balance', 'Measuring Cylinder & Weighing Balance')) => {
    const g = new THREE.Group();
    const scale = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.16), gaugeMat);
    scale.position.set(-0.06, 0.02, 0);
    g.add(scale);
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.015, 14), steelMat);
    platform.position.set(-0.06, 0.055, 0);
    g.add(platform);
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.2, 14), glasswareMat);
    cylinder.position.set(0.08, 0.1, 0);
    g.add(cylinder);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.018, 12), toolMat);
    base.position.set(0.08, 0.01, 0);
    g.add(base);
    return registerStorageHover(`${benchId}-cylinder-balance`, item.name, g, { x: 0.3, y: 0.26, z: 0.16 }, [gaugeMat, steelMat, glasswareMat, toolMat]);
  };

  const makeToolModel = (item) => {
    switch (item.icon) {
      case 'beaker': return makeBeaker(item);
      case 'test_tube': return makeTestTube(item);
      case 'rack': return makeTestTubeRack(item);
      case 'dropper': return makeDropper(item);
      case 'burette': return makeBurette(item);
      case 'conical_flask': return makeConicalFlask(item);
      case 'stirring_rod': return makeStirringRod(item);
      case 'delivery_tube': return makeDeliveryTube(item, /stopper/i.test(item.name));
      case 'litmus_paper': return makeLitmusPack(item);
      case 'watch_glass': return makeWatchGlass(item);
      case 'measuring_cylinder': return makeMeasuringCylinder(item);
      case 'ph_meter': return makePhMeter(item);
      case 'bunsen_burner': return makeBunsenBurner(item);
      case 'deflagrating_spoon': return makeDeflagratingSpoon(item);
      case 'gas_jar': return makeGasJar(item);
      case 'crucible': return makeCrucible(item);
      case 'boiling_tube': return makeBoilingTube(item);
      case 'crucible_tongs':
      case 'tongs': return makeTongs(item);
      case 'heatproof_mat': return makeHeatproofMat(item);
      case 'combustion_tube': return makeCombustionTube(item);
      case 'tripod_gauze': return makeTripodGauze(item);
      case 'wooden_splint': return makeWoodenSplint(item);
      case 'safety_screen': return makeSafetyScreen(item);
      case 'magnet': return makeMagnet(item);
      case 'thermometer': return makeThermometer(item);
      case 'electrolysis_cell': return makeElectrolysisCell(item);
      case 'dc_power_supply': return makePowerSupply(item);
      case 'wires_clips': return makeWiresClips(item);
      case 'ammeter': return makeMeter(item, 0xa6e8ff, 'ammeter');
      case 'voltmeter': return makeMeter(item, 0xffe79b, 'voltmeter');
      case 'graphite_electrodes': return makeGraphiteElectrodes(item);
      case 'inverted_tubes': return makeInvertedTubes(item);
      case 'glowing_splint': return makeWoodenSplint(item);
      case 'burning_splint': return makeWoodenSplint(item, true);
      case 'bulb_circuit': return makeBulbCircuit(item);
      case 'cylinder_balance': return makeCylinderBalance(item);
      default: {
        const g = new THREE.Group();
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.12), toolMat);
        box.position.y = 0.06;
        g.add(box);
        return registerStorageHover(`${benchId}-${item.icon}`, item.name, g, { x: 0.2, y: 0.16, z: 0.16 }, [toolMat]);
      }
    }
  };

  const deskLayouts = {
    acidBase: [
      { pos: [-0.94, 0.13, 0.18], item: getApparatusItem('beaker', 'Beaker') },
      { pos: [-0.54, 0.07, 0.23], item: getApparatusItem('test_tube', 'Test Tube') },
      { pos: [-0.1, 0.08, 0.16], item: getApparatusItem('rack', 'Test Tube Rack') },
      { pos: [0.34, 0.08, 0.2], item: getApparatusItem('litmus_paper', 'Litmus Paper Strips') },
      { pos: [0.72, 0.08, 0.22], item: getApparatusItem('watch_glass', 'Watch Glass') },
      { pos: [1.03, 0.03, 0.12], item: getApparatusItem('ph_meter', 'pH Meter') },
      { pos: [-0.95, 0.52, 0.15], item: getApparatusItem('dropper', 'Dropper / Pipette'), rotZ: 0.06 },
      { pos: [-0.32, 0.56, 0.17], item: getApparatusItem('burette', 'Burette') },
      { pos: [0.25, 0.47, 0.12], item: getApparatusItem('conical_flask', 'Conical Flask') },
      { pos: [0.72, 0.56, 0.22], item: getApparatusItem('stirring_rod', 'Stirring Rod'), rotZ: -0.12 },
      { pos: [0.97, 0.52, 0.12], item: getApparatusItem('delivery_tube', 'Delivery Tube') },
      { pos: [-1.15, 0.45, -0.18], item: getApparatusItem('measuring_cylinder', 'Measuring Cylinder') },
    ],
    combustion: [
      { pos: [-0.95, 0.06, 0.19], item: getApparatusItem('heatproof_mat', 'Heat-Proof Mat') },
      { pos: [-0.52, 0.03, 0.18], item: getApparatusItem('bunsen_burner', 'Bunsen Burner') },
      { pos: [-0.12, 0.05, 0.16], item: getApparatusItem('crucible', 'Crucible with Lid') },
      { pos: [0.32, 0.08, 0.17], item: getApparatusItem('wooden_splint', 'Wooden Splint'), rotZ: 0.16 },
      { pos: [0.73, 0.06, 0.2], item: getApparatusItem('crucible_tongs', 'Crucible Tongs'), rotZ: -0.12 },
      { pos: [1.04, 0.02, 0.12], item: getApparatusItem('safety_screen', 'Safety Goggles & Screen') },
      { pos: [-0.98, 0.53, 0.16], item: getApparatusItem('deflagrating_spoon', 'Deflagrating Spoon'), rotZ: -0.08 },
      { pos: [-0.42, 0.46, 0.1], item: getApparatusItem('gas_jar', 'Gas Jar / Bell Jar') },
      { pos: [0.12, 0.52, 0.12], item: getApparatusItem('delivery_tube', 'Delivery Tube & Stopper') },
      { pos: [0.52, 0.49, 0.15], item: getApparatusItem('boiling_tube', 'Boiling Tube'), rotZ: -0.08 },
      { pos: [0.98, 0.54, 0.14], item: getApparatusItem('combustion_tube', 'Combustion Tube (Hard Glass)'), rotZ: 0.08 },
      { pos: [-1.14, 0.43, -0.18], item: getApparatusItem('tripod_gauze', 'Tripod & Gauze') },
    ],
    synthesis: [
      { pos: [-0.96, 0.08, 0.22], item: getApparatusItem('test_tube', 'Test Tube') },
      { pos: [-0.55, 0.08, 0.16], item: getApparatusItem('rack', 'Test Tube Rack') },
      { pos: [-0.06, 0.13, 0.19], item: getApparatusItem('beaker', 'Beaker') },
      { pos: [0.34, 0.08, 0.16], item: getApparatusItem('dropper', 'Dropper / Pipette'), rotZ: 0.2 },
      { pos: [0.71, 0.03, 0.17], item: getApparatusItem('magnet', 'Magnet') },
      { pos: [1.05, 0.02, 0.1], item: getApparatusItem('thermometer', 'Thermometer') },
      { pos: [-0.98, 0.5, 0.15], item: getApparatusItem('bunsen_burner', 'Bunsen Burner') },
      { pos: [-0.4, 0.47, 0.13], item: getApparatusItem('crucible', 'Crucible with Lid') },
      { pos: [0.02, 0.52, 0.16], item: getApparatusItem('tongs', 'Tongs / Crucible Tongs'), rotZ: -0.12 },
      { pos: [0.46, 0.45, 0.13], item: getApparatusItem('heatproof_mat', 'Heat-proof Mat') },
      { pos: [0.82, 0.52, 0.14], item: getApparatusItem('delivery_tube', 'Delivery Tube') },
      { pos: [1.08, 0.46, -0.16], item: getApparatusItem('gas_jar', 'Gas Jar with Lid') },
    ],
    electrochemistry: [
      { pos: [-0.96, 0.12, 0.16], item: getApparatusItem('electrolysis_cell', 'Electrolysis Cell / Beaker') },
      { pos: [-0.55, 0.03, 0.16], item: getApparatusItem('dc_power_supply', 'DC Power Supply (Battery)') },
      { pos: [-0.1, 0.08, 0.16], item: getApparatusItem('wires_clips', 'Connecting Wires & Crocodile Clips') },
      { pos: [0.3, 0.03, 0.17], item: getApparatusItem('ammeter', 'Ammeter') },
      { pos: [0.7, 0.03, 0.17], item: getApparatusItem('voltmeter', 'Voltmeter') },
      { pos: [1.03, 0.03, 0.13], item: getApparatusItem('graphite_electrodes', 'Graphite / Inert Electrodes') },
      { pos: [-0.98, 0.48, 0.14], item: getApparatusItem('inverted_tubes', 'Inverted Test Tubes (gas collection)') },
      { pos: [-0.46, 0.54, 0.2], item: getApparatusItem('glowing_splint', 'Glowing Splint (O2 test)'), rotZ: -0.22 },
      { pos: [-0.04, 0.54, 0.18], item: getApparatusItem('burning_splint', 'Burning Splint (H2 test)'), rotZ: 0.22 },
      { pos: [0.35, 0.08, 0.21], item: getApparatusItem('litmus_paper', 'Moist Litmus Paper (Cl2 test)') },
      { pos: [0.81, 0.04, 0.16], item: getApparatusItem('bulb_circuit', 'Conductivity Tester / Bulb Circuit') },
      { pos: [1.09, 0.03, -0.16], item: getApparatusItem('cylinder_balance', 'Measuring Cylinder & Weighing Balance') },
    ],
  };

  (deskLayouts[deskKey] ?? []).forEach(({ item, pos, rotZ = 0, scale = 1 }) => {
    const model = makeToolModel(item);
    model.position.set(...pos);
    model.rotation.z = rotZ;
    model.scale.setScalar(scale);
    group.add(model);
  });

  const leftDoorPivot = new THREE.Group();
  leftDoorPivot.position.set(-1.16, 0.46, 0.63);
  const leftDoor = new THREE.Group();
  const leftGlass = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.68, 0.02), glassMat);
  leftGlass.position.set(0.525, 0, 0);
  leftDoor.add(leftGlass);
  const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.68, 0.025), glassEdgeMat);
  leftFrame.position.set(0.525, 0, -0.008);
  leftDoor.add(leftFrame);
  const leftInset = new THREE.Mesh(new THREE.BoxGeometry(0.93, 0.56, 0.026), glassMat);
  leftInset.position.set(0.525, 0, 0.005);
  leftDoor.add(leftInset);
  const leftHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 8), glassEdgeMat);
  leftHandle.rotation.z = Math.PI / 2;
  leftHandle.position.set(0.94, -0.02, 0.03);
  leftDoor.add(leftHandle);
  leftDoorPivot.add(leftDoor);
  group.add(leftDoorPivot);

  const rightDoorPivot = new THREE.Group();
  rightDoorPivot.position.set(1.16, 0.46, 0.63);
  const rightDoor = new THREE.Group();
  const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.68, 0.02), glassMat);
  rightGlass.position.set(-0.525, 0, 0);
  rightDoor.add(rightGlass);
  const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.68, 0.025), glassEdgeMat);
  rightFrame.position.set(-0.525, 0, -0.008);
  rightDoor.add(rightFrame);
  const rightInset = new THREE.Mesh(new THREE.BoxGeometry(0.93, 0.56, 0.026), glassMat);
  rightInset.position.set(-0.525, 0, 0.005);
  rightDoor.add(rightInset);
  const rightHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 8), glassEdgeMat);
  rightHandle.rotation.z = Math.PI / 2;
  rightHandle.position.set(-0.94, -0.02, 0.03);
  rightDoor.add(rightHandle);
  rightDoorPivot.add(rightDoor);
  group.add(rightDoorPivot);

  const doorHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(2.36, 0.78, 0.26),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  doorHitbox.position.set(0, 0.46, 0.58);
  doorHitbox.userData.storageBenchId = benchId;
  doorHitbox.userData.benchAction = 'toggle-compartment';
  doorHitbox.userData.hoverName = `Open ${benchTitle} Apparatus Cabinet`;
  clickTargets.push(doorHitbox);
  group.add(doorHitbox);

  const toggle = () => {
    state.open = !state.open;
    gsap.to(leftDoorPivot.rotation, {
      y: state.open ? -1.08 : 0,
      duration: 0.56,
      ease: 'power2.inOut',
    });
    gsap.to(rightDoorPivot.rotation, {
      y: state.open ? 1.08 : 0,
      duration: 0.56,
      ease: 'power2.inOut',
    });
    doorHitbox.userData.hoverName = state.open
      ? `Close ${benchTitle} Apparatus Cabinet`
      : `Open ${benchTitle} Apparatus Cabinet`;
  };

  return { group, clickTargets, toggle };
}

// ─── Bench title canvas ───────────────────────────────────────────────────────

function createTitleTexture(title, accentHex) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 160;
  const ctx = cv.getContext('2d');

  // Bright control-panel style backing
  ctx.fillStyle = 'rgba(42,42,53,0.9)';
  ctx.fillRect(0, 0, cv.width, cv.height);

  // Accent border
  ctx.strokeStyle = `#${accentHex.toString(16).padStart(6, '0')}`;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, cv.width - 8, cv.height - 8);

  // Title text
  ctx.fillStyle = '#f2f4f8';
  ctx.font = '600 40px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, cv.width / 2, cv.height / 2);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── Main bench factory ───────────────────────────────────────────────────────

export function createBench({ id, title, position, accent, cameraOffsetX = 0, chemicals = [], apparatus = [], deskKey = null }) {
  const group = new THREE.Group();
  group.name = `${id}-bench`;
  group.position.copy(position);

  const itemHoverTargets = [];
  const clickTargets     = [];
  const hoverControllers = new Map();
  const apparatusHighlightKeys = new Map();
  let experimentHighlightKeys = new Set();
  let hoveredKey         = null;
  let compartmentToggle  = null;

  // Materials — bright sci-fi palette
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x3a3a4a, roughness: 0.7, metalness: 0.1,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x585f6a, roughness: 0.42, metalness: 0.42,
  });
  const topMat = new THREE.MeshStandardMaterial({
    color: 0xddd9d0, roughness: 0.22, metalness: 0.05,
    emissive: 0xffffff, emissiveIntensity: 0.02,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xff8c00, emissive: 0xff8c00, emissiveIntensity: 0.45,
    roughness: 0.22, metalness: 0.1,
  });

  const storage = createDeskStorage(id, title, apparatus, itemHoverTargets, hoverControllers, accent, deskKey, apparatusHighlightKeys);
  group.add(storage.group);
  clickTargets.push(...storage.clickTargets);
  compartmentToggle = storage.toggle;

  // Surface top
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.13, 1.5), topMat);
  top.position.y = 0.98; top.castShadow = top.receiveShadow = true;
  group.add(top);

  // Under-shelf
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.05), frameMat);
  shelf.position.y = 0.54; shelf.castShadow = shelf.receiveShadow = true;
  group.add(shelf);

  // Legs
  [[-1.2, -0.58], [1.2, -0.58], [-1.2, 0.58], [1.2, 0.58]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.88, 0.12), frameMat);
    leg.position.set(lx, 0.44, lz); leg.castShadow = true;
    group.add(leg);
  });

  // Accent strip (front edge, fixed orange trim)
  const strip = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.05, 0.08), accentMat);
  strip.position.set(0, 0.83, 0.72);
  group.add(strip);

  // Reagent rack + apparatus
  group.add(createReagentRack(accent, itemHoverTargets, hoverControllers, chemicals, deskKey));
  group.add(createBeaker(-0.84, 0.18, accent, itemHoverTargets, hoverControllers));
  group.add(createFlask(-0.18, -0.02, accent, itemHoverTargets, hoverControllers));
  group.add(createTubeRack(0.38, 0.26, itemHoverTargets, hoverControllers));
  group.add(createBurner(0.95, 0.12, itemHoverTargets, hoverControllers));

  // Title plate (behind rack)
  const titleMat = new THREE.MeshBasicMaterial({
    map: createTitleTexture(title, accent), transparent: true, opacity: 0.9,
  });
  const titlePlate = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.68), titleMat);
  titlePlate.position.set(0, 2.75, 0.05);
  titleMat.depthTest = false;
  group.add(titlePlate);

  const titleGlowMat = new THREE.MeshBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    depthTest: false,
  });
  const titleGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.45, 0.84), titleGlowMat);
  titleGlow.position.set(0, 2.75, 0.02);
  group.add(titleGlow);

  const titleHitbox = new THREE.Mesh(
    new THREE.PlaneGeometry(2.45, 0.92),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
  );
  titleHitbox.position.set(0, 2.75, 0.09);
  titleHitbox.userData.benchId = id;
  titleHitbox.userData.benchAction = 'focus';
  titleHitbox.userData.hoverName = `${title} Table`;
  group.add(titleHitbox);
  clickTargets.push(titleHitbox);

  // State + highlight
  const state = { active: false, hovered: false };

  function refresh() {
    const emphasis = state.active ? 1 : state.hovered ? 0.55 : 0;
    topMat.emissiveIntensity   = 0.02 + emphasis * 0.12;
    accentMat.emissiveIntensity = 0.45 + emphasis * 0.85;
    titleMat.opacity           = 0.9  + emphasis * 0.1;
    titleGlowMat.opacity       = 0.16 + emphasis * 0.32;
    titlePlate.scale.setScalar(1 + emphasis * 0.04);
    titleGlow.scale.setScalar(1 + emphasis * 0.08);
  }

  refresh();

  // Focus zone (where camera moves to on click)
  const focusZone = {
    label: title,
    position: new THREE.Vector3(position.x + cameraOffsetX, 1.58, position.z + 2.15),
    lookAt:   new THREE.Vector3(position.x, 1.02, position.z - 0.05),
  };

  return {
    group,
    itemHoverTargets,
    clickTargets,
    focusZone,
    handleAction(action) {
      if (action === 'toggle-compartment') {
        compartmentToggle?.();
      }
    },
    setHovered(v)  { state.hovered = v; refresh(); },
    setActive(v)   { state.active  = v; refresh(); },
    setExperimentApparatusNames(names = []) {
      const nextKeys = new Set(
        names
          .map(normalizeToolKey)
          .map(name => apparatusHighlightKeys.get(name))
          .filter(Boolean)
      );

      experimentHighlightKeys.forEach((key) => {
        if (!nextKeys.has(key) && hoveredKey !== key) {
          hoverControllers.get(key)?.(false);
        }
      });

      nextKeys.forEach((key) => hoverControllers.get(key)?.(true));
      experimentHighlightKeys = nextKeys;
    },
    setHoveredObject(nextKey) {
      if (hoveredKey === nextKey) return;
      if (hoveredKey) hoverControllers.get(hoveredKey)?.(experimentHighlightKeys.has(hoveredKey));
      hoveredKey = nextKey;
      if (hoveredKey) hoverControllers.get(hoveredKey)?.(true);
    },
  };
}
