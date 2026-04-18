import gsap from 'gsap';

export const CABINET_NAMES = {
  A: 'Cabinet A — Reactive Metals',
  B: 'Cabinet B — Solutions & Salts',
  C: 'Cabinet C — Equipment',
  D: 'Cabinet D — Glassware',
};

// States: CLOSED → OPENING → OPEN → CLOSING → CLOSED
export class Cabinet {
  constructor({ id, group, doorLeftPivot, doorRightPivot }) {
    this.id            = id;
    this.name          = CABINET_NAMES[id] ?? `Cabinet ${id}`;
    this.group         = group;
    this.doorLeftPivot  = doorLeftPivot;
    this.doorRightPivot = doorRightPivot;
    this.state         = 'CLOSED';
  }

  open() {
    if (this.state !== 'CLOSED') return;
    this.state = 'OPENING';

    // Left door swings left (−115°)
    gsap.to(this.doorLeftPivot.rotation, {
      y: -Math.PI * (115 / 180),
      duration: 0.52,
      ease: 'power2.out',
    });

    // Right door swings right (+115°)
    gsap.to(this.doorRightPivot.rotation, {
      y: Math.PI * (115 / 180),
      duration: 0.52,
      ease: 'power2.out',
      onComplete: () => { this.state = 'OPEN'; },
    });
  }

  close(onComplete) {
    if (this.state !== 'OPEN' && this.state !== 'OPENING') return;
    this.state = 'CLOSING';

    gsap.to(this.doorLeftPivot.rotation, {
      y: 0,
      duration: 0.42,
      ease: 'power2.inOut',
    });

    gsap.to(this.doorRightPivot.rotation, {
      y: 0,
      duration: 0.42,
      ease: 'power2.inOut',
      onComplete: () => {
        this.state = 'CLOSED';
        onComplete?.();
      },
    });
  }

  get isOpen() {
    return this.state === 'OPEN' || this.state === 'OPENING';
  }
}
