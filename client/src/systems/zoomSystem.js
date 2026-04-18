export const zoomPresets = [
  { id: "room", label: "Room view" },
  { id: "zone", label: "Zone focus" },
  { id: "bench", label: "Bench close-up" }
];

export function getCameraPosition(zoomPreset) {
  const positions = {
    room: { x: 0, y: 15, z: 18 },
    zone: { x: 8, y: 7, z: 10 },
    bench: { x: 4.5, y: 4.8, z: 5.6 }
  };

  return positions[zoomPreset] ?? positions.zone;
}
