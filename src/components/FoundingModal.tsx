import { useState } from "react";
import { useGame } from "../state/GameContext";
import { generateLudusName, generateRomanCitizenName } from "../engine/names";

/**
 * Phase 12 Part N: on a genuine first launch there was previously no way to pick your
 * own name at all -- both the founder and the ludus were silently auto-generated.
 * Shown once, blocking, before the player ever touches the game proper; pre-filled
 * with generated suggestions but fully editable.
 */
export function FoundingModal() {
  const { completeFounding } = useGame();
  const [founderName, setFounderName] = useState(() => generateRomanCitizenName({ freedman: true }));
  const [ludusName, setLudusName] = useState(() => generateLudusName());

  return (
    <div className="modal-backdrop">
      <div className="modal confirm-modal">
        <h3>Found Your Ludus</h3>
        <p className="hint">Name yourself and your school before you begin. Both are pre-filled -- edit either, or leave them as they are.</p>

        <label className="field-label" htmlFor="founder-name-input">Your name (the lanista)</label>
        <input
          id="founder-name-input"
          className="text-input"
          type="text"
          value={founderName}
          maxLength={60}
          onChange={(e) => setFounderName(e.target.value)}
          autoFocus
        />

        <label className="field-label" htmlFor="founding-ludus-name-input">Ludus name</label>
        <input
          id="founding-ludus-name-input"
          className="text-input"
          type="text"
          value={ludusName}
          maxLength={60}
          onChange={(e) => setLudusName(e.target.value)}
        />

        <div className="confirm-actions">
          <button
            className="btn primary"
            disabled={founderName.trim().length === 0 || ludusName.trim().length === 0}
            onClick={() => completeFounding(founderName.trim(), ludusName.trim())}
          >
            Begin
          </button>
        </div>
      </div>
    </div>
  );
}
