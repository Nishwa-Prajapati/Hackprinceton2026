/**
 * BenchBuilder — 3D apparatus models ported from main branch, reskinned for
 * the bright sci-fi lab aesthetic (#2a2a35 base, #ddd9d0 tops, #FF8C00 orange, #00D4FF cyan).
 */
import * as THREE from 'three';

// ─── Reagent data (from main branch) ─────────────────────────────────────────

export const REAGENT_LABELS = [
  'HCl','NaOH','H2SO4','Ethanol','CuSO4','H2O',
  'NH3','AgNO3','NaCl','KMnO4','Acetone','FeCl3',
];

export const REAGENT_NAMES = {
  HCl:     'Hydrochloric Acid (HCl)',
  NaOH:    'Sodium Hydroxide (NaOH)',
  H2SO4:   'Sulfuric Acid (H2SO4)',
  Ethanol: 'Ethanol',
  CuSO4:   'Copper Sulfate (CuSO4)',
  H2O:     'Distilled Water (H2O)',
  NH3:     'Ammonia (NH3)',
  AgNO3:   'Silver Nitrate (AgNO3)',
  NaCl:    'Sodium Chloride (NaCl)',
  KMnO4:   'Potassium Permanganate (KMnO4)',
  Acetone: 'Acetone',
  FeCl3:   'Ferric Chloride (FeCl3)',
};

const LIQUID_COLORS = [
  0x69c5ff, 0xffce6b, 0xa980ff, 0x70d99e,
  0x4f8dff, 0xb6e3ff, 0xff9c76, 0xf8d96b,
  0x97d4ff, 0xbf79ff, 0xffb97c, 0xdbc35e,
];

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

function createBottle({ label, color, x, y, z }, hoverTargets, hoverControllers) {
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

  const hb = createHoverHitbox(0.13, 0.58);
  hb.position.y = 0.24;
  g.add(hb);
  g.position.set(x, y, z);
  registerHoverTarget(hoverTargets, hoverControllers, `bottle-${label}-${x}`, REAGENT_NAMES[label] ?? label, hb, g, [glassMat, liquidMat, capMat], { hoverScale: 1.05, emissiveBoost: 0.14 });
  return g;
}

function createReagentRack(accentColor, hoverTargets, hoverControllers) {
  const g = new THREE.Group();

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
  REAGENT_LABELS.forEach((label, i) => {
    const row = i < 6 ? 0 : 1;
    const col = i % 6;
    g.add(createBottle({
      label, color: LIQUID_COLORS[i % LIQUID_COLORS.length],
      x: -0.85 + col * spacing,
      y: row === 0 ? 1.18 : 1.54,
      z: row === 0 ? -0.28 : -0.48,
    }, hoverTargets, hoverControllers));
  });

  return g;
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

export function createBench({ id, title, position, accent, cameraOffsetX = 0 }) {
  const group = new THREE.Group();
  group.name = `${id}-bench`;
  group.position.copy(position);

  const itemHoverTargets = [];
  const clickTargets     = [];
  const hoverControllers = new Map();
  let hoveredKey         = null;

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

  // Body
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.92, 1.36), bodyMat);
  base.position.y = 0.46; base.castShadow = base.receiveShadow = true;
  group.add(base);

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

  const tableHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(2.95, 0.32, 1.72),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  tableHitbox.position.set(0, 1.02, 0);
  tableHitbox.userData.benchId = id;
  tableHitbox.userData.hoverName = `${title} Table`;
  group.add(tableHitbox);
  clickTargets.push(tableHitbox);

  // Reagent rack + apparatus
  group.add(createReagentRack(accent, itemHoverTargets, hoverControllers));
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
  titleHitbox.userData.hoverName = `${title} Table`;
  group.add(titleHitbox);

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
    setHovered(v)  { state.hovered = v; refresh(); },
    setActive(v)   { state.active  = v; refresh(); },
    setHoveredObject(nextKey) {
      if (hoveredKey === nextKey) return;
      if (hoveredKey) hoverControllers.get(hoveredKey)?.(false);
      hoveredKey = nextKey;
      if (hoveredKey) hoverControllers.get(hoveredKey)?.(true);
    },
  };
}
