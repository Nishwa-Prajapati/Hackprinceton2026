function sequencesMatch(expected, actual) {
  return expected.every((step, index) => step === actual[index]);
}

export function evaluateReaction(reaction, attempt) {
  const { sequence, temperature } = attempt;
  const idealRange = reaction.idealTemperatureRange;
  const orderIsCorrect = sequencesMatch(reaction.defaultSequence, sequence);

  if (!orderIsCorrect) {
    const wrongOrderFailure = reaction.failureModes.find(
      (failureMode) => failureMode.id === "wrong-order"
    );

    return {
      status: "failure",
      headline: wrongOrderFailure?.result ?? "Sequence mismatch",
      details: wrongOrderFailure?.playerMessage ?? "The reagents were mixed in the wrong order.",
      severity: wrongOrderFailure?.severity ?? "medium"
    };
  }

  if (temperature > idealRange.max + 6 || temperature < idealRange.min - 6) {
    const temperatureFailure = reaction.failureModes.find(
      (failureMode) => failureMode.id === "temperature-drift"
    );

    return {
      status: "failure",
      headline: temperatureFailure?.result ?? "Temperature drift detected",
      details:
        temperatureFailure?.playerMessage ??
        "The temperature moved too far from the safe operating band.",
      severity: temperatureFailure?.severity ?? "medium"
    };
  }

  return {
    status: "success",
    headline: `${reaction.name} completed`,
    details: reaction.successMessage,
    severity: "none"
  };
}
