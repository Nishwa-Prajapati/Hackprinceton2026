import { useRef, useState } from "react";
import EntryOverlay from "./components/EntryOverlay";
import InfoPanel from "./components/InfoPanel";
import LabScene from "./components/LabScene";

function App() {
  const sceneRef = useRef(null);
  const [focusLabel, setFocusLabel] = useState("Entrance");
  const [hasEntered, setHasEntered] = useState(false);
  const [isDeskMode, setIsDeskMode] = useState(false);

  return (
    <main className="app-shell">
      <section className="scene-stage">
        {!hasEntered ? (
          <EntryOverlay onEnter={() => setHasEntered(true)} />
        ) : (
          <>
            <InfoPanel focusLabel={focusLabel} />

            <div className="scene-actions">
              <button
                className="secondary-button"
                onClick={() => sceneRef.current?.focusEntrance()}
                type="button"
              >
                Back to Entrance
              </button>
              {isDeskMode ? (
                <button
                  className="secondary-button"
                  onClick={() => sceneRef.current?.exitDesk()}
                  type="button"
                >
                  Exit Desk
                </button>
              ) : null}
            </div>

            <div className="instruction-bar">
              <span>Scroll: walk forward / back</span>
              <span>Drag: look left / right</span>
              <span>Click marker: focus bench</span>
            </div>

            <LabScene
              ref={sceneRef}
              onDeskModeChange={setIsDeskMode}
              onFocusChange={setFocusLabel}
            />
          </>
        )}
      </section>
    </main>
  );
}

export default App;
