function EntryOverlay({ onEnter }) {
  return (
    <div className="entry-overlay">
      <div className="entry-card">
        <p className="entry-eyebrow">Virtual Chemistry Lab</p>
        <h1>Welcome to LabZero</h1>
        <button className="entry-button" onClick={onEnter} type="button">
          Enter Lab
        </button>
      </div>
    </div>
  );
}

export default EntryOverlay;
