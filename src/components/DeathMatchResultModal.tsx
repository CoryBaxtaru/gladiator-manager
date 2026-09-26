import { useGame } from "../state/GameContext";
import { FightResultCard } from "./FightResultCard";

export function DeathMatchResultModal() {
  const { deathMatchOutcome, clearDeathMatchOutcome } = useGame();
  if (!deathMatchOutcome) return null;
  const isSelf = deathMatchOutcome.mode === "self";

  return (
    <div className="modal-backdrop">
      <div className="modal summary-modal">
        <h2>{isSelf ? "Arranged Match" : "Death Match"}</h2>
        {deathMatchOutcome.declined ? (
          deathMatchOutcome.declinedBy === "player" ? (
            <>
              <p className="empty-note">Your ludus backed down from {deathMatchOutcome.rivalLudusName}'s challenge.</p>
              {deathMatchOutcome.reputationTransferred && (
                <p className="hint">
                  Your ludus lost {Math.abs(deathMatchOutcome.reputationTransferred)} reputation for backing down.
                </p>
              )}
            </>
          ) : (
            <p className="empty-note">{deathMatchOutcome.rivalLudusName} declined the challenge.</p>
          )
        ) : (
          deathMatchOutcome.combat && (
            <>
              <div className="fight-card-grid">
                <FightResultCard result={deathMatchOutcome.combat} />
              </div>
              <p className="hint">
                {deathMatchOutcome.reputationTransferred && deathMatchOutcome.reputationTransferred > 0
                  ? `Your ludus gained ${deathMatchOutcome.reputationTransferred} reputation${isSelf ? "" : ` from ${deathMatchOutcome.rivalLudusName}`}.`
                  : deathMatchOutcome.reputationTransferred
                    ? `Your ludus lost ${Math.abs(deathMatchOutcome.reputationTransferred)} reputation${isSelf ? "" : ` to ${deathMatchOutcome.rivalLudusName}`}.`
                    : null}
              </p>
              {deathMatchOutcome.goldDelta !== undefined && (
                <p className="hint">
                  {deathMatchOutcome.goldDelta >= 0
                    ? `Purse: +${deathMatchOutcome.goldDelta}g.`
                    : `Purse: ${deathMatchOutcome.goldDelta}g.`}
                </p>
              )}
              {deathMatchOutcome.techniqueAnnouncement && <p className="hint">{deathMatchOutcome.techniqueAnnouncement}</p>}
              {deathMatchOutcome.rivalryNotice && <p className="hint">{deathMatchOutcome.rivalryNotice}</p>}
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
