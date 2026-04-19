function ControlPanel({
  activeZone,
  availableZones,
  onAttempt,
  onSequenceChange,
  reactions,
  selectedReaction,
  selectedReactionId,
  sequence,
  setActiveZone,
  setNarrationEnabled,
  setSelectedReactionId,
  setTemperature,
  setZoomPreset,
  temperature,
  zoomPreset,
  zoomPresets,
  narrationEnabled
}) {
  const chemicals = selectedReaction?.availableChemicals ?? [];
  const hasReaction = reactions.length > 0 && selectedReaction;

  return (
    <section className="panel">
      <h2>Control Panel</h2>
      <div className="control-grid">
        <label>
          Active zone
          <select value={activeZone} onChange={(event) => setActiveZone(event.target.value)}>
            {availableZones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.label} · {zone.status}
              </option>
            ))}
          </select>
        </label>

        <label>
          Reaction
          <select
            value={selectedReactionId}
            onChange={(event) => setSelectedReactionId(event.target.value)}
            disabled={!hasReaction}
          >
            {hasReaction ? (
              reactions.map((reaction) => (
                <option key={reaction.id} value={reaction.id}>
                  {reaction.name}
                </option>
              ))
            ) : (
              <option value="">No reaction in this zone yet</option>
            )}
          </select>
        </label>

        <div>
          <span>Mix order</span>
          <div className="inline-grid">
            {sequence.map((step, index) => (
              <label key={`${selectedReactionId}-${index}`}>
                Step {index + 1}
                <select
                  value={step}
                  onChange={(event) => onSequenceChange(index, event.target.value)}
                  disabled={!hasReaction}
                >
                  {chemicals.map((chemical) => (
                    <option key={chemical} value={chemical}>
                      {chemical}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>

        <label>
          Temperature ({temperature}°C)
          <input
            type="range"
            min="5"
            max="60"
            value={temperature}
            onChange={(event) => setTemperature(Number(event.target.value))}
            disabled={!hasReaction}
          />
        </label>

        <label>
          Zoom
          <select value={zoomPreset} onChange={(event) => setZoomPreset(event.target.value)}>
            {zoomPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Narration
          <select
            value={narrationEnabled ? "on" : "off"}
            onChange={(event) => setNarrationEnabled(event.target.value === "on")}
          >
            <option value="on">On</option>
            <option value="off">Off</option>
          </select>
        </label>

        <button
          className="primary-button"
          type="button"
          onClick={onAttempt}
          disabled={!hasReaction}
        >
          Run reaction
        </button>

        {!hasReaction && (
          <p>This zone is scaffolded for a later phase. Zone B is the current MVP path.</p>
        )}
      </div>
    </section>
  );
}

export default ControlPanel;
