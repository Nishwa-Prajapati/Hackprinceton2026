import * as THREE from "three";

function createTitleTexture(title, accent) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(241, 245, 249, 0.95)";
  context.fillRect(8, 8, canvas.width - 16, canvas.height - 16);

  context.strokeStyle = `#${accent.toString(16).padStart(6, "0")}`;
  context.lineWidth = 10;
  context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  context.fillStyle = "#102033";
  context.font = "700 44px 'Segoe UI', sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(title, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createLeg(material, x, z) {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.88, 0.12), material);
  leg.position.set(x, 0.44, z);
  leg.castShadow = true;
  leg.receiveShadow = true;
  return leg;
}

function createBeaker(x, z) {
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe6f2ff,
    roughness: 0.08,
    transmission: 0.92,
    transparent: true,
    opacity: 0.7,
    thickness: 0.2
  });

  const liquidMaterial = new THREE.MeshStandardMaterial({
    color: 0x6ac6ff,
    emissive: 0x6ac6ff,
    emissiveIntensity: 0.12,
    roughness: 0.18
  });

  const beaker = new THREE.Group();

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

  beaker.position.set(x, 1.02, z);
  return beaker;
}

function createFlask(x, z, liquidColor) {
  const group = new THREE.Group();

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
    emissiveIntensity: 0.18,
    roughness: 0.16
  });

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), flaskMaterial);
  bulb.position.y = 0.12;
  bulb.castShadow = true;
  group.add(bulb);

  const liquid = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 24, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    liquidMaterial
  );
  liquid.position.y = 0.03;
  group.add(liquid);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.34, 16), flaskMaterial);
  neck.position.y = 0.34;
  neck.castShadow = true;
  group.add(neck);

  group.position.set(x, 1.04, z);
  return group;
}

function createBurner(x, z) {
  const burner = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.08, 20),
    new THREE.MeshStandardMaterial({
      color: 0x4c596c,
      metalness: 0.7,
      roughness: 0.32
    })
  );
  base.position.y = 0.04;
  base.castShadow = true;
  burner.add(base);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.25, 16),
    new THREE.MeshStandardMaterial({
      color: 0x8fa4b5,
      metalness: 0.7,
      roughness: 0.22
    })
  );
  stem.position.y = 0.18;
  stem.castShadow = true;
  burner.add(stem);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.05, 0.16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xffb34d,
      emissive: 0xff8a1d,
      emissiveIntensity: 0.9
    })
  );
  flame.position.y = 0.39;
  burner.add(flame);

  burner.position.set(x, 1, z);
  return burner;
}

function createTubeRack(x, z) {
  const rack = new THREE.Group();
  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x8e9cb0,
    metalness: 0.35,
    roughness: 0.46
  });
  const tubeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf6fbff,
    roughness: 0.04,
    transmission: 0.94,
    transparent: true,
    opacity: 0.62,
    thickness: 0.1
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.14), railMaterial);
  base.position.y = 0.03;
  base.castShadow = true;
  rack.add(base);

  const top = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.14), railMaterial);
  top.position.y = 0.26;
  top.castShadow = true;
  rack.add(top);

  [-0.16, 0, 0.16].forEach((offset) => {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.24, 18), tubeMaterial);
    tube.position.set(offset, 0.12, 0);
    tube.castShadow = true;
    rack.add(tube);
  });

  rack.position.set(x, 1.02, z);
  return rack;
}

export function createBench({ id, title, position, accent, cameraOffsetX = 0 }) {
  const group = new THREE.Group();
  group.name = `${id}-bench`;
  group.position.copy(position);

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

  group.add(createBeaker(-0.72, -0.18));
  group.add(createBeaker(-0.12, 0.18));
  group.add(createFlask(0.46, -0.15, accent));
  group.add(createBurner(0.88, 0.18));
  group.add(createTubeRack(-0.68, 0.35));

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

  function refreshHighlight() {
    const emphasis = state.active ? 1 : state.hovered ? 0.6 : 0;
    topMaterial.emissiveIntensity = 0.03 + emphasis * 0.26;
    accentMaterial.emissiveIntensity = 0.34 + emphasis * 0.76;
    titleMaterial.opacity = 0.84 + emphasis * 0.14;
  }

  refreshHighlight();

  return {
    group,
    markerPosition: new THREE.Vector3(position.x, 2.1, position.z + 0.08),
    focusZone: {
      position: new THREE.Vector3(
        position.x + cameraOffsetX,
        1.64,
        position.z + 2.55
      ),
      lookAt: new THREE.Vector3(position.x, 1.08, position.z),
      label: title
    },
    setHovered(nextHovered) {
      state.hovered = nextHovered;
      refreshHighlight();
    },
    setActive(nextActive) {
      state.active = nextActive;
      refreshHighlight();
    }
  };
}
