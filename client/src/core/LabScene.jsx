import { useEffect, useRef } from "react";
import * as THREE from "three";
import { sceneConfig } from "./sceneConfig";
import { getCameraPosition } from "../systems/zoomSystem";

function LabScene({ activeZone, zoomPreset, zones }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) {
      return undefined;
    }

    const width = mountNode.clientWidth;
    const height = mountNode.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07111c);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    const nextCameraPosition = getCameraPosition(zoomPreset);
    camera.position.set(
      nextCameraPosition.x,
      nextCameraPosition.y,
      nextCameraPosition.z
    );
    camera.lookAt(0, 1.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mountNode.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xb9d9ff, 1.5);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(sceneConfig.roomSize.width, sceneConfig.roomSize.depth),
      new THREE.MeshStandardMaterial({ color: 0x102235, metalness: 0.1, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const roomFrame = new THREE.Mesh(
      new THREE.BoxGeometry(
        sceneConfig.roomSize.width,
        sceneConfig.roomSize.height,
        sceneConfig.roomSize.depth
      ),
      new THREE.MeshBasicMaterial({
        color: 0x17304e,
        wireframe: true,
        transparent: true,
        opacity: 0.3
      })
    );
    roomFrame.position.y = sceneConfig.roomSize.height / 2 - 0.1;
    scene.add(roomFrame);

    zones.forEach((zone) => {
      const zoneMeta = sceneConfig.zonePositions[zone.id];
      const isActive = zone.id === activeZone;

      const station = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 1.2, 2.8),
        new THREE.MeshStandardMaterial({
          color: zoneMeta.color,
          emissive: isActive ? zoneMeta.color : 0x000000,
          emissiveIntensity: isActive ? 0.28 : 0,
          metalness: 0.2,
          roughness: 0.45
        })
      );
      station.position.set(zoneMeta.x, 0.6, zoneMeta.z);
      scene.add(station);
    });

    const reactor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 1.6, 24),
      new THREE.MeshStandardMaterial({
        color: 0xc7dcff,
        transparent: true,
        opacity: 0.7,
        roughness: 0.2,
        metalness: 0.1
      })
    );
    reactor.position.set(0, 1.15, 0);
    scene.add(reactor);

    const coreGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 32, 32),
      new THREE.MeshStandardMaterial({
        color: activeZone === "B" ? 0x60a5fa : 0xf59e0b,
        emissive: activeZone === "B" ? 0x60a5fa : 0xf59e0b,
        emissiveIntensity: 1.2
      })
    );
    coreGlow.position.set(0, 1.1, 0);
    scene.add(coreGlow);

    let animationFrame;

    function animate() {
      reactor.rotation.y += 0.008;
      coreGlow.rotation.y -= 0.01;
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    }

    function handleResize() {
      const nextWidth = mountNode.clientWidth;
      const nextHeight = mountNode.clientHeight;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    }

    window.addEventListener("resize", handleResize);
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(animationFrame);
      renderer.dispose();
      mountNode.removeChild(renderer.domElement);
    };
  }, [activeZone, zoomPreset, zones]);

  return <div className="scene-canvas" ref={mountRef} />;
}

export default LabScene;
