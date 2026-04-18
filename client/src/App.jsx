import { useEffect, useState } from "react";
import LabScene from "./core/LabScene";
import zoneDefinitions from "./zones";
import localReactions from "./data/reactions.json";
import { evaluateReaction } from "./engine/reactionEngine";
import { summarizeMistake } from "./engine/mistakeEngine";
import { buildNarration } from "./systems/narrationSystem";
import { getScaleLabel } from "./systems/scaleSystem";
import { zoomPresets } from "./systems/zoomSystem";
import ControlPanel from "./ui/ControlPanel";
import StatusOverlay from "./ui/StatusOverlay";
import PhasePanel from "./ui/PhasePanel";

const PHASE = 1;
const STORAGE_KEY = "lab-zero-progress";

function App() {
  const [reactions, setReactions] = useState(localReactions.reactions);
  const [activeZone, setActiveZone] = useState("B");
  const [selectedReactionId, setSelectedReactionId] = useState(
    localReactions.reactions[0]?.id ?? ""
  );
  const [temperature, setTemperature] = useState(24);
  const [sequence, setSequence] = useState(["water", "acid", "base"]);
  const [zoomPreset, setZoomPreset] = useState("zone");
  const [narrationEnabled, setNarrationEnabled] = useState(true);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { completedReactionIds: [] };
  });

  useEffect(() => {
    async function loadReactions() {
      try {
        const response = await fetch("/api/reactions");
        if (!response.ok) {
          throw new Error("Failed to load reactions");
        }

        const payload = await response.json();
        const nextReactions = payload.reactions ?? [];
        if (nextReactions.length > 0) {
          setReactions(nextReactions);
          setSelectedReactionId(nextReactions[0].id);
        }
      } catch (error) {
        console.warn("Using local reactions fallback", error);
      }
    }

    loadReactions();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    const nextReaction = reactions.find((reaction) => reaction.zone === activeZone);
    if (nextReaction) {
      setSelectedReactionId(nextReaction.id);
      setSequence(nextReaction.defaultSequence);
      setTemperature(nextReaction.idealTemperatureRange.min + 4);
    } else {
      setSelectedReactionId("");
      setResult(null);
    }
  }, [activeZone, reactions]);

  const availableReactions = reactions.filter((reaction) => reaction.zone === activeZone);
  const selectedReaction =
    availableReactions.find((reaction) => reaction.id === selectedReactionId) ??
    availableReactions[0] ??
    null;

  useEffect(() => {
    if (!selectedReaction) {
      return;
    }

    setSequence(selectedReaction.defaultSequence);
    setTemperature(selectedReaction.idealTemperatureRange.min + 4);
  }, [selectedReaction]);

  function handleSequenceChange(stepIndex, value) {
    setSequence((current) => {
      const next = [...current];
      next[stepIndex] = value;
      return next;
    });
  }

  function handleAttempt() {
    if (!selectedReaction) {
      return;
    }

    const engineResult = evaluateReaction(selectedReaction, {
      sequence,
      temperature
    });
    const mistakeSummary = summarizeMistake(engineResult);
    const narration = buildNarration({
      activeZone,
      narrationEnabled,
      reaction: selectedReaction,
      result: engineResult
    });

    const finalResult = {
      ...engineResult,
      mistakeSummary,
      narration
    };

    setResult(finalResult);

    if (finalResult.status === "success") {
      setProgress((current) => ({
        completedReactionIds: Array.from(
          new Set([...current.completedReactionIds, selectedReaction.id])
        )
      }));
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Phase {PHASE} foundation</p>
          <h1>Lab Zero</h1>
          <p className="hero-copy">
            A simple 3D chemistry lab MVP with one playable Zone B reaction and room
            to expand through the next hackathon phases.
          </p>
        </div>
        <div className="hero-badges">
          <span>Scale: {getScaleLabel(zoomPreset)}</span>
          <span>Completed: {progress.completedReactionIds.length}</span>
          <span>Phase target: Zone B</span>
        </div>
      </header>

      <main className="main-grid">
        <section className="scene-panel">
          <LabScene activeZone={activeZone} zoomPreset={zoomPreset} zones={zoneDefinitions} />
          <StatusOverlay
            activeZone={activeZone}
            result={result}
            selectedReaction={selectedReaction}
          />
        </section>

        <aside className="sidebar">
          <ControlPanel
            activeZone={activeZone}
            availableZones={zoneDefinitions}
            onAttempt={handleAttempt}
            onSequenceChange={handleSequenceChange}
            reactions={availableReactions}
            selectedReaction={selectedReaction}
            selectedReactionId={selectedReactionId}
            sequence={sequence}
            setActiveZone={setActiveZone}
            setNarrationEnabled={setNarrationEnabled}
            setSelectedReactionId={setSelectedReactionId}
            setTemperature={setTemperature}
            setZoomPreset={setZoomPreset}
            temperature={temperature}
            zoomPreset={zoomPreset}
            zoomPresets={zoomPresets}
            narrationEnabled={narrationEnabled}
          />
          <PhasePanel progress={progress} result={result} />
        </aside>
      </main>
    </div>
  );
}

export default App;
