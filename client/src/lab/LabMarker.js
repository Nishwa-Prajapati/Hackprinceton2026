import * as THREE from 'three';

function makeMarkerTexture(label) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');

  // Dark disc
  ctx.fillStyle = 'rgba(13,13,26,0.92)';
  ctx.beginPath(); ctx.arc(128, 128, 100, 0, Math.PI * 2); ctx.fill();

  // Cyan ring
  ctx.strokeStyle = '#00D4FF';
  ctx.lineWidth = 12;
  ctx.stroke();

  // Number
  ctx.fillStyle = '#00D4FF';
  ctx.font = '700 112px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 128, 136);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createLabMarker({ id, label, color, position, phase = 0 }) {
  const group = new THREE.Group();
  group.name  = `${id}-marker`;
  group.position.copy(position);

  const discMat = new THREE.SpriteMaterial({
    map: makeMarkerTexture(label), transparent: true, depthWrite: false,
  });
  const disc = new THREE.Sprite(discMat);
  disc.scale.set(0.75, 0.75, 0.75);
  group.add(disc);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.04, 12, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = -0.18;
  group.add(halo);

  // Glow pad
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = -0.18;
  group.add(pad);

  // Hit target (invisible sprite for raycasting)
  const hitTarget = new THREE.Sprite(
    new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hitTarget.scale.set(1.2, 1.2, 1.2);
  hitTarget.userData.benchId = id;
  group.add(hitTarget);

  const state = { active: false, hovered: false };
  const baseY = position.y;

  function refresh() {
    const e = state.hovered ? 1 : state.active ? 0.72 : 0.42;
    discMat.opacity      = state.hovered ? 1 : 0.92;
    halo.material.opacity = e;
    pad.material.opacity  = 0.1 + e * 0.14;
    group.scale.setScalar(state.hovered ? 1.12 : state.active ? 1.05 : 1);
  }
  refresh();

  return {
    group,
    interactiveObject: hitTarget,
    update(t) {
      group.position.y = baseY + Math.sin(t * 1.9 + phase) * 0.07;
      const pulse = 1 + Math.sin(t * 2.4 + phase) * 0.055;
      halo.scale.setScalar(pulse * (state.hovered ? 1.1 : 1));
      halo.rotation.z = t * 0.65 + phase;
    },
    setHovered(v) { state.hovered = v; refresh(); },
    setActive(v)  { state.active  = v; refresh(); },
  };
}
