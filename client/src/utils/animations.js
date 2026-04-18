import { gsap } from "gsap";

export function animateCameraTo(controller, zone, options = {}) {
  const duration = options.duration ?? 1.35;

  controller.isAnimating = true;

  return gsap.timeline({
    defaults: {
      duration,
      ease: options.ease ?? "power2.out"
    },
    onComplete: () => {
      controller.isAnimating = false;
      options.onComplete?.();
    }
  })
    .to(
      controller.targetPosition,
      {
        x: zone.position.x,
        y: zone.position.y,
        z: zone.position.z
      },
      0
    )
    .to(
      controller.targetLookAt,
      {
        x: zone.lookAt.x,
        y: zone.lookAt.y,
        z: zone.lookAt.z
      },
      0
    );
}

export function animateMarkerClick(group) {
  return gsap.fromTo(
    group.scale,
    {
      x: group.scale.x,
      y: group.scale.y,
      z: group.scale.z
    },
    {
      x: group.scale.x * 1.18,
      y: group.scale.y * 1.18,
      z: group.scale.z * 1.18,
      duration: 0.16,
      repeat: 1,
      yoyo: true,
      ease: "power2.out"
    }
  );
}

export function stopAnimation(animation) {
  animation?.kill();
}
