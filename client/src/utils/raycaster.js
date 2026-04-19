import * as THREE from 'three';

const _pointer  = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
_raycaster.params.Sprite = { threshold: 0.45 };

export function intersectObjects(event, domElement, camera, objects) {
  const rect = domElement.getBoundingClientRect();
  _pointer.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
  _pointer.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
  _raycaster.setFromCamera(_pointer, camera);
  const hits = _raycaster.intersectObjects(objects, false);
  return hits[0] ?? null;
}
