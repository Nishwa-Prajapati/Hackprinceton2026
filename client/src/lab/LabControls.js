import * as THREE from 'three';
import gsap from 'gsap';

// Scroll path: ENTRANCE → CENTER → BENCH_VIEW (progress 0 → 0.5 → 1.0)
// Cabinet waypoints used by goToCabinet()
export const WAYPOINTS = {
  ENTRANCE:   { pos: { x: 0,  y: 1.7, z: 12  }, look: { x: 0,  y: 1.7, z: 0    } },
  CENTER:     { pos: { x: 0,  y: 1.7, z: 4   }, look: { x: 0,  y: 1.7, z: -4   } },
  BENCH_VIEW: { pos: { x: 0,  y: 1.4, z: 1   }, look: { x: 0,  y: 0.9, z: -3   } },
  CABINET_A:  { pos: { x: -7, y: 1.7, z: 2   }, look: { x: -9, y: 1.5, z: 2    } },
  CABINET_B:  { pos: { x: -7, y: 1.7, z: -3  }, look: { x: -9, y: 1.5, z: -3   } },
  CABINET_C:  { pos: { x: -2, y: 1.7, z: -11 }, look: { x: -3, y: 1.5, z: -13.5} },
  CABINET_D:  { pos: { x: 2,  y: 1.7, z: -11 }, look: { x: 3,  y: 1.5, z: -13.5} },
};

// Scroll path segments: [start wp, end wp, progress range start, range end]
const PATH = [
  { from: 'ENTRANCE',   to: 'CENTER',     t0: 0.0, t1: 0.5 },
  { from: 'CENTER',     to: 'BENCH_VIEW', t0: 0.5, t1: 1.0 },
];

function lerpVec(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export class LabControls {
  constructor(camera) {
    this.camera    = camera;
    // lookTarget is updated every frame; LabEngine calls camera.lookAt(lookTarget)
    this.lookTarget = new THREE.Vector3(0, 1.7, 0);

    // ── Scroll state ──────────────────────────────────────────────────────────
    this._progress    = 0;   // visual (smoothed) position along scroll path 0-1
    this._targetProg  = 0;   // where user has scrolled to
    this._velocity    = 0;   // progress-units/frame (with decay = momentum)

    // ── Cabinet state ─────────────────────────────────────────────────────────
    this._locked      = false;   // true while cabinet tween is active
    this._activeCab   = null;

    // ── Touch tracking ────────────────────────────────────────────────────────
    this._touchLastY  = 0;

    // ── Bound handlers ────────────────────────────────────────────────────────
    this._onWheel      = this._handleWheel.bind(this);
    this._onTouchStart = this._handleTouchStart.bind(this);
    this._onTouchMove  = this._handleTouchMove.bind(this);
    this._el           = null;
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  attach(el) {
    this._el = el;
    el.addEventListener('wheel',      this._onWheel,      { passive: true });
    el.addEventListener('touchstart', this._onTouchStart, { passive: true });
    el.addEventListener('touchmove',  this._onTouchMove,  { passive: true });
  }

  detach() {
    if (!this._el) return;
    this._el.removeEventListener('wheel',      this._onWheel);
    this._el.removeEventListener('touchstart', this._onTouchStart);
    this._el.removeEventListener('touchmove',  this._onTouchMove);
    this._el = null;
  }

  // Called every frame from LabEngine.animate()
  update() {
    if (this._locked) return;

    // Momentum decay — 0.88 gives ~0.6s coast at 60 fps (iOS feel)
    this._velocity *= 0.88;

    // Cap velocity so a fast flick can't teleport the camera
    this._velocity = clamp(this._velocity, -0.035, 0.035);

    this._targetProg = clamp(this._targetProg + this._velocity, 0, 1);

    // Extra damping at extremes so it gently bumps the wall
    if (this._targetProg === 0 || this._targetProg === 1) {
      this._velocity *= 0.4;
    }

    // Visual smoothing — lag factor 0.09 gives silky glide without feeling sluggish
    this._progress += (this._targetProg - this._progress) * 0.09;

    // Sync camera from progress
    const { pos, look } = this._pathAt(this._progress);
    this.camera.position.set(pos.x, pos.y, pos.z);
    this.lookTarget.set(look.x, look.y, look.z);
  }

  // Tween camera to a cabinet waypoint
  goToCabinet(cabinetId) {
    const key = 'CABINET_' + cabinetId;
    const wp  = WAYPOINTS[key];
    if (!wp || this._activeCab === cabinetId) return;

    this._velocity  = 0;
    this._locked    = true;
    this._activeCab = cabinetId;

    gsap.to(this.camera.position, {
      x: wp.pos.x, y: wp.pos.y, z: wp.pos.z,
      duration: 0.85, ease: 'power2.inOut',
    });
    gsap.to(this.lookTarget, {
      x: wp.look.x, y: wp.look.y, z: wp.look.z,
      duration: 0.85, ease: 'power2.inOut',
    });
  }

  // Tween camera back to scroll-path position
  returnToLab() {
    const { pos, look } = this._pathAt(this._targetProg);

    gsap.to(this.camera.position, {
      x: pos.x, y: pos.y, z: pos.z,
      duration: 0.85, ease: 'power2.inOut',
      onComplete: () => {
        this._progress  = this._targetProg; // sync so update() won't jump
        this._velocity  = 0;
        this._locked    = false;
        this._activeCab = null;
      },
    });
    gsap.to(this.lookTarget, {
      x: look.x, y: look.y, z: look.z,
      duration: 0.85, ease: 'power2.inOut',
    });
  }

  // ── Internal: path interpolation ─────────────────────────────────────────────

  _pathAt(t) {
    for (const seg of PATH) {
      if (t <= seg.t1) {
        const u  = (t - seg.t0) / (seg.t1 - seg.t0);
        const wA = WAYPOINTS[seg.from];
        const wB = WAYPOINTS[seg.to];
        return {
          pos:  lerpVec(wA.pos,  wB.pos,  u),
          look: lerpVec(wA.look, wB.look, u),
        };
      }
    }
    // t === 1.0 edge case
    const last = PATH[PATH.length - 1];
    return { pos: WAYPOINTS[last.to].pos, look: WAYPOINTS[last.to].look };
  }

  // ── Event handlers ────────────────────────────────────────────────────────────

  _handleWheel(e) {
    if (this._locked) return;

    // Normalise across deltaMode (trackpad fires Mode 0/pixels, mouse may fire Mode 1/lines)
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 16;   // lines  → pixels
    if (e.deltaMode === 2) delta *= 400;  // pages  → pixels

    // Sensitivity tuned so a comfortable trackpad swipe (~250 px total)
    // moves the camera from ENTRANCE to CENTER in one gesture.
    // Mouse wheel (100 px/notch) gives ~0.018 per click — gentle but clear.
    const SENSITIVITY = 0.0018;
    this._velocity += delta * SENSITIVITY;
  }

  _handleTouchStart(e) {
    this._touchLastY = e.touches[0].clientY;
  }

  _handleTouchMove(e) {
    if (this._locked) return;

    const deltaY     = this._touchLastY - e.touches[0].clientY; // inverted: swipe up = forward
    this._touchLastY = e.touches[0].clientY;

    // Touch pixels are screen pixels — same sensitivity as trackpad
    const SENSITIVITY = 0.0022;
    this._velocity += deltaY * SENSITIVITY;
  }
}
