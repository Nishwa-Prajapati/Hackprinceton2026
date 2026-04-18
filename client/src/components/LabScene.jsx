import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef
} from "react";
import * as THREE from "three";
import { CameraController } from "./CameraController";
import { createBench } from "./Bench";
import { createMarker } from "./Marker";
import { animateCameraTo, animateMarkerClick, stopAnimation } from "../utils/animations";
import { intersectInteractiveObjects } from "../utils/raycaster";

const ROOM = {
  width: 18,
  depth: 30,
  height: 8
};

const ENTRANCE_ZONE = {
  label: "Entrance",
  position: new THREE.Vector3(0, 1.66, 12.6),
  lookAt: new THREE.Vector3(0, 1.32, 5.4)
};

const BENCH_DEFINITIONS = [
  {
    id: "zone1",
    title: "Acid-Base Bench",
    accent: 0x43b7ff,
    position: new THREE.Vector3(-3.15, 0, 7.2),
    cameraOffsetX: 0.55
  },
  {
    id: "zone2",
    title: "Combustion Bench",
    accent: 0xff8f3d,
    position: new THREE.Vector3(3.15, 0, 1.35),
    cameraOffsetX: -0.55
  },
  {
    id: "zone3",
    title: "Synthesis Bench",
    accent: 0x6bd38a,
    position: new THREE.Vector3(-3.15, 0, -4.7),
    cameraOffsetX: 0.55
  },
  {
    id: "zone4",
    title: "Electrochemistry Bench",
    accent: 0xe5b2ff,
    position: new THREE.Vector3(3.15, 0, -10.75),
    cameraOffsetX: -0.55
  }
];

const DESK_CAMERA_OFFSET = new THREE.Vector3(0, 1.38, 1.28);
const DESK_LOOK_OFFSET = new THREE.Vector3(0, 1.08, 0);

function createRoom(scene) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    new THREE.MeshStandardMaterial({
      color: 0xd9dfe6,
      roughness: 0.9,
      metalness: 0.03
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.width, ROOM.height, ROOM.depth),
    new THREE.MeshStandardMaterial({
      color: 0xf5f7fa,
      side: THREE.BackSide,
      roughness: 0.95
    })
  );
  walls.position.y = ROOM.height / 2 - 0.01;
  scene.add(walls);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    new THREE.MeshStandardMaterial({
      color: 0xfbfcfe,
      roughness: 0.92
    })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM.height - 0.02;
  scene.add(ceiling);

  const rearAccent = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width * 0.65, 2.2),
    new THREE.MeshStandardMaterial({
      color: 0xe7eef7,
      emissive: 0xa3c8ef,
      emissiveIntensity: 0.08,
      roughness: 0.55
    })
  );
  rearAccent.position.set(0, 3.6, -ROOM.depth / 2 + 0.12);
  scene.add(rearAccent);

  [-4.8, 0, 4.8].forEach((x) => {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.002, ROOM.depth * 0.78),
      new THREE.MeshStandardMaterial({
        color: 0xbfc9d8,
        emissive: 0x88b9f0,
        emissiveIntensity: 0.04,
        roughness: 0.24
      })
    );
    stripe.position.set(x, 0.0015, -1.2);
    stripe.receiveShadow = true;
    scene.add(stripe);
  });
}

function createCeilingLight(scene, position) {
  const fixture = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.12, 0.72),
    new THREE.MeshStandardMaterial({
      color: 0xfdfefe,
      emissive: 0xffffff,
      emissiveIntensity: 0.48,
      roughness: 0.35
    })
  );
  fixture.position.copy(position);
  scene.add(fixture);

  const light = new THREE.PointLight(0xf6fbff, 10, 15, 2);
  light.position.set(position.x, position.y - 0.45, position.z);
  scene.add(light);
}

function createEnvironment(scene) {
  scene.background = new THREE.Color(0xe8eef5);
  scene.fog = new THREE.Fog(0xe8eef5, 11, 32);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.7);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 1.35);
  sunLight.position.set(-6, 12, 9);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -16;
  sunLight.shadow.camera.right = 16;
  sunLight.shadow.camera.top = 16;
  sunLight.shadow.camera.bottom = -16;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 30;
  scene.add(sunLight);

  [-9.2, -2.8, 3.6, 10].forEach((z) => {
    createCeilingLight(scene, new THREE.Vector3(0, ROOM.height - 0.28, z));
  });
}

function disposeScene(scene) {
  scene.traverse((object) => {
    if (object.geometry) {
      object.geometry.dispose();
    }

    if (object.material) {
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value && typeof value.dispose === "function") {
            value.dispose();
          }
        });
        material.dispose();
      });
    }
  });
}

const LabScene = forwardRef(function LabScene(
  { onDeskModeChange, onFocusChange },
  ref
) {
  const mountRef = useRef(null);
  const focusEntranceRef = useRef(() => {});
  const exitDeskRef = useRef(() => {});

  useImperativeHandle(
    ref,
    () => ({
      focusEntrance() {
        focusEntranceRef.current();
      },
      exitDesk() {
        exitDeskRef.current();
      }
    }),
    []
  );

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) {
      return undefined;
    }

    const scene = new THREE.Scene();
    createRoom(scene);
    createEnvironment(scene);

    const camera = new THREE.PerspectiveCamera(
      58,
      mountNode.clientWidth / mountNode.clientHeight,
      0.1,
      100
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.touchAction = "none";
    mountNode.appendChild(renderer.domElement);

    const controller = new CameraController(camera, {
      position: ENTRANCE_ZONE.position.clone(),
      lookAt: ENTRANCE_ZONE.lookAt.clone(),
      bounds: {
        minX: -6.5,
        maxX: 6.5,
        minZ: -13.4,
        maxZ: 13.4
      }
    });

    const interactiveObjects = [];
    const benchMap = new Map();
    const markerMap = new Map();
    const zones = new Map([["entrance", ENTRANCE_ZONE]]);
    const pointerState = {
      moved: false,
      movedDistance: 0
    };
    const walkPose = {
      position: ENTRANCE_ZONE.position.clone(),
      lookAt: ENTRANCE_ZONE.lookAt.clone(),
      label: ENTRANCE_ZONE.label
    };

    let hoveredZoneId = null;
    let activeZoneId = null;
    let isDeskMode = false;
    let animationFrame = 0;
    let activeAnimation = null;

    BENCH_DEFINITIONS.forEach((benchDefinition, index) => {
      const bench = createBench(benchDefinition);
      scene.add(bench.group);
      benchMap.set(benchDefinition.id, bench);
      zones.set(benchDefinition.id, bench.focusZone);

      const marker = createMarker({
        id: benchDefinition.id,
        label: String(index + 1),
        color: benchDefinition.accent,
        position: bench.markerPosition,
        phase: index * 0.8
      });
      marker.group.renderOrder = 10;
      scene.add(marker.group);

      marker.interactiveObject.userData.zoneId = benchDefinition.id;
      interactiveObjects.push(marker.interactiveObject);
      markerMap.set(benchDefinition.id, marker);
    });

    function syncBenchVisuals() {
      benchMap.forEach((bench, zoneId) => {
        bench.setHovered(zoneId === hoveredZoneId);
        bench.setActive(zoneId === activeZoneId);
      });

      markerMap.forEach((marker, zoneId) => {
        marker.setHovered(zoneId === hoveredZoneId);
        marker.setActive(zoneId === activeZoneId);
      });

      renderer.domElement.style.cursor = hoveredZoneId ? "pointer" : "grab";
    }

    function setDeskMode(nextDeskMode) {
      isDeskMode = nextDeskMode;
      onDeskModeChange?.(nextDeskMode);
    }

    function updateWalkPose() {
      walkPose.position.copy(controller.targetPosition);
      walkPose.lookAt.copy(controller.targetLookAt);
      walkPose.label = activeZoneId ? zones.get(activeZoneId)?.label ?? "Walk Mode" : "Entrance";
    }

    function getDeskZone(zoneId) {
      const bench = benchMap.get(zoneId);
      const baseZone = zones.get(zoneId);

      if (!bench || !baseZone) {
        return null;
      }

      return {
        label: baseZone.label,
        position: bench.group.position.clone().add(DESK_CAMERA_OFFSET),
        lookAt: bench.group.position.clone().add(DESK_LOOK_OFFSET)
      };
    }

    function exitDeskMode() {
      if (!isDeskMode) {
        return;
      }

      stopAnimation(activeAnimation);
      controller.endDrag();
      setDeskMode(false);
      onFocusChange?.(walkPose.label);

      activeAnimation = animateCameraTo(controller, walkPose, {
        duration: 1.15,
        onComplete: () => {
          controller.syncAnglesFromLookTarget();
          activeAnimation = null;
        }
      });
    }

    function goToZone(zoneId) {
      const zone = zones.get(zoneId);
      if (!zone) {
        return;
      }

      stopAnimation(activeAnimation);
      controller.endDrag();

      if (zoneId !== "entrance" && !isDeskMode) {
        updateWalkPose();
      }

      activeZoneId = zoneId === "entrance" ? null : zoneId;
      syncBenchVisuals();

      if (zoneId !== "entrance") {
        const clickedMarker = markerMap.get(zoneId);
        if (clickedMarker) {
          animateMarkerClick(clickedMarker.group);
        }
      }

      const targetZone = zoneId === "entrance" ? zone : getDeskZone(zoneId) ?? zone;
      const nextDeskMode = zoneId !== "entrance";
      setDeskMode(nextDeskMode);
      onFocusChange?.(targetZone.label);

      activeAnimation = animateCameraTo(controller, targetZone, {
        duration: 1.35,
        onComplete: () => {
          controller.syncAnglesFromLookTarget();
          activeAnimation = null;
        }
      });
    }

    focusEntranceRef.current = () => {
      setDeskMode(false);
      goToZone("entrance");
    };
    exitDeskRef.current = () => {
      exitDeskMode();
    };
    onFocusChange?.(ENTRANCE_ZONE.label);
    onDeskModeChange?.(false);

    function updateHoverFromEvent(event) {
      const hit = intersectInteractiveObjects(
        event,
        renderer.domElement,
        camera,
        interactiveObjects
      );
      const nextZoneId = hit?.object?.userData?.zoneId ?? null;

      if (nextZoneId !== hoveredZoneId) {
        hoveredZoneId = nextZoneId;
        syncBenchVisuals();
      }
    }

    function handlePointerDown(event) {
      renderer.domElement.setPointerCapture(event.pointerId);
      if (!isDeskMode) {
        controller.beginDrag(event.clientX, event.clientY);
        renderer.domElement.style.cursor = "grabbing";
      } else {
        renderer.domElement.style.cursor = hoveredZoneId ? "pointer" : "default";
      }
      pointerState.moved = false;
      pointerState.movedDistance = 0;
    }

    function handlePointerMove(event) {
      if (!isDeskMode) {
        pointerState.movedDistance += controller.drag(event.clientX, event.clientY);
        if (pointerState.movedDistance > 8) {
          pointerState.moved = true;
        }
      }

      updateHoverFromEvent(event);
    }

    function handlePointerUp(event) {
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }

      controller.endDrag();
      updateHoverFromEvent(event);

      if (!pointerState.moved && hoveredZoneId) {
        goToZone(hoveredZoneId);
      }

      pointerState.moved = false;
      pointerState.movedDistance = 0;
      renderer.domElement.style.cursor = hoveredZoneId ? "pointer" : "grab";
    }

    function handlePointerLeave() {
      controller.endDrag();
      hoveredZoneId = null;
      syncBenchVisuals();
    }

    function handleWheel(event) {
      event.preventDefault();
      if (!isDeskMode) {
        controller.handleWheel(event.deltaY);
      }
    }

    function handleResize() {
      const width = mountNode.clientWidth;
      const height = mountNode.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
    renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("resize", handleResize);

    const clock = new THREE.Clock();

    // Manual movement uses damped interpolation, while camera jumps between benches
    // use GSAP-driven target poses for deterministic 1.35s focus moves.
    function renderFrame() {
      animationFrame = window.requestAnimationFrame(renderFrame);
      const delta = clock.getDelta();
      const elapsedTime = clock.elapsedTime;

      controller.update(delta);
      markerMap.forEach((marker) => marker.update(elapsedTime));
      renderer.render(scene, camera);
    }

    syncBenchVisuals();
    renderFrame();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      stopAnimation(activeAnimation);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.removeEventListener("wheel", handleWheel);

      disposeScene(scene);
      renderer.dispose();

      if (mountNode.contains(renderer.domElement)) {
        mountNode.removeChild(renderer.domElement);
      }
    };
  }, [onDeskModeChange, onFocusChange]);

  return <div className="scene-canvas" ref={mountRef} />;
});

export default LabScene;
