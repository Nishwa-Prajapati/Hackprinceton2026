function PhasePanel({ progress, result }) {
  return (
    <section className="panel">
      <h3>Build Roadmap</h3>
      <ul className="phase-list">
        <li>
          <strong>Phase 1</strong>
          Ship the 3D lab shell, Zone B, and one working reaction. Completed runs:{" "}
          {progress.completedReactionIds.length}
        </li>
        <li>
          <strong>Phase 2</strong>
          Add Zones A, C, and D plus more reaction definitions and mistake logic.
        </li>
        <li>
          <strong>Phase 3</strong>
          Layer in zoom-out, scale shifts, and richer narration prompts.
        </li>
        <li>
          <strong>Phase 4</strong>
          Add passport and portfolio views once the core lab loop feels stable.
        </li>
      </ul>
      {result && <p className="badge">Latest status: {result.status}</p>}
    </section>
  );
}

export default PhasePanel;
