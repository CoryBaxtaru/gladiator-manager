import { useGame } from "../state/GameContext";
import { REPUTATION_TIER_LABELS } from "../config";
import { FightResultCard } from "./FightResultCard";
import { Badge } from "./Badge";

/** Distinct framing from an ordinary fight result: a promotion win is a real occasion,
 * a loss is a setback to regroup from, not a dead end. */
export function PromotionResultModal() {
  const { promotionOutcome, clearPromotionOutcome } = useGame();
  if (!promotionOutcome) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal summary-modal">
        <h2>{promotionOutcome.won ? "Promoted!" : "Promotion Fight Lost"}</h2>
        {promotionOutcome.won && promotionOutcome.newTier && (
          <Badge tone="gold">Now fighting at {REPUTATION_TIER_LABELS[promotionOutcome.newTier]}</Badge>
        )}
        <div className="fight-card-grid">
          <FightResultCard result={promotionOutcome.combat} />
        </div>
        {promotionOutcome.techniqueAnnouncement && <p className="hint">{promotionOutcome.techniqueAnnouncement}</p>}
        {promotionOutcome.rivalryNotice && <p className="hint">{promotionOutcome.rivalryNotice}</p>}
        <p className="hint">
          {promotionOutcome.won
            ? "The cap is gone, reputation is free to climb again, and this win paid out well above a normal fight day."
            : `A real setback, not a disaster. No new challenge against this champion until day ${promotionOutcome.cooldownUntilDay}, ordinary fighting, training, and recruiting continue in the meantime.`}
        </p>
        <button className="btn primary" onClick={clearPromotionOutcome}>
          Continue
        </button>
      </div>
    </div>
  );
}
