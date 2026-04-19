import { useState } from "react";

function InfoPanel({ focusLabel }) {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div className={`hud-card info-panel${isMinimized ? " is-minimized" : ""}`}>
      <div className="info-panel-header">
        <p className="eyebrow">Virtual Chemistry Lab</p>
        <button
          className="info-panel-toggle"
          onClick={() => setIsMinimized((current) => !current)}
          type="button"
        >
          {isMinimized ? "Open" : "Minimize"}
        </button>
      </div>

      <h1>Walk-In Lab Core</h1>

      {!isMinimized ? (
        <>
          <p className="hud-copy">
            Scroll to walk the aisle, drag to look around, and click a numbered
            marker to glide into a reaction bench.
          </p>
          <div className="hud-meta">
            <span>Focus: {focusLabel}</span>
            <span>4 interactive benches</span>
            <span>React + Three.js + GSAP</span>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default InfoPanel;
