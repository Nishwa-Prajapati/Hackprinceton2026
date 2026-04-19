import * as THREE from 'three';

function colorToHex(value, fallback = 0x9fd7ff) {
  try {
    return new THREE.Color(value).getHex();
  } catch {
    return fallback;
  }
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }

  lines.push(current);
  return lines;
}

function makeLabelTexture(text, {
  width = 256,
  height = 96,
  background = '#f3f1e8',
  border = '#675f52',
  color = '#252525',
  font = '700 28px Arial',
  wrap = false,
  lineHeight = 30
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = border;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, width - 6, height - 6);

  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = wrap ? wrapText(ctx, text, width - 24) : [text];
  const totalHeight = (lines.length - 1) * lineHeight;
  lines.forEach((line, index) => {
    const y = height / 2 - totalHeight / 2 + index * lineHeight;
    ctx.fillText(line, width / 2, y);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createHoverHitbox(width, height, depth = width) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
}

function registerHoverTarget(targets, controllers, key, name, hitObject, scaleTarget, materials, opts = {}) {
  const baseScale = scaleTarget.scale.clone();
  const hoverScale = opts.hoverScale ?? 1.06;
  const emissiveBoost = opts.emissiveBoost ?? 0.18;
  const tracked = materials.filter(Boolean).map(material => ({
    material,
    baseEmissiveIntensity: typeof material.emissiveIntensity === 'number' ? material.emissiveIntensity : 0
  }));

  hitObject.userData.hoverKey = key;
  hitObject.userData.hoverName = name;
  targets.push(hitObject);

  controllers.set(key, hovered => {
    scaleTarget.scale.copy(baseScale).multiplyScalar(hovered ? hoverScale : 1);
    tracked.forEach(({ material, baseEmissiveIntensity }) => {
      if ('emissiveIntensity' in material) {
        material.emissiveIntensity = baseEmissiveIntensity + (hovered ? emissiveBoost : 0);
      }
    });
  });
}

function createBottle(chemical, layout, hoverTargets, hoverControllers) {
  const group = new THREE.Group();
  const bottleTint = colorToHex(chemical.bottleColor, 0xd7ebff);
  const fillColor = colorToHex(chemical.fillColor, 0x9fd7ff);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: bottleTint,
    roughness: 0.06,
    transmission: 0.9,
    transparent: true,
    opacity: 0.32,
    thickness: 0.24
  });
  const liquidMat = new THREE.MeshStandardMaterial({
    color: fillColor,
    emissive: fillColor,
    emissiveIntensity: 0.32,
    roughness: 0.16
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x2a3040,
    roughness: 0.45,
    metalness: 0.3
  });
  const bandMat = new THREE.MeshStandardMaterial({
    color: bottleTint,
    emissive: bottleTint,
    emissiveIntensity: 0.16,
    roughness: 0.24,
    metalness: 0.08
  });

  const bottleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.1, 0.34, 20), glassMat);
  bottleBody.position.y = 0.17;
  bottleBody.castShadow = true;
  group.add(bottleBody);

  if (chemical.contentMode === 'solid') {
    const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.05, 0.08, 18), liquidMat);
    pile.position.y = 0.045;
    group.add(pile);

    [-0.032, 0, 0.032].forEach((x, index) => {
      const granule = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), liquidMat);
      granule.position.set(x, 0.085 + (index % 2) * 0.01, index === 1 ? 0.016 : -0.01);
      group.add(granule);
    });
  } else if (chemical.contentMode === 'gas') {
    const gas = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.07, 0.21, 16), new THREE.MeshPhysicalMaterial({
      color: fillColor,
      emissive: fillColor,
      emissiveIntensity: 0.22,
      roughness: 0.12,
      transparent: true,
      opacity: 0.22,
      transmission: 0.72
    }));
    gas.position.y = 0.12;
    group.add(gas);
  } else {
    const bottleLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.084, 0.22, 20), liquidMat);
    bottleLiquid.position.y = 0.11;
    group.add(bottleLiquid);
  }

  const bottleNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.11, 16), glassMat);
  bottleNeck.position.y = 0.395;
  group.add(bottleNeck);

  const shoulderBand = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.011, 10, 24), bandMat);
  shoulderBand.rotation.x = Math.PI / 2;
  shoulderBand.position.y = 0.29;
  group.add(shoulderBand);

  const bottleCap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16), capMat);
  bottleCap.position.y = 0.48;
  group.add(bottleCap);

  const sticker = new THREE.Mesh(
    new THREE.PlaneGeometry(0.115, 0.06),
    new THREE.MeshBasicMaterial({
      map: makeLabelTexture(chemical.displayLabel ?? chemical.formula ?? chemical.name, {
        width: 256,
        height: 128,
        background: '#fcfbf5',
        border: chemical.bottleColor ?? '#675f52',
        font: '700 30px Arial'
      }),
      transparent: true,
      depthWrite: false
    })
  );
  sticker.position.set(0, 0.2, 0.102);
  group.add(sticker);

  const hitbox = createHoverHitbox(0.26, 0.58, 0.26);
  hitbox.position.y = 0.24;
  group.add(hitbox);

  group.position.set(layout.x, layout.y, layout.z);

  registerHoverTarget(
    hoverTargets,
    hoverControllers,
    `chemical-${chemical.id}-${layout.x}`,
    chemical.hoverName ?? chemical.name,
    hitbox,
    group,
    [glassMat, liquidMat, capMat],
    { hoverScale: 1.05, emissiveBoost: 0.14 }
  );

  return group;
}

function createReagentRack(chemicals, hoverTargets, hoverControllers) {
  const group = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.45, metalness: 0.6 });
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x1e2030, roughness: 0.4, metalness: 0.15 });

  [[0, 1.14, -0.38], [0, 1.5, -0.38]].forEach(([x, y, z]) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.08, 0.38), shelfMat);
    shelf.position.set(x, y, z);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    group.add(shelf);
  });

  [[0, 1.09, -0.38], [0, 1.45, -0.38]].forEach(([x, y, z]) => {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.02, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 1.2 })
    );
    strip.position.set(x, y, z);
    group.add(strip);
  });

  [[-0.94, 1.31], [0.94, 1.31], [-0.94, 1.57], [0.94, 1.57]].forEach(([x, y]) => {
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), frameMat);
    support.position.set(x, y, -0.38);
    support.castShadow = true;
    group.add(support);
  });

  const rearRail = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 0.08), frameMat);
  rearRail.position.set(0, 1.69, -0.54);
  group.add(rearRail);

  const spacing = 0.34;
  chemicals.forEach((chemical, index) => {
    const row = Math.floor(index / 6);
    const col = index % 6;

    group.add(createBottle(chemical, {
      x: -0.85 + col * spacing,
      y: row === 0 ? 1.18 : 1.54,
      z: row === 0 ? -0.28 : -0.48
    }, hoverTargets, hoverControllers));
  });

  return group;
}

function createAccentMaterial(accent) {
  return new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 0.2,
    roughness: 0.22,
    metalness: 0.08
  });
}

function createGlassMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xe8f7ff,
    roughness: 0.05,
    transmission: 0.94,
    transparent: true,
    opacity: 0.62,
    thickness: 0.12
  });
}

function createMetalMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x697384,
    roughness: 0.3,
    metalness: 0.72
  });
}

function createDarkMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x222935,
    roughness: 0.44,
    metalness: 0.22
  });
}

function createApparatusModel(icon, accentColor) {
  const group = new THREE.Group();
  const iconName = String(icon ?? '').toLowerCase();
  const accent = colorToHex(`#${accentColor.toString(16).padStart(6, '0')}`, accentColor);
  const glassMat = createGlassMaterial();
  const metalMat = createMetalMaterial();
  const darkMat = createDarkMaterial();
  const accentMat = createAccentMaterial(accent);
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xb78453, roughness: 0.72, metalness: 0.06 });

  const addShadowDisc = () => {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.095, 0.008, 18),
      new THREE.MeshStandardMaterial({ color: 0x16202c, roughness: 0.9, metalness: 0 })
    );
    disc.position.y = 0.004;
    group.add(disc);
  };

  const addTube = (x = 0, y = 0.12, z = 0, height = 0.22, radius = 0.028) => {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16), glassMat);
    tube.position.set(x, y, z);
    group.add(tube);
    return tube;
  };

  addShadowDisc();

  if (iconName.includes('beaker') || iconName.includes('cell')) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.082, 0.15, 22, 1, true), glassMat);
    body.position.y = 0.082;
    group.add(body);
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.075, 18), accentMat);
    liquid.position.y = 0.045;
    group.add(liquid);
    if (iconName.includes('cell')) {
      [-0.03, 0.03].forEach(x => {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 10), darkMat);
        rod.position.set(x, 0.12, 0);
        group.add(rod);
      });
    }
    return group;
  }

  if (iconName.includes('conical_flask') || iconName.includes('flask')) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 18), glassMat);
    bulb.scale.set(1, 1.08, 1);
    bulb.position.y = 0.07;
    group.add(bulb);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.11, 14), glassMat);
    neck.position.y = 0.16;
    group.add(neck);
    const liquid = new THREE.Mesh(new THREE.SphereGeometry(0.056, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), accentMat);
    liquid.position.y = 0.018;
    group.add(liquid);
    return group;
  }

  if (iconName.includes('test_tube') || iconName.includes('boiling_tube')) {
    addTube(0, 0.12, 0, iconName.includes('boiling_tube') ? 0.26 : 0.2, iconName.includes('boiling_tube') ? 0.032 : 0.026);
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(iconName.includes('boiling_tube') ? 0.026 : 0.021, iconName.includes('boiling_tube') ? 0.026 : 0.021, 0.07, 12), accentMat);
    liquid.position.y = 0.055;
    group.add(liquid);
    return group;
  }

  if (iconName.includes('rack')) {
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.018, 0.07), darkMat);
    railTop.position.y = 0.12;
    group.add(railTop);
    const railBottom = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.018, 0.07), darkMat);
    railBottom.position.y = 0.03;
    group.add(railBottom);
    [-0.06, 0, 0.06].forEach(x => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.11, 0.016), metalMat);
      post.position.set(x, 0.07, 0);
      group.add(post);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.13, 12), glassMat);
      tube.position.set(x, 0.11, 0);
      group.add(tube);
    });
    return group;
  }

  if (iconName.includes('bunsen_burner')) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 18), metalMat);
    base.position.y = 0.022;
    group.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.16, 12), metalMat);
    stem.position.y = 0.11;
    group.add(stem);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.03, 12), metalMat);
    nozzle.position.y = 0.19;
    group.add(nozzle);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.08, 12), accentMat);
    flame.position.y = 0.255;
    group.add(flame);
    return group;
  }

  if (iconName.includes('dropper') || iconName.includes('pipette') || iconName.includes('burette')) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, iconName.includes('burette') ? 0.24 : 0.17, 10), glassMat);
    shaft.rotation.z = Math.PI / 6;
    shaft.position.set(0, 0.11, 0);
    group.add(shaft);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), iconName.includes('burette') ? glassMat : accentMat);
    bulb.position.set(-0.045, 0.165, 0);
    group.add(bulb);
    return group;
  }

  if (iconName.includes('stirring_rod')) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 10), glassMat);
    rod.rotation.z = Math.PI / 4;
    rod.position.y = 0.09;
    group.add(rod);
    return group;
  }

  if (iconName.includes('delivery_tube')) {
    const horiz = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.11, 10), glassMat);
    horiz.rotation.z = Math.PI / 2;
    horiz.position.set(-0.02, 0.14, 0);
    group.add(horiz);
    const vert = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 10), glassMat);
    vert.position.set(0.035, 0.095, 0);
    group.add(vert);
    const joint = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 16, Math.PI / 2), glassMat);
    joint.rotation.z = Math.PI;
    joint.position.set(0.015, 0.14, 0);
    group.add(joint);
    return group;
  }

  if (iconName.includes('litmus_paper')) {
    [-0.024, 0.024].forEach((x, index) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.0015, 0.1), new THREE.MeshStandardMaterial({
        color: index === 0 ? 0xff8cc8 : 0x8d9dff,
        roughness: 0.9,
        metalness: 0
      }));
      strip.position.set(x, 0.004, 0);
      strip.rotation.x = 0.15 * (index === 0 ? 1 : -1);
      group.add(strip);
    });
    return group;
  }

  if (iconName.includes('watch_glass')) {
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 18, 18, 0, Math.PI * 2, 0, Math.PI / 2.5), glassMat);
    bowl.rotation.x = Math.PI;
    bowl.position.y = 0.018;
    group.add(bowl);
    return group;
  }

  if (iconName.includes('measuring_cylinder')) {
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.22, 18, 1, true), glassMat);
    cylinder.position.y = 0.12;
    group.add(cylinder);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 18), darkMat);
    foot.position.y = 0.006;
    group.add(foot);
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.08, 12), accentMat);
    liquid.position.y = 0.05;
    group.add(liquid);
    return group;
  }

  if (iconName.includes('thermometer')) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 10), glassMat);
    stem.position.y = 0.11;
    group.add(stem);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), accentMat);
    bulb.position.y = 0.012;
    group.add(bulb);
    return group;
  }

  if (iconName.includes('ph_meter') || iconName.includes('ammeter') || iconName.includes('voltmeter') || iconName.includes('power_supply') || iconName.includes('bulb_circuit') || iconName.includes('balance')) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.08), darkMat);
    box.position.y = 0.04;
    group.add(box);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.032), new THREE.MeshBasicMaterial({ color: accent }));
    screen.position.set(0, 0.048, 0.041);
    group.add(screen);
    if (iconName.includes('bulb')) {
      const wire = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 6, 16), metalMat);
      wire.rotation.x = Math.PI / 2;
      wire.position.set(0.06, 0.05, 0);
      group.add(wire);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), accentMat);
      bulb.position.set(0.06, 0.09, 0);
      group.add(bulb);
    }
    if (iconName.includes('balance')) {
      const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.11, 10), glassMat);
      cylinder.position.set(-0.06, 0.06, 0);
      group.add(cylinder);
    }
    return group;
  }

  if (iconName.includes('gas_jar')) {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 20, 1, true), glassMat);
    jar.position.y = 0.1;
    group.add(jar);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.012, 18), darkMat);
    lid.position.y = 0.19;
    group.add(lid);
    return group;
  }

  if (iconName.includes('deflagrating_spoon')) {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.18, 10), metalMat);
    handle.rotation.z = Math.PI / 6;
    handle.position.y = 0.09;
    group.add(handle);
    const spoon = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), metalMat);
    spoon.rotation.z = -Math.PI / 3;
    spoon.position.set(0.05, 0.14, 0);
    group.add(spoon);
    return group;
  }

  if (iconName.includes('crucible')) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.055, 16), darkMat);
    bowl.position.y = 0.03;
    group.add(bowl);
    if (iconName.includes('lid')) {
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.01, 16), metalMat);
      lid.position.y = 0.064;
      group.add(lid);
    }
    return group;
  }

  if (iconName.includes('tongs')) {
    [-0.018, 0.018].forEach(x => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 8), metalMat);
      arm.rotation.z = x < 0 ? Math.PI / 5 : -Math.PI / 5;
      arm.position.set(x, 0.09, 0);
      group.add(arm);
    });
    return group;
  }

  if (iconName.includes('heatproof_mat') || iconName.includes('gauze')) {
    const mat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.008, 0.12), new THREE.MeshStandardMaterial({
      color: iconName.includes('gauze') ? 0x808991 : 0x6f747a,
      roughness: 0.88,
      metalness: 0.08
    }));
    mat.position.y = 0.006;
    group.add(mat);
    return group;
  }

  if (iconName.includes('combustion_tube')) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.22, 12), glassMat);
    tube.rotation.z = Math.PI / 2;
    tube.position.y = 0.06;
    group.add(tube);
    [-0.08, 0.08].forEach(x => {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.04), darkMat);
      stand.position.set(x, 0.025, 0);
      group.add(stand);
    });
    return group;
  }

  if (iconName.includes('tripod')) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.005, 6, 18), metalMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.11;
    group.add(ring);
    [-0.03, 0, 0.03].forEach((x, index) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 8), metalMat);
      leg.position.set(x, 0.05, index === 1 ? -0.03 : 0.03);
      leg.rotation.z = index === 0 ? 0.2 : index === 2 ? -0.2 : 0;
      group.add(leg);
    });
    return group;
  }

  if (iconName.includes('wooden_splint') || iconName.includes('glowing_splint') || iconName.includes('burning_splint')) {
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.14), woodMat);
    stick.rotation.y = Math.PI / 4;
    stick.position.y = 0.01;
    group.add(stick);
    if (iconName.includes('glowing') || iconName.includes('burning')) {
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), accentMat);
      ember.position.set(0.048, 0.02, 0.048);
      group.add(ember);
    }
    return group;
  }

  if (iconName.includes('safety_screen')) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), glassMat);
    panel.position.set(0, 0.09, 0);
    group.add(panel);
    [-0.05, 0.05].forEach(x => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.14, 8), metalMat);
      post.position.set(x, 0.07, 0);
      group.add(post);
    });
    return group;
  }

  if (iconName.includes('wires_clips')) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.004, 8, 24), new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.24,
      roughness: 0.38,
      metalness: 0.08
    }));
    loop.rotation.x = Math.PI / 2;
    loop.position.y = 0.03;
    group.add(loop);
    [-0.04, 0.04].forEach(x => {
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.012), metalMat);
      clip.position.set(x, 0.03, 0.04);
      group.add(clip);
    });
    return group;
  }

  if (iconName.includes('graphite_electrodes')) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.06), darkMat);
    block.position.y = 0.01;
    group.add(block);
    [-0.02, 0.02].forEach(x => {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.16, 10), darkMat);
      rod.position.set(x, 0.1, 0);
      group.add(rod);
    });
    return group;
  }

  if (iconName.includes('inverted_tubes')) {
    [-0.03, 0.03].forEach(x => {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.13, 12), glassMat);
      tube.position.set(x, 0.08, 0);
      group.add(tube);
    });
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.05), accentMat);
    tray.position.y = 0.008;
    group.add(tray);
    return group;
  }

  if (iconName.includes('magnet')) {
    const body = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.018, 8, 16, Math.PI), accentMat);
    body.rotation.z = Math.PI;
    body.position.y = 0.05;
    group.add(body);
    return group;
  }

  const fallback = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), metalMat);
  fallback.position.y = 0.04;
  group.add(fallback);
  return group;
}

function createApparatusItem(apparatus, layout, accentColor, hoverTargets, hoverControllers) {
  const group = new THREE.Group();
  const model = createApparatusModel(apparatus.icon, accentColor);
  group.add(model);

  const hitbox = createHoverHitbox(0.26, 0.32, 0.2);
  hitbox.position.y = 0.14;
  group.add(hitbox);

  group.position.set(layout.x, 1.0, layout.z);

  registerHoverTarget(
    hoverTargets,
    hoverControllers,
    `apparatus-${apparatus.id}-${layout.x}`,
    apparatus.name,
    hitbox,
    group,
    [],
    { hoverScale: 1.06, emissiveBoost: 0.12 }
  );

  return group;
}

function createApparatusGrid(apparatus, accentColor, hoverTargets, hoverControllers) {
  const group = new THREE.Group();
  const columns = 6;
  const xStart = -1.05;
  const xStep = 0.42;
  const zRows = [0.35, 0.08];

  apparatus.forEach((item, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const z = zRows[row] ?? (0.35 - row * 0.25);

    group.add(createApparatusItem(item, {
      x: xStart + col * xStep,
      z
    }, accentColor, hoverTargets, hoverControllers));
  });

  return group;
}

function createTitleTexture(title, accentHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(42,42,53,0.92)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = `#${accentHex.toString(16).padStart(6, '0')}`;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  ctx.fillStyle = '#f2f4f8';
  ctx.font = '600 34px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = wrapText(ctx, title, canvas.width - 48).slice(0, 2);
  const lineHeight = 38;
  const totalHeight = (lines.length - 1) * lineHeight;
  lines.forEach((line, index) => {
    const y = canvas.height / 2 - totalHeight / 2 + index * lineHeight;
    ctx.fillText(line, canvas.width / 2, y);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createBench({
  id,
  title,
  description,
  position,
  accent,
  chemicals = [],
  apparatus = [],
  cameraOffsetX = 0
}) {
  const group = new THREE.Group();
  group.name = `${id}-bench`;
  group.position.copy(position);

  const itemHoverTargets = [];
  const clickTargets = [];
  const hoverControllers = new Map();
  let hoveredKey = null;

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a3a4a, roughness: 0.7, metalness: 0.1 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x585f6a, roughness: 0.42, metalness: 0.42 });
  const topMat = new THREE.MeshStandardMaterial({
    color: 0xddd9d0,
    roughness: 0.22,
    metalness: 0.05,
    emissive: 0xffffff,
    emissiveIntensity: 0.02
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 0.45,
    roughness: 0.22,
    metalness: 0.1
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.92, 1.36), bodyMat);
  base.position.y = 0.46;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const top = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.13, 1.5), topMat);
  top.position.y = 0.98;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.05), frameMat);
  shelf.position.y = 0.54;
  shelf.castShadow = true;
  shelf.receiveShadow = true;
  group.add(shelf);

  [[-1.2, -0.58], [1.2, -0.58], [-1.2, 0.58], [1.2, 0.58]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.88, 0.12), frameMat);
    leg.position.set(x, 0.44, z);
    leg.castShadow = true;
    group.add(leg);
  });

  const strip = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.05, 0.08), accentMat);
  strip.position.set(0, 0.83, 0.72);
  group.add(strip);

  const tableHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(2.95, 0.32, 1.72),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  tableHitbox.position.set(0, 1.02, 0);
  tableHitbox.userData.benchId = id;
  tableHitbox.userData.hoverName = `${title} Bench`;
  group.add(tableHitbox);
  clickTargets.push(tableHitbox);

  group.add(createReagentRack(chemicals, itemHoverTargets, hoverControllers));
  group.add(createApparatusGrid(apparatus, accent, itemHoverTargets, hoverControllers));

  const titleMat = new THREE.MeshBasicMaterial({
    map: createTitleTexture(title, accent),
    transparent: true,
    opacity: 0.9
  });
  titleMat.depthTest = false;

  const titlePlate = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.68), titleMat);
  titlePlate.position.set(0, 2.75, 0.05);
  group.add(titlePlate);

  const titleGlowMat = new THREE.MeshBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    depthTest: false
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
  titleHitbox.userData.hoverName = description ? `${title}: ${description}` : `${title} Bench`;
  group.add(titleHitbox);
  clickTargets.push(titleHitbox);

  const state = { active: false, hovered: false };

  function refresh() {
    const emphasis = state.active ? 1 : state.hovered ? 0.55 : 0;
    topMat.emissiveIntensity = 0.02 + emphasis * 0.12;
    accentMat.emissiveIntensity = 0.45 + emphasis * 0.85;
    titleMat.opacity = 0.9 + emphasis * 0.1;
    titleGlowMat.opacity = 0.16 + emphasis * 0.32;
    titlePlate.scale.setScalar(1 + emphasis * 0.04);
    titleGlow.scale.setScalar(1 + emphasis * 0.08);
  }

  refresh();

  const focusZone = {
    label: title,
    position: new THREE.Vector3(position.x + cameraOffsetX, 1.58, position.z + 2.15),
    lookAt: new THREE.Vector3(position.x, 1.02, position.z - 0.05)
  };

  return {
    group,
    itemHoverTargets,
    clickTargets,
    focusZone,
    setHovered(value) {
      state.hovered = value;
      refresh();
    },
    setActive(value) {
      state.active = value;
      refresh();
    },
    setHoveredObject(nextKey) {
      if (hoveredKey === nextKey) return;
      if (hoveredKey) hoverControllers.get(hoveredKey)?.(false);
      hoveredKey = nextKey;
      if (hoveredKey) hoverControllers.get(hoveredKey)?.(true);
    }
  };
}
