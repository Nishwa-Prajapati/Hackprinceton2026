import * as THREE from "three";

function createMarkerTexture(label) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(255, 255, 255, 0.98)";
  context.beginPath();
  context.arc(128, 128, 96, 0, Math.PI * 2);
  context.fill();

  context.lineWidth = 10;
  context.strokeStyle = "rgba(20, 41, 64, 0.18)";
  context.stroke();

  context.fillStyle = "#102033";
  context.font = "700 124px 'Segoe UI', sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, 128, 136);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createMarker({ id, label, color, position, phase = 0 }) {
  const group = new THREE.Group();
  group.name = `${id}-marker`;
  group.position.copy(position);

  const markerTexture = createMarkerTexture(label);
  const discMaterial = new THREE.SpriteMaterial({
    map: markerTexture,
    transparent: true,
    depthWrite: false
  });
  const disc = new THREE.Sprite(discMaterial);
  disc.scale.set(0.8, 0.8, 0.8);
  group.add(disc);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.038, 12, 32),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5
    })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = -0.18;
  group.add(halo);

  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(0.24, 32),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = -0.18;
  group.add(pad);

  const hitTarget = new THREE.Sprite(
    new THREE.SpriteMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false
    })
  );
  hitTarget.scale.set(1.22, 1.22, 1.22);
  hitTarget.userData.zoneId = id;
  group.add(hitTarget);

  const state = {
    active: false,
    hovered: false
  };
  const baseY = position.y;

  function refresh() {
    const emphasis = state.hovered ? 1 : state.active ? 0.72 : 0.42;
    discMaterial.opacity = state.hovered ? 1 : 0.94;
    halo.material.opacity = emphasis;
    pad.material.opacity = 0.1 + emphasis * 0.14;
    const scale = state.hovered ? 1.1 : state.active ? 1.04 : 1;
    group.scale.setScalar(scale);
  }

  refresh();

  return {
    group,
    interactiveObject: hitTarget,
    update(elapsedTime) {
      group.position.y = baseY + Math.sin(elapsedTime * 1.9 + phase) * 0.08;
      const pulse = 1 + Math.sin(elapsedTime * 2.4 + phase) * 0.055;
      halo.scale.setScalar(pulse * (state.hovered ? 1.08 : 1));
      halo.rotation.z = elapsedTime * 0.7 + phase;
    },
    setHovered(nextHovered) {
      state.hovered = nextHovered;
      refresh();
    },
    setActive(nextActive) {
      state.active = nextActive;
      refresh();
    }
  };
}
