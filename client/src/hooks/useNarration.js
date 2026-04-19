export function buildNarration({ activeZone, narrationEnabled, reaction, result }) {
  if (!narrationEnabled || !reaction) {
    return "Narration muted.";
  }

  if (result.status === "success") {
    return `Zone ${activeZone} stabilized. ${reaction.name} is ready for demo playback.`;
  }

  return `Zone ${activeZone} warning. ${result.headline}. Review the setup before continuing.`;
}
