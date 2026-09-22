import { useGame } from "../state/GameContext";
import { FightResultCard } from "./FightResultCard";

export function DeathMatchResultModal() {
  const { deathMatchOutcome, clearDeathMatchOutcome } = useGame();
  if (!deathMatchOutcome) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal summary-modal">
        <h2>Death Match</h2>
        {deathMatchOutcome.declined ? (
          <p className="empty-note">{deathMatchOutcome.rivalLudusName} declined the challenge.</p>
        ) : (
          deathMatchOutcome.combat && (
            <>
              <div className="fight-card-grid">
                <FightResultCard result={deathMatchOutcome.combat} />
              </div>
              <p className="hint">
                {deathMatchOutcome.reputationTransferred && deathMatchOutcome.reputationTransferred > 0
                  ? `Your ludus gained ${deathMatchOutcome.reputationTransferred} reputation from ${deathMatchOutcome.rivalLudusName}.`
                  : deathMatchOutcome.reputationTransferred
                    ? `Your ludus lost ${Math.abs(deathMatchOutcome.reputationTransferred)} reputation to ${deathMatchOutcome.rivalLudusName}.`
                    : null}
              </p>
            </>
          )
        )}
        <button className="btn primary" onClick={clearDeathMatchOutcome}>
          Continue
        </button>
      </div>
    </div>
  );
}
