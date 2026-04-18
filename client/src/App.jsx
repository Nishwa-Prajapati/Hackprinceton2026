import { useRef, useState } from "react";
import LabScene from "./components/LabScene";

function App() {
  const sceneRef = useRef(null);
  const [focusLabel, setFocusLabel] = useState("Entrance");

  return (
    <main className="app-shell">
      <section className="scene-stage">
        <div className="hud-card">
          <p className="eyebrow">Virtual Chemistry Lab</p>
          <h1>Walk-In Lab Core</h1>
          <p className="hud-copy">
            Scroll to walk the aisle, drag to look around, and click a numbered
            marker to glide into a reaction bench.
          </p>
          <div className="hud-meta">
            <span>Focus: {focusLabel}</span>
            <span>4 interactive benches</span>
            <span>React + Three.js + GSAP</span>
          </div>
        </div>

        <div className="scene-actions">
          <button
            className="secondary-button"
            onClick={() => sceneRef.current?.focusEntrance()}
            type="button"
          >
            Back to Entrance
          </button>
        </div>

        <div className="instruction-bar">
          <span>Scroll: walk forward / back</span>
          <span>Drag: look left / right</span>
          <span>Click marker: focus bench</span>
        </div>

        <LabScene ref={sceneRef} onFocusChange={setFocusLabel} />
      </section>
    </main>
  );
}

export default App;
