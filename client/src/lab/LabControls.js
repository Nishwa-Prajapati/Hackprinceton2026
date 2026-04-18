import * as THREE from 'three';
import gsap from 'gsap';

export const WAYPOINTS = {
  ENTRANCE:   { pos: { x: 0,  y: 1.7, z: 12  }, look: { x: 0,  y: 1.7, z: 0     } },
  CENTER:     { pos: { x: 0,  y: 1.7, z: 4   }, look: { x: 0,  y: 1.7, z: -4    } },
  BENCH_VIEW: { pos: { x: 0,  y: 1.4, z: 1   }, look: { x: 0,  y: 0.9, z: -3    } },
  CABINET_A:  { pos: { x: -7, y: 1.7, z: 2   }, look: { x: -9, y: 1.5, z: 2     } },
  CABINET_B:  { pos: { x: -7, y: 1.7, z: -3  }, look: { x: -9, y: 1.5, z: -3    } },
  CABINET_C:  { pos: { x: -2, y: 1.7, z: -11 }, look: { x: -3, y: 1.5, z: -13.5 } },
  CABINET_D:  { pos: { x: 2,  y: 1.7, z: -11 }, look: { x: 3,  y: 1.5, z: -13.5 } },
};

const PATH = [
  { from: 'ENTRANCE', to: 'CENTER',     t0: 0.0,  t1: 0.5 },
  { from: 'CENTER',   to: 'BENCH_VIEW', t0: 0.5,  t1: 1.0 },
];

const EYE_HEIGHT = 1.7;
const KEY_MOVE_SPEED = 4.7;
const MAX_SCROLL_SPEED = 6.4;
const ROOM_BOUNDS = {
  minX: -8.6,
  maxX: 8.6,
  minZ: -12.6,
  maxZ: 13.3,
};

function lerpVec(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function dampFactor(rate, dt) {
  return 1 - Math.exp(-rate * dt);
}

function lerpAngle(a, b, t) {
  const diff = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + diff * t;
}

function directionFromAngles(yaw, pitch, target) {
  const cosPitch = Math.cos(pitch);
  target.set(
    Math.sin(yaw) * cosPitch,
    Math.sin(pitch),
    -Math.cos(yaw) * cosPitch
  );
  return target.normalize();
}

export class LabControls {
  constructor(camera) {
    this.camera = camera;
    this.lookTarget = new THREE.Vector3(0, EYE_HEIGHT, 0);

    this._locked = false;
    this._activeCab = null;
    this._benchFocused = false;
    this._uiLocked = false;

    this._yaw = 0;
    this._targetYaw = 0;
    this._pitch = 0;
    this._targetPitch = 0;

    this._roamPosition = camera.position.clone();
    this._roamVelocity = new THREE.Vector3();
    this._desiredVelocity = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._lookDirection = new THREE.Vector3();
    this._returnLook = new THREE.Vector3();
    this._scrollVelocity = 0;

    this._keys = {
      forward: false,
      back: false,
      left: false,
      right: false,
    };

    this._pointerDragging = false;
    this._pointerId = null;
    this._lastPointerX = 0;
    this._lastPointerY = 0;
    this._dragDistance = 0;
    this._suppressNextClick = false;

    this._onWheel = this._handleWheel.bind(this);
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onKeyUp = this._handleKeyUp.bind(this);
    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);
    this._el = null;

    this._syncRoamFromVectors(this.camera.position, this.lookTarget);
  }

  attach(el) {
    this._el = el;
    el.style.touchAction = 'none';
    el.addEventListener('wheel', this._onWheel, { passive: true });
    el.addEventListener('pointerdown', this._onPointerDown);
    el.addEventListener('pointermove', this._onPointerMove);
    el.addEventListener('pointerup', this._onPointerUp);
    el.addEventListener('pointercancel', this._onPointerUp);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  detach() {
    if (!this._el) return;
    this._el.removeEventListener('wheel', this._onWheel);
    this._el.removeEventListener('pointerdown', this._onPointerDown);
    this._el.removeEventListener('pointermove', this._onPointerMove);
    this._el.removeEventListener('pointerup', this._onPointerUp);
    this._el.removeEventListener('pointercancel', this._onPointerUp);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this._el = null;
  }

  update(delta = 1 / 60) {
    if (this._locked || this._benchFocused || this._uiLocked) return;

    const dt = clamp(delta, 1 / 240, 0.05);
    const lookDamp = dampFactor(14, dt);
    const moveDamp = dampFactor(10, dt);

    this._yaw = lerpAngle(this._yaw, this._targetYaw, lookDamp);
    this._pitch += (this._targetPitch - this._pitch) * lookDamp;

    directionFromAngles(this._yaw, this._pitch, this._lookDirection);
    this._forward.set(this._lookDirection.x, 0, this._lookDirection.z);
    if (this._forward.lengthSq() < 1e-6) {
      this._forward.set(0, 0, -1);
    } else {
      this._forward.normalize();
    }
    this._right.set(-this._forward.z, 0, this._forward.x).normalize();

    const forwardInput = Number(this._keys.forward) - Number(this._keys.back);
    const strafeInput = Number(this._keys.right) - Number(this._keys.left);

    this._desiredVelocity.set(0, 0, 0);
    if (forwardInput || strafeInput) {
      this._desiredVelocity
        .addScaledVector(this._forward, forwardInput)
        .addScaledVector(this._right, strafeInput);
      if (this._desiredVelocity.lengthSq() > 1) this._desiredVelocity.normalize();
      this._desiredVelocity.multiplyScalar(KEY_MOVE_SPEED);
    }

    this._scrollVelocity *= Math.exp(-5.2 * dt);
    this._scrollVelocity = clamp(this._scrollVelocity, -MAX_SCROLL_SPEED, MAX_SCROLL_SPEED);
    this._desiredVelocity.addScaledVector(this._forward, this._scrollVelocity);

    this._roamVelocity.lerp(this._desiredVelocity, moveDamp);
    this._roamPosition.addScaledVector(this._roamVelocity, dt);

    const clampedX = clamp(this._roamPosition.x, ROOM_BOUNDS.minX, ROOM_BOUNDS.maxX);
    const clampedZ = clamp(this._roamPosition.z, ROOM_BOUNDS.minZ, ROOM_BOUNDS.maxZ);
    if (clampedX !== this._roamPosition.x) this._roamVelocity.x = 0;
    if (clampedZ !== this._roamPosition.z) this._roamVelocity.z = 0;
    this._roamPosition.set(clampedX, EYE_HEIGHT, clampedZ);

    this.camera.position.copy(this._roamPosition);
    this.lookTarget.copy(this._roamPosition).addScaledVector(this._lookDirection, 4.2);
  }

  goToCabinet(cabinetId) {
    const wp = WAYPOINTS[`CABINET_${cabinetId}`];
    if (!wp || this._activeCab === cabinetId) return;

    this._endPointerDrag();
    this._roamVelocity.set(0, 0, 0);
    this._scrollVelocity = 0;
    this._locked = true;
    this._activeCab = cabinetId;

    gsap.to(this.camera.position, {
      x: wp.pos.x,
      y: wp.pos.y,
      z: wp.pos.z,
      duration: 0.85,
      ease: 'power2.inOut',
    });
    gsap.to(this.lookTarget, {
      x: wp.look.x,
      y: wp.look.y,
      z: wp.look.z,
      duration: 0.85,
      ease: 'power2.inOut',
    });
  }

  returnToLab() {
    this._benchFocused = false;
    this._locked = true;
    this._endPointerDrag();

    const look = this._buildRoamLookTarget();
    gsap.to(this.camera.position, {
      x: this._roamPosition.x,
      y: this._roamPosition.y,
      z: this._roamPosition.z,
      duration: 0.52,
      ease: 'power3.out',
      onComplete: () => {
        this._locked = false;
        this._activeCab = null;
        this._syncRoamFromVectors(this.camera.position, this.lookTarget);
      },
    });
    gsap.to(this.lookTarget, {
      x: look.x,
      y: look.y,
      z: look.z,
      duration: 0.52,
      ease: 'power3.out',
    });
  }

  focusBench(focusZone) {
    this._endPointerDrag();
    this._roamVelocity.set(0, 0, 0);
    this._scrollVelocity = 0;
    this._locked = true;
    this._benchFocused = true;

    gsap.to(this.camera.position, {
      x: focusZone.position.x,
      y: focusZone.position.y,
      z: focusZone.position.z,
      duration: 0.5,
      ease: 'power3.out',
    });
    gsap.to(this.lookTarget, {
      x: focusZone.lookAt.x,
      y: focusZone.lookAt.y,
      z: focusZone.lookAt.z,
      duration: 0.5,
      ease: 'power3.out',
      onComplete: () => {
        this._locked = false;
      },
    });
  }

  exitBench() {
    this._benchFocused = false;
    this.returnToLab();
  }

  setUiLocked(locked) {
    this._uiLocked = locked;
    this._roamVelocity.set(0, 0, 0);
    this._scrollVelocity = 0;
    if (locked) this._endPointerDrag();
  }

  flyIn(onComplete) {
    const { pos, look } = this._pathAt(0.22);
    this._locked = true;
    this._endPointerDrag();

    gsap.to(this.camera.position, {
      x: pos.x,
      y: pos.y,
      z: pos.z,
      duration: 2.15,
      ease: 'power2.inOut',
      onComplete: () => {
        this._locked = false;
        this._syncRoamFromVectors(this.camera.position, this.lookTarget);
        onComplete?.();
      },
    });
    gsap.to(this.lookTarget, {
      x: look.x,
      y: look.y,
      z: look.z,
      duration: 2.15,
      ease: 'power2.inOut',
    });
  }

  shouldIgnoreClick() {
    if (!this._suppressNextClick) return false;
    this._suppressNextClick = false;
    return true;
  }

  isDraggingLook() {
    return this._pointerDragging;
  }

  _buildRoamLookTarget() {
    directionFromAngles(this._targetYaw, this._targetPitch, this._returnLook);
    return {
      x: this._roamPosition.x + this._returnLook.x * 4.2,
      y: this._roamPosition.y + this._returnLook.y * 4.2,
      z: this._roamPosition.z + this._returnLook.z * 4.2,
    };
  }

  _syncRoamFromVectors(position, look) {
    this._roamPosition.copy(position);
    this._roamPosition.y = EYE_HEIGHT;

    this._returnLook.subVectors(look, position).normalize();
    this._yaw = this._targetYaw = Math.atan2(this._returnLook.x, -this._returnLook.z);
    this._pitch = this._targetPitch = Math.asin(clamp(this._returnLook.y, -0.95, 0.95));
    this._roamVelocity.set(0, 0, 0);
    this._scrollVelocity = 0;
  }

  _pathAt(t) {
    for (const seg of PATH) {
      if (t <= seg.t1) {
        const u = (t - seg.t0) / (seg.t1 - seg.t0);
        const wA = WAYPOINTS[seg.from];
        const wB = WAYPOINTS[seg.to];
        return {
          pos: lerpVec(wA.pos, wB.pos, u),
          look: lerpVec(wA.look, wB.look, u),
        };
      }
    }

    const last = PATH[PATH.length - 1];
    return { pos: WAYPOINTS[last.to].pos, look: WAYPOINTS[last.to].look };
  }

  _handleWheel(e) {
    if (this._locked || this._benchFocused || this._uiLocked) return;

    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 16;
    if (e.deltaMode === 2) delta *= 400;

    const SENSITIVITY = 0.012;
    this._scrollVelocity += delta * SENSITIVITY;
  }

  _handleKeyDown(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this._keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this._keys.back = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this._keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this._keys.right = true;
        break;
      default:
        break;
    }
  }

  _handleKeyUp(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this._keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this._keys.back = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this._keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this._keys.right = false;
        break;
      default:
        break;
    }
  }

  _handlePointerDown(e) {
    if (e.button !== 0 || this._locked || this._benchFocused || this._uiLocked) return;
    this._pointerDragging = true;
    this._pointerId = e.pointerId;
    this._lastPointerX = e.clientX;
    this._lastPointerY = e.clientY;
    this._dragDistance = 0;
    this._el?.setPointerCapture?.(e.pointerId);
  }

  _handlePointerMove(e) {
    if (!this._pointerDragging || e.pointerId !== this._pointerId) return;

    const dx = e.clientX - this._lastPointerX;
    const dy = e.clientY - this._lastPointerY;
    this._lastPointerX = e.clientX;
    this._lastPointerY = e.clientY;
    this._dragDistance += Math.abs(dx) + Math.abs(dy);

    const LOOK_SENSITIVITY_X = 0.0048;
    const LOOK_SENSITIVITY_Y = 0.0032;
    this._targetYaw -= dx * LOOK_SENSITIVITY_X;
    this._targetPitch = clamp(this._targetPitch - dy * LOOK_SENSITIVITY_Y, -0.58, 0.42);
  }

  _handlePointerUp(e) {
    if (e.pointerId !== this._pointerId) return;
    if (this._dragDistance > 8) this._suppressNextClick = true;
    this._endPointerDrag();
  }

  _endPointerDrag() {
    if (this._pointerId !== null) {
      this._el?.releasePointerCapture?.(this._pointerId);
    }
    this._pointerDragging = false;
    this._pointerId = null;
    this._dragDistance = 0;
  }
}
