export function summarizeMistake(result) {
  if (result.status === "success") {
    return "Clean run. Capture this pattern as the Phase 1 baseline.";
  }

  if (result.severity === "high") {
    return "High-risk mistake. Reset the station before another attempt.";
  }

  return "Recoverable mistake. Adjust the order or temperature and try again.";
}
