function StatusOverlay({ activeZone, result, selectedReaction }) {
  return (
    <div className="status-overlay">
      <div className="status-line">
        <strong>Zone {activeZone}</strong>
        <span className="badge">{selectedReaction?.name ?? "No reaction selected"}</span>
      </div>

      {result ? (
        <div className="status-block">
          <p className={result.status === "success" ? "status-success" : "status-failure"}>
            {result.headline}
          </p>
          <p>{result.details}</p>
          <p>{result.mistakeSummary}</p>
          <p>{result.narration}</p>
        </div>
      ) : (
        <div className="status-block">
          <p>Ready for the first Zone B reaction run.</p>
          <p>Use the panel to test order, temperature, and basic failure logic.</p>
        </div>
      )}
    </div>
  );
}

export default StatusOverlay;
