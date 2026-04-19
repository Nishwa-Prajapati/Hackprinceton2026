import * as THREE from "three";

const REAGENT_LABELS = [
  "HCl",
  "NaOH",
  "H2SO4",
  "Ethanol",
  "CuSO4",
  "H2O",
  "NH3",
  "AgNO3",
  "NaCl",
  "KMnO4",
  "Acetone",
  "FeCl3"
];

const REAGENT_NAMES = {
  HCl: "Hydrochloric Acid (HCl)",
  NaOH: "Sodium Hydroxide (NaOH)",
  H2SO4: "Sulfuric Acid (H2SO4)",
  Ethanol: "Ethanol",
  CuSO4: "Copper Sulfate (CuSO4)",
  H2O: "Distilled Water (H2O)",
  NH3: "Ammonia (NH3)",
  AgNO3: "Silver Nitrate (AgNO3)",
  NaCl: "Sodium Chloride (NaCl)",
  KMnO4: "Potassium Permanganate (KMnO4)",
  Acetone: "Acetone",
  FeCl3: "Ferric Chloride (FeCl3)"
};

const LIQUID_COLORS = [
  0x69c5ff,
  0xffce6b,
  0xa980ff,
  0x70d99e,
  0x4f8dff,
  0xb6e3ff,
  0xff9c76,
  0xf8d96b,
  0x97d4ff,
  0xbf79ff,
  0xffb97c,
  0xdbc35e
];

function createCanvasTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  draw(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createTitleTexture(title, accent) {
  return createCanvasTexture(512, 160, (context, width, height) => {
    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(241, 245, 249, 0.95)";
    context.fillRect(8, 8, width - 16, height - 16);

    context.strokeStyle = `#${accent.toString(16).padStart(6, "0")}`;
    context.lineWidth = 10;
    context.strokeRect(8, 8, width - 16, height - 16);

    context.fillStyle = "#102033";
    context.font = "700 44px 'Segoe UI', sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(title, width / 2, height / 2);
  });
}

function createLeg(material, x, z) {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.88, 0.12), material);
  leg.position.set(x, 0.44, z);
  leg.castShadow = true;
  leg.receiveShadow = true;
  return leg;
}

function createHoverHitbox(radius, height) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 12),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false
    })
  );
}

function registerHoverTarget(
  targets,
  controllers,
  key,
  name,
  hitObject,
  scaleTarget,
  materials,
  options = {}
) {
  const baseScale = scaleTarget.scale.clone();
  const hoverScale = options.hoverScale ?? 1.06;
  const emissiveBoost = options.emissiveBoost ?? 0.18;
  const trackedMaterials = materials
    .filter(Boolean)
    .map((material) => ({
      material,
      baseEmissiveIntensity:
        typeof material.emissiveIntensity === "number" ? material.emissiveIntensity : 0
    }));

  hitObject.userData.hoverKey = key;
  hitObject.userData.hoverName = name;
  targets.push(hitObject);

  controllers.set(key, (hovered) => {
    scaleTarget.scale.copy(baseScale).multiplyScalar(hovered ? hoverScale : 1);
    trackedMaterials.forEach(({ material, baseEmissiveIntensity }) => {
      if ("emissiveIntensity" in material) {
        material.emissiveIntensity = baseEmissiveIntensity + (hovered ? emissiveBoost : 0);
      }
    });
  });
}

function createBeaker(x, z, hoverTargets, hoverControllers) {
  const beaker = new THREE.Group();

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe6f2ff,
    roughness: 0.08,
    transmission: 0.92,
    transparent: true,
    opacity: 0.72,
    thickness: 0.2
  });
  const liquidMaterial = new THREE.MeshStandardMaterial({
    color: 0x6ac6ff,
    emissive: 0x6ac6ff,
    emissiveIntensity: 0.08,
    roughness: 0.18
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.36, 24), glassMaterial);
  body.position.y = 0.18;
  body.castShadow = true;
  body.receiveShadow = true;
  beaker.add(body);

  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.18, 24),
    liquidMaterial
  );
  liquid.position.y = 0.1;
  beaker.add(liquid);

  const hitbox = createHoverHitbox(0.18, 0.44);
  hitbox.position.y = 0.18;
  beaker.add(hitbox);

  beaker.position.set(x, 1.02, z);
  registerHoverTarget(
    hoverTargets,
    hoverControllers,
    `beaker-${x}-${z}`,
    "Beaker",
    hitbox,
    beaker,
    [glassMaterial, liquidMaterial]
  );

  return beaker;
}

function createFlask(x, z, liquidColor, hoverTargets, hoverControllers) {
  const flask = new THREE.Group();

  const flaskMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf5fbff,
    roughness: 0.08,
    transmission: 0.9,
    transparent: true,
    opacity: 0.58,
    thickness: 0.25
  });
  const liquidMaterial = new THREE.MeshStandardMaterial({
    color: liquidColor,
    emissive: liquidColor,
    emissiveIntensity: 0.12,
    roughness: 0.16
  });

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), flaskMaterial);
  bulb.position.y = 0.12;
  bulb.castShadow = true;
  flask.add(bulb);

  const liquid = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 24, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    liquidMaterial
  );
  liquid.position.y = 0.03;
  flask.add(liquid);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.34, 16), flaskMaterial);
  neck.position.y = 0.34;
  neck.castShadow = true;
  flask.add(neck);

  const hitbox = createHoverHitbox(0.18, 0.58);
  hitbox.position.y = 0.22;
  flask.add(hitbox);

  flask.position.set(x, 1.03, z);
  registerHoverTarget(
    hoverTargets,
    hoverControllers,
    `flask-${x}-${z}`,
    "Conical Flask",
    hitbox,
    flask,
    [flaskMaterial, liquidMaterial]
  );

  return flask;
}

function createBurner(x, z, hoverTargets, hoverControllers) {
  const burner = new THREE.Group();

  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x677383,
    metalness: 0.72,
    roughness: 0.28,
    emissive: 0x000000,
    emissiveIntensity: 0
  });
  const flameMaterial = new THREE.MeshStandardMaterial({
    color: 0xffb34d,
    emissive: 0xff8a1d,
    emissiveIntensity: 0.82
  });

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.08, 20),
    metalMaterial
  );
  base.position.y = 0.04;
  base.castShadow = true;
  burner.add(base);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.25, 16),
    metalMaterial
  );
  stem.position.y = 0.18;
  stem.castShadow = true;
  burner.add(stem);

  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 16), flameMaterial);
  flame.position.y = 0.39;
  burner.add(flame);

  const hitbox = createHoverHitbox(0.14, 0.56);
  hitbox.position.y = 0.22;
  burner.add(hitbox);

  burner.position.set(x, 1, z);
  registerHoverTarget(
    hoverTargets,
    hoverControllers,
    `burner-${x}-${z}`,
    "Bunsen Burner",
    hitbox,
    burner,
    [metalMaterial, flameMaterial]
  );

  return burner;
}

function createTubeRack(x, z, hoverTargets, hoverControllers) {
  const rack = new THREE.Group();
  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x8e9cb0,
    metalness: 0.35,
    roughness: 0.46,
    emissive: 0x000000,
    emissiveIntensity: 0
  });
  const tubeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf6fbff,
    roughness: 0.04,
    transmission: 0.94,
    transparent: true,
    opacity: 0.62,
    thickness: 0.1
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.18), railMaterial);
  base.position.y = 0.03;
  base.castShadow = true;
  rack.add(base);

  const top = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.18), railMaterial);
  top.position.y = 0.28;
  top.castShadow = true;
  rack.add(top);

  [-0.21, -0.07, 0.07, 0.21].forEach((offset) => {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.26, 18), tubeMaterial);
    tube.position.set(offset, 0.14, 0);
    tube.castShadow = true;
    rack.add(tube);
  });

  const hitbox = createHoverHitbox(0.36, 0.4);
  hitbox.position.y = 0.15;
  rack.add(hitbox);

  rack.position.set(x, 1.01, z);
  registerHoverTarget(
    hoverTargets,
    hoverControllers,
    `tube-rack-${x}-${z}`,
    "Test Tube Rack",
    hitbox,
    rack,
    [railMaterial, tubeMaterial]
  );

  return rack;
}

function createBottle({ label, color, x, y, z }, hoverTargets, hoverControllers) {
  const bottle = new THREE.Group();

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf5fbff,
    roughness: 0.08,
    transmission: 0.9,
    transparent: true,
    opacity: 0.52,
    thickness: 0.2
  });
  const liquidMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.14,
    roughness: 0.18
  });
  const capMaterial = new THREE.MeshStandardMaterial({
    color: 0x48586a,
    roughness: 0.42,
    metalness: 0.22,
    emissive: 0x000000,
    emissiveIntensity: 0
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.1, 0.34, 20), glassMaterial);
  body.position.y = 0.17;
  body.castShadow = true;
  bottle.add(body);

  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.084, 0.19, 20),
    liquidMaterial
  );
  liquid.position.y = 0.095;
  bottle.add(liquid);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.11, 16), glassMaterial);
  neck.position.y = 0.395;
  neck.castShadow = true;
  bottle.add(neck);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16), capMaterial);
  cap.position.y = 0.48;
  cap.castShadow = true;
  bottle.add(cap);

  const hitbox = createHoverHitbox(0.13, 0.58);
  hitbox.position.y = 0.24;
  bottle.add(hitbox);

  bottle.position.set(x, y, z);
  registerHoverTarget(
    hoverTargets,
    hoverControllers,
    `bottle-${label}-${x}-${y}-${z}`,
    REAGENT_NAMES[label] ?? label,
    hitbox,
    bottle,
    [glassMaterial, liquidMaterial, capMaterial],
    {
      hoverScale: 1.05,
      emissiveBoost: 0.12
    }
  );

  return bottle;
}

function createReagentRack(hoverTargets, hoverControllers) {
  const rack = new THREE.Group();
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x6f7b8b,
    roughness: 0.42,
    metalness: 0.56
  });
  const shelfMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8edf3,
    roughness: 0.36,
    metalness: 0.08
  });

  const baseShelf = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.08, 0.38), shelfMaterial);
  baseShelf.position.set(0, 1.14, -0.38);
  baseShelf.castShadow = true;
  baseShelf.receiveShadow = true;
  rack.add(baseShelf);

  const upperShelf = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.08, 0.38), shelfMaterial);
  upperShelf.position.set(0, 1.5, -0.38);
  upperShelf.castShadow = true;
  upperShelf.receiveShadow = true;
  rack.add(upperShelf);

  [
    [-0.94, 1.31],
    [0.94, 1.31],
    [-0.94, 1.57],
    [0.94, 1.57]
  ].forEach(([x, y]) => {
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), frameMaterial);
    support.position.set(x, y, -0.38);
    support.castShadow = true;
    support.receiveShadow = true;
    rack.add(support);
  });

  const rearRail = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 0.08), frameMaterial);
  rearRail.position.set(0, 1.69, -0.54);
  rearRail.castShadow = true;
  rack.add(rearRail);

  const spacing = 0.34;
  REAGENT_LABELS.forEach((label, index) => {
    const row = index < 6 ? 0 : 1;
    const column = index % 6;
    const x = -0.85 + column * spacing;
    const y = row === 0 ? 1.18 : 1.54;
    const z = row === 0 ? -0.28 : -0.48;

    rack.add(
      createBottle(
        {
          label,
          color: LIQUID_COLORS[index % LIQUID_COLORS.length],
          x,
          y,
          z
        },
        hoverTargets,
        hoverControllers
      )
    );
  });

  return rack;
}

export function createBench({ id, title, position, accent, cameraOffsetX = 0 }) {
  const group = new THREE.Group();
  group.name = `${id}-bench`;
  group.position.copy(position);

  const hoverTargets = [];
  const hoverControllers = new Map();
  let hoveredObjectKey = null;

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xdce3eb,
    roughness: 0.76,
    metalness: 0.06
  });
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x6d7886,
    roughness: 0.45,
    metalness: 0.58
  });
  const topMaterial = new THREE.MeshStandardMaterial({
    color: 0xf9fbfd,
    roughness: 0.28,
    metalness: 0.08,
    emissive: accent,
    emissiveIntensity: 0.03
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 0.34,
    roughness: 0.2,
    metalness: 0.08
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.92, 1.36), bodyMaterial);
  base.position.y = 0.46;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.13, 1.5), topMaterial);
  tableTop.position.y = 0.98;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  group.add(tableTop);

  const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.05), frameMaterial);
  shelf.position.y = 0.54;
  shelf.castShadow = true;
  shelf.receiveShadow = true;
  group.add(shelf);

  [
    [-1.2, -0.58],
    [1.2, -0.58],
    [-1.2, 0.58],
    [1.2, 0.58]
  ].forEach(([x, z]) => group.add(createLeg(frameMaterial, x, z)));

  const accentStrip = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.05, 0.08), accentMaterial);
  accentStrip.position.set(0, 0.83, 0.72);
  accentStrip.castShadow = true;
  group.add(accentStrip);

  group.add(createReagentRack(hoverTargets, hoverControllers));
  group.add(createBeaker(-0.84, 0.18, hoverTargets, hoverControllers));
  group.add(createFlask(-0.18, -0.02, accent, hoverTargets, hoverControllers));
  group.add(createTubeRack(0.38, 0.26, hoverTargets, hoverControllers));
  group.add(createBurner(0.95, 0.12, hoverTargets, hoverControllers));

  const titleTexture = createTitleTexture(title, accent);
  const titleMaterial = new THREE.MeshBasicMaterial({
    map: titleTexture,
    transparent: true,
    opacity: 0.84
  });
  const titlePlate = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.58), titleMaterial);
  titlePlate.position.set(0, 2.06, -0.82);
  group.add(titlePlate);

  const state = {
    active: false,
    hovered: false
  };

  function refreshBenchHighlight() {
    const emphasis = state.active ? 1 : state.hovered ? 0.6 : 0;
    topMaterial.emissiveIntensity = 0.03 + emphasis * 0.26;
    accentMaterial.emissiveIntensity = 0.34 + emphasis * 0.76;
    titleMaterial.opacity = 0.84 + emphasis * 0.14;
  }

  refreshBenchHighlight();

  return {
    group,
    hoverTargets,
    markerPosition: new THREE.Vector3(position.x, 2.1, position.z + 0.08),
    focusZone: {
      position: new THREE.Vector3(position.x + cameraOffsetX, 1.64, position.z + 2.55),
      lookAt: new THREE.Vector3(position.x, 1.08, position.z),
      label: title
    },
    setHovered(nextHovered) {
      state.hovered = nextHovered;
      refreshBenchHighlight();
    },
    setActive(nextActive) {
      state.active = nextActive;
      refreshBenchHighlight();
    },
    // Hover logic is keyed per apparatus/bottle so the scene can raycast meshes
    // and ask the bench to highlight exactly one object at a time.
    setHoveredObject(nextKey) {
      if (hoveredObjectKey === nextKey) {
        return;
      }

      if (hoveredObjectKey && hoverControllers.has(hoveredObjectKey)) {
        hoverControllers.get(hoveredObjectKey)(false);
      }

      hoveredObjectKey = nextKey;

      if (hoveredObjectKey && hoverControllers.has(hoveredObjectKey)) {
        hoverControllers.get(hoveredObjectKey)(true);
      }
    }
  };
}
