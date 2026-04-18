import * as THREE from "three";

const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
raycaster.params.Sprite.threshold = 0.45;

export function intersectInteractiveObjects(event, domElement, camera, objects) {
  const rect = domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(objects, false);
  return intersections[0] ?? null;
}
