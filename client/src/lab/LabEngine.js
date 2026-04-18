import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { LabControls } from './LabControls.js';
import { Cabinet } from './Cabinet.js';
import { labState } from './LabState.js';

RectAreaLightUniformsLib.init();

// Placeholder item definitions per cabinet — real meshes come in Prompt 6
const PLACEHOLDER_ITEMS = {
  A: [
    { color: '#cccccc', emissive: '#aaaaaa', label: 'Na'   },
    { color: '#4488ff', emissive: '#2255cc', label: 'H₂O'  },
    { color: '#ffff44', emissive: '#aaaa00', label: 'HCl'  },
    { color: '#88ffaa', emissive: '#44cc66', label: 'NaOH' },
  ],
  B: [
    { color: '#cceeff', emissive: '#3399cc', label: 'C₂H₅OH' },
    { color: '#0066ff', emissive: '#003399', label: 'CuSO₄'  },
    { color: '#aaaaaa', emissive: '#666666', label: 'Zn'     },
    { color: '#ffffff', emissive: '#888888', label: 'Beaker' },
  ],
  C: [
    { color: '#555555', emissive: '#333333', label: 'Bunsen'  },
    { color: '#888888', emissive: '#444444', label: 'Tongs'   },
    { color: '#dddddd', emissive: '#999999', label: 'Tubes'   },
    { color: '#ff88ff', emissive: '#cc44cc', label: 'pH Strip'},
  ],
  D: [
    { color: '#ffffff', emissive: '#888888', label: 'Flask'   },
    { color: '#eeeeee', emissive: '#888888', label: 'Pipette' },
    { color: '#222266', emissive: '#0000aa', label: 'pH Meter'},
    { color: '#334455', emissive: '#112233', label: 'Goggles' },
  ],
};

export class LabEngine {
  constructor() {
    this.scene         = null;
    this.camera        = null;
    this.renderer      = null;
    this.controls      = null;

    // Cabinet system
    this._cabinetsMap  = new Map();   // id → Cabinet instance
    this.cabinets      = [];          // hit-box meshes for raycasting
    this._ledPulseData = [];          // { led, light, group } for proximity glow

    this._animFrameId  = null;
    this._resizeHandler = null;
    this._clickHandler  = null;
    this._clock        = new THREE.Clock();
    this._scanlineMeshes = [];
    this._raycaster    = new THREE.Raycaster();
    this._mouse        = new THREE.Vector2();
  }

  // ─── INIT ────────────────────────────────────────────────────────────────────

  init(canvas) {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace  = THREE.SRGBColorSpace;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0d0d1a');
    this.scene.fog = new THREE.Fog('#0d0d1a', 18, 42);

    // Camera — ENTRANCE waypoint
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 1.7, 12);
    this.camera.lookAt(0, 1.7, 0);

    this._buildLighting();
    this._buildRoom();
    this._buildLabFurniture();

    // Scroll + cabinet navigation
    this.controls = new LabControls(this.camera);
    this.controls.attach(canvas);

    // Click → cabinet open
    this._setupRaycasting(canvas);

    // Window resize
    this._resizeHandler = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', this._resizeHandler);

    this.animate();
  }

  // ─── PUBLIC ──────────────────────────────────────────────────────────────────

  // Called by App.jsx "Back to Lab" button and Escape key handler
  closeCabinet(id) {
    const cabinet = this._cabinetsMap.get(id);
    if (!cabinet || !cabinet.isOpen) return;

    // Doors close and camera retreats simultaneously — feels natural
    cabinet.close();
    this.controls.returnToLab();
    labState.emit('cabinet:closed', { id });
  }

  // ─── LIGHTING ────────────────────────────────────────────────────────────────

  _buildLighting() {
    this.scene.add(new THREE.AmbientLight('#1a1a3e', 0.5));
    this.scene.add(new THREE.HemisphereLight('#001133', '#000000', 0.35));

    // RectAreaLights — fluorescent panels
    [6, 0, -6].forEach(z => {
      const rect = new THREE.RectAreaLight('#ffffff', 2.5, 3.5, 1.2);
      rect.position.set(0, 4.6, z);
      rect.lookAt(0, 0, z);
      this.scene.add(rect);
    });

    // Shadow-casting directional
    const dir = new THREE.DirectionalLight('#ffffff', 0.5);
    dir.position.set(4, 10, 6);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near   = 0.1;
    dir.shadow.camera.far    = 60;
    dir.shadow.camera.left   = -16;
    dir.shadow.camera.right  =  16;
    dir.shadow.camera.top    =  16;
    dir.shadow.camera.bottom = -16;
    this.scene.add(dir);
  }

  // ─── ROOM ────────────────────────────────────────────────────────────────────

  _buildRoom() {
    const wallMat = new THREE.MeshStandardMaterial({ color: '#1e1e2e', roughness: 0.85 });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 32),
      new THREE.MeshStandardMaterial({ map: this._makeFloorTexture(), roughness: 0.25, metalness: 0.08 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 32),
      new THREE.MeshStandardMaterial({ color: '#22223a', roughness: 0.9 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5;
    this.scene.add(ceiling);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(20, 5.1, 0.2), wallMat);
    backWall.position.set(0, 2.5, -14);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.1, 32), wallMat);
    leftWall.position.set(-10, 2.5, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.1, 32), wallMat);
    rightWall.position.set(10, 2.5, 0);
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    const entranceWall = new THREE.Mesh(new THREE.BoxGeometry(20, 5.1, 0.2), wallMat);
    entranceWall.position.set(0, 2.5, 15);
    this.scene.add(entranceWall);
  }

  _makeFloorTexture() {
    const size = 512;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#b0b0b0';
    ctx.lineWidth = 1;
    const step = size / 8;
    for (let i = 0; i <= size; i += step) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 8);
    return tex;
  }

  // ─── FURNITURE ───────────────────────────────────────────────────────────────

  _buildLabFurniture() {
    this._buildBenches();
    this._buildCabinets();
    this._buildOverheadLightHousings();
  }

  _buildBenches() {
    [{ x: 0, z: 0 }, { x: 0, z: -6 }].forEach(({ x, z }) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      this.scene.add(g);

      // Surface
      const surface = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.1, 1.5),
        new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.15, metalness: 0.06 })
      );
      surface.position.y = 0.95;
      surface.castShadow = surface.receiveShadow = true;
      g.add(surface);

      // Body with hazard stripes
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.9, 1.5),
        new THREE.MeshStandardMaterial({ map: this._makeHazardTexture(), roughness: 0.7 })
      );
      body.position.y = 0.45;
      body.castShadow = true;
      g.add(body);

      // Orange trim edges
      const trimMat = new THREE.MeshStandardMaterial({
        color: '#FF8C00', emissive: '#FF5500', emissiveIntensity: 0.55, roughness: 0.4,
      });
      [0.76].forEach(zo => {
        [-zo, zo].forEach(tz => {
          const t = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.06, 0.06), trimMat);
          t.position.set(0, 0.03, tz);
          g.add(t);
        });
      });
      [2.06].forEach(xo => {
        [-xo, xo].forEach(tx => {
          const t = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.6), trimMat);
          t.position.set(tx, 0.03, 0);
          g.add(t);
        });
      });

      // Readout
      g.add(Object.assign(new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.07, 0.025),
        new THREE.MeshStandardMaterial({ color: '#0a2a5e', emissive: '#0044ff', emissiveIntensity: 1.6 })
      ), { position: new THREE.Vector3(0.8, 0.5, 0.765) }));

      // Spot
      const spot = new THREE.SpotLight('#FF8C00', 2.5, 6, Math.PI * 0.22, 0.35, 1.5);
      spot.position.set(x, 4.8, z);
      spot.target.position.set(x, 0, z);
      spot.castShadow = true;
      spot.shadow.mapSize.set(512, 512);
      this.scene.add(spot);
      this.scene.add(spot.target);
    });
  }

  _makeHazardTexture() {
    const size = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(0, 0, size, size);
    const sw = 28;
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.translate(-size, -size);
    ctx.fillStyle = '#1a1a8a';
    for (let i = -size * 2; i < size * 4; i += sw * 2) ctx.fillRect(i, -size * 2, sw, size * 6);
    ctx.restore();
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 1);
    return tex;
  }

  // ─── CABINETS ─────────────────────────────────────────────────────────────────

  _buildCabinets() {
    const defs = [
      { id: 'A', pos: [-9.6, 2, 2],     rotY: Math.PI / 2 },
      { id: 'B', pos: [-9.6, 2, -3],    rotY: Math.PI / 2 },
      { id: 'C', pos: [-3,   2, -13.6], rotY: 0           },
      { id: 'D', pos: [3,    2, -13.6], rotY: 0           },
    ];

    defs.forEach(def => {
      const cabinet = this._buildSingleCabinet(def);
      this._cabinetsMap.set(def.id, cabinet);
    });
  }

  _buildSingleCabinet({ id, pos, rotY }) {
    const group = new THREE.Group();
    group.position.set(...pos);
    group.rotation.y = rotY;
    this.scene.add(group);

    const darkMat   = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
    const emissiveMat = (c, e, ei) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: ei, roughness: 0.4 });

    // ── Interior shell (back + top + bottom + sides) ───────────────────────────
    const interiorColor = '#12121e';
    // Back panel
    group.add(this._mesh(new THREE.BoxGeometry(2.5, 2.5, 0.1),   darkMat('#0e0e1e'), [0, 0, -0.2]));
    // Top
    group.add(this._mesh(new THREE.BoxGeometry(2.5, 0.08, 0.45), darkMat(interiorColor), [0, 1.21, 0]));
    // Bottom
    group.add(this._mesh(new THREE.BoxGeometry(2.5, 0.08, 0.45), darkMat(interiorColor), [0, -1.21, 0]));
    // Left side
    group.add(this._mesh(new THREE.BoxGeometry(0.08, 2.5, 0.45), darkMat(interiorColor), [-1.21, 0, 0]));
    // Right side
    group.add(this._mesh(new THREE.BoxGeometry(0.08, 2.5, 0.45), darkMat(interiorColor), [1.21, 0, 0]));

    // ── Shelves (2) and placeholder items ─────────────────────────────────────
    const shelfY = [-0.35, 0.55]; // two shelves in local cabinet space
    const shelfMat = new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.5 });

    shelfY.forEach((sy, si) => {
      // Shelf board
      group.add(this._mesh(new THREE.BoxGeometry(2.2, 0.05, 0.38), shelfMat, [0, sy, -0.03]));

      // Cyan shelf LED under board
      const shelfLed = this._mesh(
        new THREE.BoxGeometry(2.0, 0.02, 0.02),
        emissiveMat('#00D4FF', '#00D4FF', 1.4),
        [0, sy - 0.04, 0.15]
      );
      group.add(shelfLed);

      // 2 placeholder items per shelf
      const items = PLACEHOLDER_ITEMS[id] ?? [];
      [-0.55, 0.55].forEach((ix, ii) => {
        const itemDef = items[si * 2 + ii] ?? { color: '#ffffff', emissive: '#888888' };
        const itemMesh = this._mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 0.28, 12),
          emissiveMat(itemDef.color, itemDef.emissive, 0.55),
          [ix, sy + 0.185, -0.03]
        );
        itemMesh.userData.itemId    = itemDef.label;
        itemMesh.userData.cabinetId = id;
        group.add(itemMesh);
      });
    });

    // ── Orange top trim ────────────────────────────────────────────────────────
    group.add(this._mesh(
      new THREE.BoxGeometry(2.68, 0.08, 0.12),
      emissiveMat('#FF8C00', '#FF5500', 0.65),
      [0, 1.35, 0.22]
    ));

    // ── Cyan LED strip (top inner edge) — tracked for proximity pulse ──────────
    const led = this._mesh(
      new THREE.BoxGeometry(2.3, 0.04, 0.04),
      emissiveMat('#00D4FF', '#00D4FF', 2.8),
      [0, 1.22, 0.24]
    );
    group.add(led);

    // ── Cyan point light ───────────────────────────────────────────────────────
    const cyanLight = new THREE.PointLight('#00D4FF', 1.0, 3.5);
    cyanLight.position.set(0, 1.3, 0.7);
    group.add(cyanLight);
    this._ledPulseData.push({ led, light: cyanLight, group });

    // ── Screen panel (animated scanlines) ─────────────────────────────────────
    const { canvas: scv, ctx: sctx } = this._makeScreenTexture();
    const screenMesh = this._mesh(
      new THREE.BoxGeometry(0.65, 0.32, 0.025),
      new THREE.MeshStandardMaterial({
        map: new THREE.CanvasTexture(scv),
        emissive: '#0033aa', emissiveIntensity: 0.9,
      }),
      [0, 0.85, 0.28]
    );
    screenMesh.userData.screenCtx    = sctx;
    screenMesh.userData.screenCanvas = scv;
    group.add(screenMesh);
    this._scanlineMeshes.push(screenMesh);

    // ── Side inset lines ───────────────────────────────────────────────────────
    [-1.12, 1.12].forEach(px => {
      group.add(this._mesh(
        new THREE.BoxGeometry(0.04, 2.2, 0.02),
        darkMat('#2e2e4e'),
        [px, 0, 0.27]
      ));
    });

    // ── DOOR SYSTEM ───────────────────────────────────────────────────────────
    // Each door pivots at its outer edge (the hinge).
    // Left door:  pivot at x = −1.25, door mesh center at +0.60 in pivot-local space
    // Right door: pivot at x = +1.25, door mesh center at −0.60 in pivot-local space
    const DOOR_W   = 1.2;
    const DOOR_H   = 2.32;
    const DOOR_D   = 0.055;
    const PIVOT_Z  = 0.25;   // in front of the cabinet face

    const doorMat = new THREE.MeshStandardMaterial({ color: '#252538', roughness: 0.5 });
    const doorTrimMat = emissiveMat('#FF8C00', '#FF4400', 0.4);

    const makeHingedDoor = (pivotX, meshOffsetX, trimEdgeX) => {
      const pivot = new THREE.Group();
      pivot.position.set(pivotX, 0, PIVOT_Z);

      const door = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, DOOR_H, DOOR_D), doorMat);
      door.position.set(meshOffsetX, 0, 0);
      door.castShadow = true;
      door.userData.cabinetId = id; // make door clickable too
      pivot.add(door);
      this.cabinets.push(door);

      // Outer edge orange trim line
      const edgeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.04, DOOR_H + 0.02, DOOR_D + 0.01), doorTrimMat);
      edgeTrim.position.set(trimEdgeX, 0, 0);
      pivot.add(edgeTrim);

      // Handle (inset from inner edge)
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8),
        new THREE.MeshStandardMaterial({ color: '#888899', metalness: 0.6, roughness: 0.3 })
      );
      handle.rotation.z = Math.PI / 2;
      // offset toward inner edge and slightly toward camera
      handle.position.set(-meshOffsetX * 0.6, -0.25, DOOR_D / 2 + 0.02);
      pivot.add(handle);

      group.add(pivot);
      return pivot;
    };

    const doorLeftPivot  = makeHingedDoor(-1.25,  0.60, -0.62);
    const doorRightPivot = makeHingedDoor( 1.25, -0.60,  0.62);

    // ── Invisible hit-box covering entire cabinet face (catches clicks on body) ─
    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 2.5, 0.5),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.userData.cabinetId = id;
    group.add(hitBox);
    this.cabinets.push(hitBox);

    return new Cabinet({ id, group, doorLeftPivot, doorRightPivot });
  }

  _mesh(geo, mat, pos) {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    return m;
  }

  _makeScreenTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a1a3e';
    ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = '#002299';
    ctx.lineWidth = 1;
    for (let y = 0; y < 64; y += 4) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke();
    }
    ctx.fillStyle = '#00aaff';
    [[10, 20, 40, 6], [10, 32, 55, 6], [10, 44, 30, 6]].forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
    return { canvas, ctx };
  }

  // ─── OVERHEAD LIGHT HOUSINGS ─────────────────────────────────────────────────

  _buildOverheadLightHousings() {
    const housingMat = new THREE.MeshStandardMaterial({ color: '#252535', roughness: 0.7 });
    const panelMat   = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#e8eeff', emissiveIntensity: 1.2 });

    [6, 2, -3, -8].forEach(z => {
      const housing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.55), housingMat);
      housing.position.set(0, 4.94, z);
      this.scene.add(housing);

      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.025, 0.42), panelMat);
      panel.position.set(0, 4.87, z);
      this.scene.add(panel);

      const light = new THREE.PointLight('#e8eeff', 1.4, 10);
      light.position.set(0, 4.75, z);
      this.scene.add(light);

      [-0.5, 0.5].forEach(dx => {
        const rod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.12, 6),
          new THREE.MeshStandardMaterial({ color: '#3a3a4a' })
        );
        rod.position.set(dx, 5.0, z);
        this.scene.add(rod);
      });
    });
  }

  // ─── RAYCASTING ──────────────────────────────────────────────────────────────

  _setupRaycasting(canvas) {
    this._clickHandler = (e) => {
      const rect  = canvas.getBoundingClientRect();
      this._mouse.x = ((e.clientX - rect.left) / rect.width)  *  2 - 1;
      this._mouse.y = ((e.clientY - rect.top)  / rect.height) * -2 + 1;

      this._raycaster.setFromCamera(this._mouse, this.camera);
      const hits = this._raycaster.intersectObjects(this.cabinets);

      if (hits.length > 0) {
        const id = hits[0].object.userData.cabinetId;
        if (id) this._handleCabinetClick(id);
      }
    };
    canvas.addEventListener('click', this._clickHandler);
  }

  _handleCabinetClick(id) {
    const cabinet = this._cabinetsMap.get(id);
    if (!cabinet || cabinet.isOpen) return;

    // Camera moves first; doors open shortly after so student "arrives then it opens"
    this.controls.goToCabinet(id);
    setTimeout(() => cabinet.open(), 280);

    labState.emit('cabinet:opened', { id, name: cabinet.name });
  }

  // ─── ANIMATE ─────────────────────────────────────────────────────────────────

  animate() {
    this._animFrameId = requestAnimationFrame(() => this.animate());

    const elapsed = this._clock.getElapsedTime();

    // ── Scroll controls + lookAt ──────────────────────────────────────────────
    this.controls.update();
    this.camera.lookAt(this.controls.lookTarget);

    // ── Proximity LED pulse ───────────────────────────────────────────────────
    // Cabinets within ~5 units gently breathe cyan to signal interactability
    this._ledPulseData.forEach(({ led, light, group }) => {
      const dist = this.camera.position.distanceTo(group.position);
      if (dist < 6) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 2.2 + group.position.z);
        led.material.emissiveIntensity = 2.0 + pulse * 1.4;
        light.intensity                = 0.7 + pulse * 0.7;
      } else {
        led.material.emissiveIntensity = 2.0;
        light.intensity                = 0.7;
      }
    });

    // ── Cabinet screen scanline scroll (every 3 frames) ───────────────────────
    const tick = Math.floor(elapsed * 10);
    if (tick % 3 === 0) {
      this._scanlineMeshes.forEach(mesh => {
        const { screenCtx: ctx, screenCanvas: cv } = mesh.userData;
        if (!ctx) return;
        ctx.fillStyle = '#0a1a3e';
        ctx.fillRect(0, 0, 128, 64);
        ctx.strokeStyle = '#002299';
        ctx.lineWidth = 1;
        for (let y = 0; y < 64; y += 4) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke();
        }
        const offset = (tick * 2) % 64;
        ctx.strokeStyle = '#00ccff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, offset); ctx.lineTo(128, offset); ctx.stroke();
        ctx.fillStyle = '#00aaff';
        [[10, 20, 40, 6], [10, 32, 55, 6], [10, 44, 30, 6]].forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
        mesh.material.map.needsUpdate = true;
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this._animFrameId)  cancelAnimationFrame(this._animFrameId);
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
    if (this._clickHandler && this.renderer?.domElement)
      this.renderer.domElement.removeEventListener('click', this._clickHandler);
    this.controls?.detach();
    this.renderer?.dispose();
  }
}
