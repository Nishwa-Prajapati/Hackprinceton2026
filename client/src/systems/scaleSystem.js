export function getScaleLabel(zoomPreset) {
  const labels = {
    room: "Full lab",
    zone: "Single zone",
    bench: "Bench detail"
  };

  return labels[zoomPreset] ?? "Single zone";
}
