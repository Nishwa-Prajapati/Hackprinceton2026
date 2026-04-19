const ANIMATION_EFFECTS = [
  { pattern: /(bubble|fizz|foam|gas)/i, effect: 'bubbles' },
  { pattern: /(smoke|mist|fume|ash)/i, effect: 'smoke' },
  { pattern: /(flash|flame|spark|glow|ignite|burn)/i, effect: 'flash' },
  { pattern: /(heat|shimmer|warm)/i, effect: 'heat' },
  { pattern: /(deposit|fade|color|precipitate|settling|dissolving|growing|stays)/i, effect: 'pulse' }
];

export function resolveBenchEffect(animationName) {
  return ANIMATION_EFFECTS.find(entry => entry.pattern.test(animationName))?.effect ?? 'pulse';
}

export async function playReactionAnimations(engine, benchId, animationNames = []) {
  if (!engine || !benchId) return;

  const effects = [...new Set(animationNames.map(resolveBenchEffect))];
  if (effects.length === 0) {
    await engine.playBenchEffects(benchId, ['pulse']);
    return;
  }

  await engine.playBenchEffects(benchId, effects);
}
