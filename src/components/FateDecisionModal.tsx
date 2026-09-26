import { useGame } from "../state/GameContext";
import { sponsorSurvivalCost } from "../engine/combat";
import { GladiatorPortrait } from "./GladiatorPortrait";

/**
 * Phase 12 Part A: a real, costed choice instead of a silent death roll. Shown ahead
 * of the day's summary whenever a gladiator was held in limbo by an ordinary (non-
 * death-match) defeat that would otherwise have killed him -- distinct from the
 * sponsor-decides mercy system considered and cut earlier in this project, which took
 * the decision away from the player entirely.
 */
export function FateDecisionModal() {
  const { state, resolveFateDecision } = useGame();
  const gladiator = state.gladiators.find((g) => g.status === "active" && g.awaitingFateDecision);
  if (!gladiator) return null;

  const cost = sponsorSurvivalCost(gladiator, state);
  const canAfford = state.gold >= cost;

  return (
    <div className="modal-backdrop">
      <div className="modal confirm-modal">
        <h3>{gladiator.name} is dying</h3>
        <div className="matchup-preview-side">
          <GladiatorPortrait name={gladiator.name} origin={gladiator.origin} condition="gravely_injured" size={96} variant="full" />
        </div>
        <p>
          His wounds are mortal. Sponsoring a physician's full attention will save him, at a real cost scaled to
          what he's worth -- or you can let him die, and the wager stays real either way.
        </p>
        <div className="confirm-actions">
          <button className="btn danger-outline" onClick={() => resolveFateDecision(gladiator.id, false)}>
            Let Him Die
          </button>
          <button
            className="btn primary"
            disabled={!canAfford}
            title={canAfford ? undefined : "Not enough gold to sponsor his survival."}
            onClick={() => resolveFateDecision(gladiator.id, true)}
          >
            Sponsor His Survival ({cost}g)
          </button>
        </div>
      </div>
    </div>
  );
}
