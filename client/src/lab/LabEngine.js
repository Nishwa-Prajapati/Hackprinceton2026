import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import gsap from 'gsap';
import { LabControls } from './LabControls.js';
import { labState } from './LabState.js';
import { createBench } from './BenchBuilder.js';
import { intersectObjects } from '../utils/raycaster.js';
import { getDeskApparatus, getDeskChemicals } from '../data/desks/index.js';
import periodicTableFrame from '../assets/periodic-table-frame.png';
import rightWallPoster from '../assets/right-wall-poster.png';
import rightWallCoats from '../assets/right-wall-coats.png';

RectAreaLightUniformsLib.init();

// ─── Bench definitions — positions from main branch, accent colors = ours ─────
const BENCH_DEFS = [
  { id: 'zone1', title: 'Acid-Base',       deskKey: 'acidBase',         accent: 0x00D4FF, position: new THREE.Vector3(-3.15, 0,  7.2),   cameraOffsetX:  0.55 },
  { id: 'zone2', title: 'Combustion',      deskKey: 'combustion',       accent: 0xFF8C00, position: new THREE.Vector3( 3.15, 0,  1.35),  cameraOffsetX: -0.55 },
  { id: 'zone3', title: 'Synthesis',       deskKey: 'synthesis',        accent: 0x00D4FF, position: new THREE.Vector3(-3.15, 0, -4.7),   cameraOffsetX:  0.55 },
  { id: 'zone4', title: 'Electrochemistry',deskKey: 'electrochemistry', accent: 0xFF8C00, position: new THREE.Vector3( 3.15, 0, -10.75), cameraOffsetX: -0.55 },
];

// ─── Cabinet placeholder item colors ──────────────────────────────────────────
const PLACEHOLDER_ITEMS = {
  A: [
    { color: '#cccccc', emissive: '#aaaaaa', label: 'Na'   },
    { color: '#4488ff', emissive: '#2255cc', label: 'H₂O'  },
    { color: '#ffff44', emissive: '#aaaa00', label: 'HCl'  },
    { color: '#88ffaa', emissive: '#44cc66', label: 'NaOH' },
  ],
  B: [
    { color: '#cceeff', emissive: '#3399cc', label: 'EtOH' },
    { color: '#0066ff', emissive: '#003399', label: 'CuSO₄'},
    { color: '#aaaaaa', emissive: '#666666', label: 'Zn'   },
    { color: '#ffffff', emissive: '#888888', label: 'Bkr'  },
  ],
  C: [
    { color: '#555555', emissive: '#333333', label: 'Bnsn' },
    { color: '#888888', emissive: '#444444', label: 'Tongs'},
    { color: '#dddddd', emissive: '#999999', label: 'Tube' },
    { color: '#ff88ff', emissive: '#cc44cc', label: 'pH'   },
  ],
  D: [
    { color: '#ffffff', emissive: '#888888', label: 'Flsk' },
    { color: '#eeeeee', emissive: '#888888', label: 'Pptt' },
    { color: '#222266', emissive: '#0000aa', label: 'pHm'  },
    { color: '#334455', emissive: '#112233', label: 'Ggls' },
  ],
};

export class LabEngine {
  constructor() {
    this.scene    = null;
    this.camera   = null;
    this.renderer = null;
    this.controls = null;

    // Decorative cabinet system
    this._ledPulseData = [];

    // Bench system
    this._benchMap           = new Map();
    this._benchClickTargets  = [];
    this._benchItemTargets   = [];
    this._dustbinHoverTargets = [];
    this._hoveredBenchId     = null;
    this._hoveredItemObj     = null;
    this._hoveredDustbinObj  = null;
    this._activeBenchId      = null;

    this._animFrameId      = null;
    this._resizeHandler    = null;
    this._clickHandler     = null;
    this._mousemoveHandler = null;
    this._clock            = new THREE.Clock();
    this._scanlineMeshes   = [];
    this._raycaster        = new THREE.Raycaster();
    this._mouse            = new THREE.Vector2();
    this._tooltipEl        = null;
  }

  // ─── INIT ────────────────────────────────────────────────────────────────────

  init(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled   = true;
    this.renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace    = THREE.SRGBColorSpace;
    this.renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#2a2a35');
    this.scene.fog = new THREE.Fog('#2a2a35', 20, 44);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 1.7, 12);
    this.camera.lookAt(0, 1.7, 0);

    this._buildLighting();
    this._buildRoom();
    this._buildBenches();
    this._buildDeskDustbins();
    this._buildCabinets();
    this._buildOverheadLightHousings();
    this._buildPeripheralProps();

    this.controls = new LabControls(this.camera);
    this.controls.attach(canvas);

    this._setupRaycasting(canvas);

    this._resizeHandler = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', this._resizeHandler);

    this.animate();
  }

  setTooltipEl(el) { this._tooltipEl = el; }

  // ─── PUBLIC API ──────────────────────────────────────────────────────────────

  focusBench(id) {
    const bench = this._benchMap.get(id);
    if (!bench || this._activeBenchId === id) return;
    this._activeBenchId = id;
    this._benchMap.forEach((b, bid) => b.setActive(bid === id));
    this.controls.focusBench(bench.focusZone);
    labState.emit('bench:focused', { id, name: bench.focusZone.label, deskKey: bench.deskKey ?? null });
  }

  exitBench() {
    this.clearExperimentApparatus();
    this._activeBenchId = null;
    this._benchMap.forEach(b => b.setActive(false));
    this.controls.exitBench();
    labState.emit('bench:exited', {});
  }

  flyIn(onComplete) { this.controls.flyIn(onComplete); }

  setUiLocked(locked) {
    this.controls?.setUiLocked(locked);
  }

  setExperimentApparatus(apparatusNames = []) {
    if (!this._activeBenchId) return;
    this._benchMap.get(this._activeBenchId)?.setExperimentApparatusNames?.(apparatusNames);
  }

  clearExperimentApparatus() {
    if (this._activeBenchId) {
      this._benchMap.get(this._activeBenchId)?.setExperimentApparatusNames?.([]);
      return;
    }
    this._benchMap.forEach((bench) => bench.setExperimentApparatusNames?.([]));
  }

  // ─── LIGHTING ────────────────────────────────────────────────────────────────

  _buildLighting() {
    this.scene.add(new THREE.AmbientLight('#edf0ff', 0.9));
    this.scene.add(new THREE.HemisphereLight('#dfe5ef', '#74707a', 0.62));

    [6, 0, -6].forEach(z => {
      const rect = new THREE.RectAreaLight('#fffdf5', 4.2, 3.5, 1.2);
      rect.position.set(0, 4.6, z);
      rect.lookAt(0, 0, z);
      this.scene.add(rect);
    });

    const dir = new THREE.DirectionalLight('#fff8ef', 1.35);
    dir.position.set(5, 10, 7);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left   = -16;
    dir.shadow.camera.right  =  16;
    dir.shadow.camera.top    =  16;
    dir.shadow.camera.bottom = -16;
    dir.shadow.camera.near   = 0.1;
    dir.shadow.camera.far    = 60;
    this.scene.add(dir);
  }

  // ─── ROOM ────────────────────────────────────────────────────────────────────

  _buildRoom() {
    const wallMat = new THREE.MeshStandardMaterial({ color: '#b0aeb8', roughness: 0.78 });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 32),
      new THREE.MeshPhysicalMaterial({
        map: this._makeFloorTexture(),
        color: '#e8e6e0',
        roughness: 0.16,
        metalness: 0.04,
        clearcoat: 0.5,
        clearcoatRoughness: 0.22,
        reflectivity: 0.28,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 32),
      new THREE.MeshStandardMaterial({ color: '#3a3a45', roughness: 0.84 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5;
    this.scene.add(ceiling);

    // Back wall
    const bk = new THREE.Mesh(new THREE.BoxGeometry(20, 5.1, 0.2), wallMat);
    bk.position.set(0, 2.5, -14); bk.receiveShadow = true;
    this.scene.add(bk);

    // Side walls
    [-10, 10].forEach(x => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.1, 32), wallMat);
      w.position.set(x, 2.5, 0); w.receiveShadow = true;
      this.scene.add(w);
    });

    // Entrance wall (behind camera)
    const ew = new THREE.Mesh(new THREE.BoxGeometry(20, 5.1, 0.2), wallMat);
    ew.position.set(0, 2.5, 15);
    this.scene.add(ew);
  }

  _makeFloorTexture() {
    const size = 512, cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ebe8e1'; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#d1ccc2'; ctx.lineWidth = 1;
    const step = size / 8;
    for (let i = 0; i <= size; i += step) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 6;
    for (let i = -size; i < size * 2; i += 120) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size * 0.45, size);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 8);
    return tex;
  }

  // ─── BENCHES ─────────────────────────────────────────────────────────────────

  _buildBenches() {
    BENCH_DEFS.forEach(def => {
      const bench = createBench({
        ...def,
        chemicals: getDeskChemicals(def.deskKey),
        apparatus: getDeskApparatus(def.deskKey),
      });
      bench.deskKey = def.deskKey;
      this.scene.add(bench.group);
      this._benchMap.set(def.id, bench);

      bench.itemHoverTargets.forEach(ht => { ht.userData.benchId = def.id; });
      this._benchItemTargets.push(...bench.itemHoverTargets);
      bench.clickTargets.forEach(ct => { ct.userData.benchId = def.id; });
      this._benchClickTargets.push(...bench.clickTargets);

      // Coloured spot above each bench
      const spot = new THREE.SpotLight(def.accent, 2.2, 7, Math.PI * 0.22, 0.35, 1.5);
      spot.position.set(def.position.x, 4.8, def.position.z);
      spot.target.position.copy(def.position);
      spot.castShadow = true;
      spot.shadow.mapSize.set(512, 512);
      this.scene.add(spot);
      this.scene.add(spot.target);
    });
  }

  _buildDeskDustbins() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#8f959f', roughness: 0.56, metalness: 0.28 });
    const lidMat = new THREE.MeshStandardMaterial({ color: '#747b86', roughness: 0.44, metalness: 0.34 });
    const trimMat = new THREE.MeshStandardMaterial({ color: '#b7bec8', roughness: 0.28, metalness: 0.72 });
    const pedalMat = new THREE.MeshStandardMaterial({ color: '#656b74', roughness: 0.52, metalness: 0.38 });
    const linerMat = new THREE.MeshStandardMaterial({ color: '#5d646d', roughness: 0.72, metalness: 0.12 });

    BENCH_DEFS.forEach((def, index) => {
      const side = def.position.x < 0 ? -1 : 1;
      const dustbin = new THREE.Group();
      dustbin.position.set(def.position.x + side * 2.08, 0, def.position.z + (index % 2 === 0 ? 0.42 : 0.28));
      dustbin.rotation.y = side < 0 ? 0.22 : -0.22;

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.58, 26), bodyMat);
      body.position.y = 0.29;
      body.castShadow = true;
      body.receiveShadow = true;
      dustbin.add(body);

      const innerLiner = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.5, 22, 1, true), linerMat);
      innerLiner.position.y = 0.31;
      dustbin.add(innerLiner);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.228, 0.014, 10, 24), trimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.57;
      dustbin.add(rim);

      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, 0.585, -0.19);
      dustbin.add(lidPivot);

      const lid = new THREE.Group();
      lid.position.z = 0.19;
      lidPivot.add(lid);

      const lidTop = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.235, 0.05, 26), lidMat);
      lidTop.castShadow = true;
      lid.add(lidTop);

      const lidHandle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.028, 0.025), trimMat);
      lidHandle.position.set(0, 0.04, 0);
      lid.add(lidHandle);

      const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.028, 0.07), pedalMat);
      pedal.position.set(0, 0.03, 0.23);
      dustbin.add(pedal);

      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.024, 0.035), trimMat);
      hinge.position.set(0, 0.585, -0.19);
      dustbin.add(hinge);

      const hoverHitbox = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.24, 0.7, 16),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      hoverHitbox.position.y = 0.35;
      hoverHitbox.userData.hoverName = 'Open Dustbin Lid';
      hoverHitbox.userData.onHoverChange = (hovered) => {
        gsap.to(lidPivot.rotation, {
          x: hovered ? -1.02 : 0,
          duration: hovered ? 0.24 : 0.28,
          ease: 'power2.out',
          overwrite: true,
        });
        hoverHitbox.userData.hoverName = hovered ? 'Close Dustbin Lid' : 'Open Dustbin Lid';
      };
      dustbin.add(hoverHitbox);
      this._dustbinHoverTargets.push(hoverHitbox);

      this.scene.add(dustbin);
    });
  }

  // ─── CABINETS ─────────────────────────────────────────────────────────────────

  _buildCabinets() {
    const defs = [
      { id: 'A', pos: [-9.6, 2, 2],     rotY: Math.PI / 2 },
      { id: 'B', pos: [-9.6, 2, -3],    rotY: Math.PI / 2 },
      { id: 'C', pos: [-4.4, 2, -13.6], rotY: 0           },
      { id: 'D', pos: [4.4,  2, -13.6], rotY: 0           },
    ];
    defs.forEach(def => {
      this._buildSingleCabinet(def);
    });
  }

  _buildSingleCabinet({ id, pos, rotY }) {
    const group = new THREE.Group();
    group.position.set(...pos);
    group.rotation.y = rotY;
    this.scene.add(group);

    const darkMat     = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.58, metalness: 0.18 });
    const emissiveMat = (c, e, ei) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: ei, roughness: 0.36, metalness: 0.14 });

    // Interior shell
    group.add(this._mesh(new THREE.BoxGeometry(2.5, 2.5, 0.1),   darkMat('#454957'), [0, 0, -0.2]));
    [[2.5, 0.08, 0.45, '#535865', [0, 1.21, 0]], [2.5, 0.08, 0.45, '#535865', [0, -1.21, 0]],
     [0.08, 2.5, 0.45, '#535865', [-1.21, 0, 0]], [0.08, 2.5, 0.45, '#535865', [1.21, 0, 0]]
    ].forEach(([w, h, d, c, p]) => group.add(this._mesh(new THREE.BoxGeometry(w, h, d), darkMat(c), p)));

    // Shelves + placeholder items
    [-0.35, 0.55].forEach((sy, si) => {
      group.add(this._mesh(new THREE.BoxGeometry(2.2, 0.05, 0.38), darkMat('#646978'), [0, sy, -0.03]));
      group.add(this._mesh(new THREE.BoxGeometry(2.0, 0.02, 0.02), emissiveMat('#00D4FF', '#00D4FF', 1.4), [0, sy - 0.04, 0.15]));
      const items = PLACEHOLDER_ITEMS[id] ?? [];
      [-0.55, 0.55].forEach((ix, ii) => {
        const def = items[si * 2 + ii] ?? { color: '#ffffff', emissive: '#888888' };
        const m = this._mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.28, 12), emissiveMat(def.color, def.emissive, 0.55), [ix, sy + 0.185, -0.03]);
        m.userData.itemId = def.label; m.userData.cabinetId = id;
        group.add(m);
      });
    });

    // Orange top trim
    group.add(this._mesh(new THREE.BoxGeometry(2.68, 0.08, 0.12), emissiveMat('#FF8C00', '#FF5500', 0.65), [0, 1.35, 0.22]));

    // Cyan LED strip
    const led = this._mesh(new THREE.BoxGeometry(2.3, 0.04, 0.04), emissiveMat('#00D4FF', '#00D4FF', 2.8), [0, 1.22, 0.24]);
    group.add(led);

    // Cyan glow light
    const cyanLight = new THREE.PointLight('#77f4ff', 1.35, 4.5);
    cyanLight.position.set(0, 1.3, 0.7);
    group.add(cyanLight);
    this._ledPulseData.push({ led, light: cyanLight, group });

    // Animated screen
    const { canvas: scv, ctx: sctx } = this._makeScreenTexture();
    const screenMesh = this._mesh(
      new THREE.BoxGeometry(0.65, 0.32, 0.025),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(scv), emissive: '#10aaff', emissiveIntensity: 1.1 }),
      [0, 0.85, 0.28]
    );
    screenMesh.userData.screenCtx    = sctx;
    screenMesh.userData.screenCanvas = scv;
    group.add(screenMesh);
    this._scanlineMeshes.push(screenMesh);

    // Side inset lines
    [-1.12, 1.12].forEach(px =>
      group.add(this._mesh(new THREE.BoxGeometry(0.04, 2.2, 0.02), darkMat('#777d8a'), [px, 0, 0.27]))
    );

    // Doors (hinged)
    const DOOR_W = 1.2, DOOR_H = 2.32, DOOR_D = 0.055, PIVOT_Z = 0.25;
    const doorMat     = new THREE.MeshStandardMaterial({ color: '#b8bec8', roughness: 0.45, metalness: 0.24 });
    const doorTrimMat = new THREE.MeshStandardMaterial({ color: '#FF8C00', emissive: '#FF4400', emissiveIntensity: 0.4, roughness: 0.4 });

    const makeHingedDoor = (pivotX, meshOffX, trimEdgeX) => {
      const pivot = new THREE.Group();
      pivot.position.set(pivotX, 0, PIVOT_Z);
      const door = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, DOOR_H, DOOR_D), doorMat);
      door.position.set(meshOffX, 0, 0); door.castShadow = true;
      pivot.add(door);
      const panelInset = new THREE.Mesh(
        new THREE.BoxGeometry(DOOR_W * 0.78, DOOR_H * 0.78, 0.01),
        new THREE.MeshStandardMaterial({
          color: '#9da4b1',
          roughness: 0.62,
          metalness: 0.12,
          emissive: '#4aeefb',
          emissiveIntensity: 0.03,
        })
      );
      panelInset.position.set(meshOffX, 0, DOOR_D / 2 + 0.006);
      pivot.add(panelInset);
      const edgeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.04, DOOR_H + 0.02, DOOR_D + 0.01), doorTrimMat);
      edgeTrim.position.set(trimEdgeX, 0, 0);
      pivot.add(edgeTrim);
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8),
        new THREE.MeshStandardMaterial({ color: '#707888', metalness: 0.75, roughness: 0.25 })
      );
      handle.rotation.z = Math.PI / 2;
      handle.position.set(-meshOffX * 0.6, -0.25, DOOR_D / 2 + 0.02);
      pivot.add(handle);
      group.add(pivot);
      return pivot;
    };

    const doorLeftPivot  = makeHingedDoor(-1.25,  0.60, -0.62);
    const doorRightPivot = makeHingedDoor( 1.25, -0.60,  0.62);

    return { id, group, doorLeftPivot, doorRightPivot };
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
    ctx.fillStyle = '#123447'; ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = '#1bf0ff'; ctx.lineWidth = 1;
    for (let y = 0; y < 64; y += 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); }
    ctx.fillStyle = '#b3fbff';
    [[10, 20, 40, 6], [10, 32, 55, 6], [10, 44, 30, 6]].forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
    return { canvas, ctx };
  }

  // ─── OVERHEAD LIGHTS ─────────────────────────────────────────────────────────

  _buildOverheadLightHousings() {
    const housingMat = new THREE.MeshStandardMaterial({ color: '#5f6471', roughness: 0.55, metalness: 0.18 });
    const panelMat   = new THREE.MeshStandardMaterial({ color: '#fffdf8', emissive: '#fff8ec', emissiveIntensity: 1.5 });
    [6, 2, -3, -8].forEach(z => {
      const housing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.55), housingMat);
      housing.position.set(0, 4.94, z);
      this.scene.add(housing);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.025, 0.42), panelMat);
      panel.position.set(0, 4.87, z);
      this.scene.add(panel);
      const light = new THREE.PointLight('#fff8ef', 2.25, 12);
      light.position.set(0, 4.75, z);
      this.scene.add(light);
      [-0.5, 0.5].forEach(dx => {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 6), new THREE.MeshStandardMaterial({ color: '#747886' }));
        rod.position.set(dx, 5.0, z);
        this.scene.add(rod);
      });
    });
  }

  _buildPeripheralProps() {
    const textureLoader = new THREE.TextureLoader();

    const createChartTexture = (title, lines, accent = '#00D4FF') => {
      const cv = document.createElement('canvas');
      cv.width = 640;
      cv.height = 420;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#f4f2eb';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.strokeStyle = '#5d6470';
      ctx.lineWidth = 10;
      ctx.strokeRect(8, 8, cv.width - 16, cv.height - 16);
      ctx.fillStyle = '#222833';
      ctx.font = '700 42px Arial';
      ctx.fillText(title, 32, 62);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(32, 84);
      ctx.lineTo(cv.width - 32, 84);
      ctx.stroke();
      ctx.font = '600 28px Arial';
      lines.forEach((line, index) => ctx.fillText(line, 32, 140 + index * 52));
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const periodicTableTexture = textureLoader.load(periodicTableFrame);
    periodicTableTexture.colorSpace = THREE.SRGBColorSpace;
    periodicTableTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const rightWallPosterTexture = textureLoader.load(rightWallPoster);
    rightWallPosterTexture.colorSpace = THREE.SRGBColorSpace;
    rightWallPosterTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const rightWallCoatsTexture = textureLoader.load(rightWallCoats);
    rightWallCoatsTexture.colorSpace = THREE.SRGBColorSpace;
    rightWallCoatsTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

    const frameMat = new THREE.MeshStandardMaterial({ color: '#67707c', roughness: 0.4, metalness: 0.35 });
    const addFramedPanel = ({ texture, position, rotationY = 0, width = 3.6, height = 2.2 }) => {
      const group = new THREE.Group();
      group.position.copy(position);
      group.rotation.y = rotationY;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.16, height + 0.16, 0.08), frameMat);
      group.add(frame);
      const art = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      art.position.z = 0.05;
      group.add(art);
      this.scene.add(group);
      return art;
    };

    const addArtworkPanel = ({ texture, position, rotationY = 0, width = 5.1, height = 3.4 }) => {
      const group = new THREE.Group();
      group.position.copy(position);
      group.rotation.y = rotationY;

      const backing = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.1, height + 0.1, 0.04),
        new THREE.MeshStandardMaterial({ color: '#f2eee5', roughness: 0.72, metalness: 0.02 })
      );
      group.add(backing);

      const art = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      art.position.z = 0.03;
      group.add(art);

      this.scene.add(group);
      return art;
    };

    const addWallPoster = ({ texture, position, rotationY = 0, width = 3.6, height = 2.0 }) => {
      const poster = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      poster.position.copy(position);
      poster.rotation.y = rotationY;
      this.scene.add(poster);
      return poster;
    };

    const addFloorCoatStandImage = ({ texture, position, rotationY = 0, width = 1.72, height = 2.58 }) => {
      const group = new THREE.Group();
      group.position.copy(position);
      group.rotation.y = rotationY;
      const baseGroundOffset = 0.11;

      const coatStandMat = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.08,
        side: THREE.DoubleSide,
        roughness: 0.82,
        metalness: 0.02,
      });

      const coatStand = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        coatStandMat
      );
      coatStand.position.set(0, height * 0.5 - baseGroundOffset, 0);
      group.add(coatStand);

      this.scene.add(group);
      return group;
    };

    addFramedPanel({
      texture: createChartTexture('Reaction Safety', [
        'Add acid to water, never reverse',
        'Vent flasks before heating',
        'Reactive metals stay dry',
        'Goggles on before ignition',
      ], '#FF8C00'),
      position: new THREE.Vector3(-9.7, 2.5, 8.5),
      rotationY: Math.PI / 2,
      width: 3.1,
      height: 2.0,
    });

    addWallPoster({
      texture: rightWallPosterTexture,
      position: new THREE.Vector3(9.7, 2.5, -1.5),
      rotationY: -Math.PI / 2,
      width: 3.7,
      height: 2.08,
    });

    const periodicPanel = addArtworkPanel({
      texture: periodicTableTexture,
      position: new THREE.Vector3(0, 2.65, -13.84),
      rotationY: 0,
      width: 5.05,
      height: 3.36,
    });
    periodicPanel.userData.periodicTable = true;
    this._periodicTarget = periodicPanel;

    const clockGroup = new THREE.Group();
    clockGroup.position.set(7.2, 3.35, 13.85);
    const clockFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.72, 0.08, 40),
      new THREE.MeshStandardMaterial({ color: '#f8f5ef', roughness: 0.34, metalness: 0.08 })
    );
    clockFace.rotation.x = Math.PI / 2;
    clockGroup.add(clockFace);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.05, 12, 40),
      new THREE.MeshStandardMaterial({ color: '#67707c', roughness: 0.28, metalness: 0.55 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.z = 0.04;
    clockGroup.add(ring);
    for (let i = 0; i < 12; i++) {
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, i % 3 === 0 ? 0.14 : 0.08, 0.03),
        new THREE.MeshStandardMaterial({ color: '#2e3540' })
      );
      const angle = (i / 12) * Math.PI * 2;
      tick.position.set(Math.sin(angle) * 0.52, Math.cos(angle) * 0.52, 0.05);
      clockGroup.add(tick);
    }
    const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.02), new THREE.MeshStandardMaterial({ color: '#2e3540' }));
    hourHand.position.set(0.08, 0.1, 0.07);
    hourHand.rotation.z = -0.75;
    clockGroup.add(hourHand);
    const minuteHand = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.44, 0.02), new THREE.MeshStandardMaterial({ color: '#00D4FF' }));
    minuteHand.position.set(0.14, -0.02, 0.075);
    minuteHand.rotation.z = 1.15;
    clockGroup.add(minuteHand);
    this.scene.add(clockGroup);

    const addWallCabinet = (x) => {
      const group = new THREE.Group();
      group.position.set(x, 2.4, -13.74);
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 1.6, 0.34),
        new THREE.MeshStandardMaterial({ color: '#4d5360', roughness: 0.58, metalness: 0.18 })
      );
      group.add(body);
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(1.66, 0.08, 0.08),
        new THREE.MeshStandardMaterial({ color: '#FF8C00', emissive: '#FF5A00', emissiveIntensity: 0.45, roughness: 0.35 })
      );
      trim.position.set(0, 0.83, 0.17);
      group.add(trim);
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 0.03, 0.03),
        new THREE.MeshStandardMaterial({ color: '#00D4FF', emissive: '#00D4FF', emissiveIntensity: 1.3 })
      );
      led.position.set(0, 0.7, 0.19);
      group.add(led);
      const doors = new THREE.Mesh(
        new THREE.BoxGeometry(1.45, 1.45, 0.04),
        new THREE.MeshStandardMaterial({ color: '#b8bec8', roughness: 0.42, metalness: 0.2 })
      );
      doors.position.set(0, 0, 0.2);
      group.add(doors);
      const handleLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), frameMat);
      handleLeft.rotation.z = Math.PI / 2;
      handleLeft.position.set(-0.18, -0.08, 0.24);
      group.add(handleLeft);
      const handleRight = handleLeft.clone();
      handleRight.position.x = 0.18;
      group.add(handleRight);
      this.scene.add(group);
    };

    addWallCabinet(-4.2);
    addWallCabinet(4.2);

    const stationMat = new THREE.MeshStandardMaterial({ color: '#4d5360', roughness: 0.58, metalness: 0.18 });
    const stationTopMat = new THREE.MeshStandardMaterial({ color: '#e0dbd1', roughness: 0.22, metalness: 0.04 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#e8f7ff', transparent: true, opacity: 0.5, transmission: 0.9, roughness: 0.08, thickness: 0.12,
    });
    const whiteCoatMat = new THREE.MeshStandardMaterial({ color: '#f3f5f8', roughness: 0.72 });
    const scrubMat = new THREE.MeshStandardMaterial({ color: '#9fd8ea', roughness: 0.68 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#343b46', roughness: 0.5 });
    const skinMat = new THREE.MeshStandardMaterial({ color: '#d9b29c', roughness: 0.75 });
    const hairMat = new THREE.MeshStandardMaterial({ color: '#25303a', roughness: 0.7 });

    const addSideStation = ({ x, z, rotY, personOffsetX = 0 }) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.rotation.y = rotY;

      const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.92, 0.92), stationMat);
      base.position.y = 0.46;
      group.add(base);
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.12, 1.04), stationTopMat);
      top.position.y = 0.98;
      group.add(top);
      const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.32, 0.05), stationMat);
      monitor.position.set(-0.52, 1.28, 0.02);
      group.add(monitor);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.22), new THREE.MeshBasicMaterial({ color: '#9cf6ff' }));
      screen.position.set(-0.52, 1.28, 0.03);
      group.add(screen);
      const flask = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 18), glassMat);
      flask.position.set(0.46, 1.12, 0.04);
      flask.scale.y = 1.18;
      group.add(flask);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.18, 14), glassMat);
      neck.position.set(0.46, 1.28, 0.04);
      group.add(neck);

      const person = new THREE.Group();
      person.position.set(personOffsetX, 0, -0.78);
      const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.95, 14), scrubMat);
      legs.position.y = 0.48;
      person.add(legs);
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.88, 0.34), whiteCoatMat);
      torso.position.y = 1.28;
      person.add(torso);
      const coatSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.42, 0.18), whiteCoatMat);
      coatSkirt.position.set(0, 0.98, 0.08);
      person.add(coatSkirt);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 18), skinMat);
      head.position.y = 1.94;
      person.add(head);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.225, 18, 18, 0, Math.PI * 2, 0, Math.PI / 1.9), hairMat);
      hair.position.y = 2.01;
      person.add(hair);
      const mask = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.12), scrubMat);
      mask.position.set(0, 1.86, 0.16);
      person.add(mask);
      const glassesMat = new THREE.MeshStandardMaterial({ color: '#64717f', metalness: 0.7, roughness: 0.28 });
      const glasses = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 8, 18), glassesMat);
      glasses.position.set(-0.08, 1.92, 0.19);
      glasses.rotation.y = Math.PI / 2;
      person.add(glasses);
      const glasses2 = glasses.clone();
      glasses2.position.x = 0.08;
      person.add(glasses2);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.01), glassesMat);
      bridge.position.set(0, 1.92, 0.19);
      person.add(bridge);
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.72, 12), whiteCoatMat);
      armL.position.set(-0.38, 1.28, 0.06);
      armL.rotation.z = 1.0;
      person.add(armL);
      const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.72, 12), whiteCoatMat);
      armR.position.set(0.34, 1.36, -0.02);
      armR.rotation.z = -0.72;
      armR.rotation.x = 0.55;
      person.add(armR);
      const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.34), shoeMat);
      shoeL.position.set(-0.12, 0.05, 0.02);
      person.add(shoeL);
      const shoeR = shoeL.clone();
      shoeR.position.x = 0.12;
      person.add(shoeR);
      group.add(person);
      this.scene.add(group);
    };

    addSideStation({ x: -8.55, z: 10.8, rotY: Math.PI / 2, personOffsetX: 0.22 });
    addSideStation({ x: 8.55, z: -8.8, rotY: -Math.PI / 2, personOffsetX: -0.16 });
    addFloorCoatStandImage({
      texture: rightWallCoatsTexture,
      position: new THREE.Vector3(7.92, 0, 4.35),
      rotationY: -Math.PI / 2 + 0.52,
      width: 1.9,
      height: 2.86,
    });
  }

  // ─── RAYCASTING ──────────────────────────────────────────────────────────────

  _setupRaycasting(canvas) {
    this._clickHandler = e => {
      if (this.controls?.shouldIgnoreClick?.()) return;

      const periodicHit = this._periodicTarget
        ? intersectObjects(e, canvas, this.camera, [this._periodicTarget])
        : null;
      if (periodicHit) {
        labState.emit('periodic:opened', {});
        return;
      }

      const itemHit = intersectObjects(e, canvas, this.camera, this._benchItemTargets);
      if (
        itemHit?.object?.userData?.benchId
        && itemHit.object.userData.benchId === this._activeBenchId
        && itemHit.object.userData.reactantFormula
      ) {
        labState.emit('bench:reactantSelected', {
          benchId: itemHit.object.userData.benchId,
          reactant: {
            id: itemHit.object.userData.reactantId ?? null,
            name: itemHit.object.userData.reactantName ?? null,
            formula: itemHit.object.userData.reactantFormula,
            displayName: itemHit.object.userData.reactantDisplayName ?? itemHit.object.userData.reactantFormula,
          },
        });
        return;
      }

      const benchHit = intersectObjects(e, canvas, this.camera, this._benchClickTargets);
      if (benchHit?.object?.userData?.benchAction === 'toggle-compartment') {
        this._benchMap.get(benchHit.object.userData.storageBenchId)?.handleAction?.('toggle-compartment');
        return;
      }
      if (benchHit?.object?.userData?.benchId) {
        this.focusBench(benchHit.object.userData.benchId);
        return;
      }

      if (itemHit?.object?.userData?.benchId && !itemHit.object.userData.preventBenchFocus) {
        this.focusBench(itemHit.object.userData.benchId);
      }
    };
    canvas.addEventListener('click', this._clickHandler);

    this._mousemoveHandler = e => {
      if (this.controls?.isDraggingLook?.()) {
        if (this._hoveredBenchId) {
          this._benchMap.get(this._hoveredBenchId)?.setHovered(false);
          this._hoveredBenchId = null;
        }
        if (this._hoveredItemObj) {
          this._benchMap.get(this._hoveredItemObj.userData.benchId)?.setHoveredObject(null);
          this._hoveredItemObj = null;
        }
        if (this._hoveredDustbinObj) {
          this._hoveredDustbinObj.userData.onHoverChange?.(false);
          this._hoveredDustbinObj = null;
        }
        canvas.style.cursor = 'grabbing';
        if (this._tooltipEl) {
          this._tooltipEl.style.opacity = '0';
          this._tooltipEl.style.visibility = 'hidden';
        }
        return;
      }

      const itemHit  = intersectObjects(e, canvas, this.camera, this._benchItemTargets);
      const benchHit = itemHit ? null : intersectObjects(e, canvas, this.camera, this._benchClickTargets);
      const dustbinHit = itemHit || benchHit
        ? null
        : intersectObjects(e, canvas, this.camera, this._dustbinHoverTargets);
      const periodicHit = itemHit || benchHit || !this._periodicTarget
        ? null
        : intersectObjects(e, canvas, this.camera, [this._periodicTarget]);

      const hoveredBenchId = itemHit?.object?.userData?.benchId
        ?? benchHit?.object?.userData?.benchId
        ?? null;

      if (hoveredBenchId !== this._hoveredBenchId) {
        if (this._hoveredBenchId) this._benchMap.get(this._hoveredBenchId)?.setHovered(false);
        this._hoveredBenchId = hoveredBenchId;
        if (this._hoveredBenchId) this._benchMap.get(this._hoveredBenchId)?.setHovered(true);
      }

      const itemObj = itemHit?.object ?? null;
      if (itemObj !== this._hoveredItemObj) {
        if (this._hoveredItemObj) {
          this._benchMap.get(this._hoveredItemObj.userData.benchId)?.setHoveredObject(null);
        }
        this._hoveredItemObj = itemObj;
        if (this._hoveredItemObj) {
          this._benchMap.get(this._hoveredItemObj.userData.benchId)?.setHoveredObject(this._hoveredItemObj.userData.hoverKey ?? null);
        }
      }

      const dustbinObj = dustbinHit?.object ?? null;
      if (dustbinObj !== this._hoveredDustbinObj) {
        if (this._hoveredDustbinObj) this._hoveredDustbinObj.userData.onHoverChange?.(false);
        this._hoveredDustbinObj = dustbinObj;
        if (this._hoveredDustbinObj) this._hoveredDustbinObj.userData.onHoverChange?.(true);
      }

      // Tooltip
      if (this._tooltipEl) {
        const hoverName = itemHit?.object?.userData?.hoverName
          ?? benchHit?.object?.userData?.hoverName
          ?? dustbinHit?.object?.userData?.hoverName
          ?? null;
        canvas.style.cursor = hoverName || periodicHit ? 'pointer' : 'default';
        if (hoverName) {
          const r = canvas.getBoundingClientRect();
          this._tooltipEl.textContent      = hoverName;
          this._tooltipEl.style.visibility = 'visible';
          this._tooltipEl.style.opacity    = '1';
          this._tooltipEl.style.transform  = `translate(${e.clientX - r.left + 16}px,${e.clientY - r.top + 18}px)`;
        } else {
          this._tooltipEl.style.opacity    = '0';
          this._tooltipEl.style.visibility = 'hidden';
        }
        if (!hoverName && periodicHit) {
          const r = canvas.getBoundingClientRect();
          this._tooltipEl.textContent      = 'Open Periodic Table';
          this._tooltipEl.style.visibility = 'visible';
          this._tooltipEl.style.opacity    = '1';
          this._tooltipEl.style.transform  = `translate(${e.clientX - r.left + 16}px,${e.clientY - r.top + 18}px)`;
        }
      }
    };
    canvas.addEventListener('mousemove', this._mousemoveHandler);
  }

  // ─── ANIMATE ─────────────────────────────────────────────────────────────────

  animate() {
    this._animFrameId = requestAnimationFrame(() => this.animate());
    const delta = this._clock.getDelta();
    const elapsed = this._clock.elapsedTime;

    this.controls.update(delta);
    this.camera.lookAt(this.controls.lookTarget);

    // Cabinet LED proximity pulse
    this._ledPulseData.forEach(({ led, light, group }) => {
      const dist  = this.camera.position.distanceTo(group.position);
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 2.2 + group.position.z);
      if (dist < 6) {
        led.material.emissiveIntensity = 2.0 + pulse * 1.4;
        light.intensity                = 0.7 + pulse * 0.7;
      } else {
        led.material.emissiveIntensity = 2.0;
        light.intensity                = 0.7;
      }
    });

    // Scanlines (every 3 frames)
    const tick = Math.floor(elapsed * 10);
    if (tick % 3 === 0) {
      this._scanlineMeshes.forEach(mesh => {
        const { screenCtx: ctx } = mesh.userData;
        if (!ctx) return;
        const cv = mesh.userData.screenCanvas;
        ctx.fillStyle = '#0a1a3e'; ctx.fillRect(0, 0, 128, 64);
        ctx.strokeStyle = '#002299'; ctx.lineWidth = 1;
        for (let y = 0; y < 64; y += 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); }
        const off = (tick * 2) % 64;
        ctx.strokeStyle = '#00ccff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, off); ctx.lineTo(128, off); ctx.stroke();
        ctx.fillStyle = '#00aaff';
        [[10, 20, 40, 6], [10, 32, 55, 6], [10, 44, 30, 6]].forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
        mesh.material.map.needsUpdate = true;
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this._animFrameId)   cancelAnimationFrame(this._animFrameId);
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
    const canvas = this.renderer?.domElement;
    if (canvas) {
      if (this._clickHandler)     canvas.removeEventListener('click',     this._clickHandler);
      if (this._mousemoveHandler) canvas.removeEventListener('mousemove', this._mousemoveHandler);
    }
    this.controls?.detach();
    this.renderer?.dispose();
  }
}
