import * as THREE from "three";

export class CameraController {
  constructor(camera, { position, lookAt, bounds }) {
    this.camera = camera;
    this.bounds = bounds;
    this.targetPosition = position.clone();
    this.targetLookAt = lookAt.clone();
    this.currentLookAt = lookAt.clone();
    this.eyeHeight = position.y;
    this.isDragging = false;
    this.isAnimating = false;
    this.yaw = 0;
    this.pitch = 0;
    this.pointer = new THREE.Vector2();
    this.forward = new THREE.Vector3();
    this.offset = new THREE.Vector3();
    this.positionDamping = 11;
    this.lookDamping = 12;
    this.dragSensitivity = 0.0035;
    this.pitchSensitivity = 0.0022;
    this.scrollStrength = 0.0062;
    this.minPitch = -0.34;
    this.maxPitch = 0.08;

    this.camera.position.copy(this.targetPosition);
    this.camera.lookAt(this.targetLookAt);
    this.syncAnglesFromLookTarget();
  }

  beginDrag(clientX, clientY) {
    if (this.isAnimating) {
      return;
    }

    this.isDragging = true;
    this.pointer.set(clientX, clientY);
  }

  drag(clientX, clientY) {
    if (!this.isDragging || this.isAnimating) {
      return 0;
    }

    const deltaX = clientX - this.pointer.x;
    const deltaY = clientY - this.pointer.y;
    this.pointer.set(clientX, clientY);

    this.yaw -= deltaX * this.dragSensitivity;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - deltaY * this.pitchSensitivity,
      this.minPitch,
      this.maxPitch
    );

    this.updateLookTargetFromAngles();
    return Math.abs(deltaX) + Math.abs(deltaY);
  }

  endDrag() {
    this.isDragging = false;
  }

  handleWheel(deltaY) {
    if (this.isAnimating) {
      return;
    }

    const distance = THREE.MathUtils.clamp(
      deltaY * this.scrollStrength,
      -0.95,
      0.95
    );
    const forward = this.getForwardVector();
    forward.y = 0;

    if (forward.lengthSq() === 0) {
      return;
    }

    forward.normalize();
    this.targetPosition.addScaledVector(forward, distance);
    this.targetPosition.x = THREE.MathUtils.clamp(
      this.targetPosition.x,
      this.bounds.minX,
      this.bounds.maxX
    );
    this.targetPosition.z = THREE.MathUtils.clamp(
      this.targetPosition.z,
      this.bounds.minZ,
      this.bounds.maxZ
    );
    this.targetPosition.y = this.eyeHeight;

    this.updateLookTargetFromAngles();
  }

  setPose(position, lookAt) {
    this.targetPosition.copy(position);
    this.targetLookAt.copy(lookAt);
    this.currentLookAt.copy(lookAt);
    this.camera.position.copy(position);
    this.camera.lookAt(lookAt);
    this.eyeHeight = position.y;
    this.syncAnglesFromLookTarget();
  }

  syncAnglesFromLookTarget() {
    this.offset.subVectors(this.targetLookAt, this.targetPosition);
    const horizontalDistance = Math.max(
      Math.hypot(this.offset.x, this.offset.z),
      0.0001
    );

    this.yaw = Math.atan2(this.offset.x, -this.offset.z);
    this.pitch = THREE.MathUtils.clamp(
      Math.atan2(this.offset.y, horizontalDistance),
      this.minPitch,
      this.maxPitch
    );
  }

  updateLookTargetFromAngles(distance = 7.2) {
    const direction = this.getForwardVector();
    this.targetLookAt.copy(this.targetPosition).addScaledVector(direction, distance);
  }

  getForwardVector() {
    const cosPitch = Math.cos(this.pitch);
    return this.forward
      .set(
        Math.sin(this.yaw) * cosPitch,
        Math.sin(this.pitch),
        -Math.cos(this.yaw) * cosPitch
      )
      .normalize();
  }

  update(deltaSeconds) {
    if (this.isAnimating) {
      this.camera.position.copy(this.targetPosition);
      this.currentLookAt.copy(this.targetLookAt);
    } else {
      const positionAlpha = 1 - Math.exp(-this.positionDamping * deltaSeconds);
      const lookAlpha = 1 - Math.exp(-this.lookDamping * deltaSeconds);

      this.camera.position.lerp(this.targetPosition, positionAlpha);
      this.currentLookAt.lerp(this.targetLookAt, lookAlpha);
    }

    this.camera.lookAt(this.currentLookAt);
  }
}
