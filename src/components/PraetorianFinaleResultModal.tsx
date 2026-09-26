import { useGame } from "../state/GameContext";
import { FightResultCard } from "./FightResultCard";
import { Badge } from "./Badge";

/**
 * Phase 12 Part L: distinct presentation from an ordinary fight or even a Promotion
 * Fight result -- this is the closest thing the game has to an actual ending.
 */
export function PraetorianFinaleResultModal() {
  const { praetorianFinaleOutcome, clearPraetorianFinaleOutcome } = useGame();
  if (!praetorianFinaleOutcome) return null;
  const { results, won, gladiatorsWon, gladiatorsTotal, bonusGold, bonusReputation, techniqueAnnouncements } = praetorianFinaleOutcome;

  return (
    <div className="modal-backdrop">
      <div className="modal summary-modal">
        <h2>{won ? "The Emperor's Praetorian Guard Falls" : "The Emperor's Praetorian Guard Prevails"}</h2>
        {won && <Badge tone="gold">Victorious -- {gladiatorsWon} of {gladiatorsTotal} clashes won</Badge>}
        {!won && <Badge tone="danger">Defeated -- {gladiatorsWon} of {gladiatorsTotal} clashes won</Badge>}
        <p className="hint">
          {won
            ? `The crowd has never seen anything like it. Your ludus has bested the Emperor's own elite guard, a feat few schools in the empire's history can claim. A bonus purse of ${bonusGold}g and ${bonusReputation} reputation are yours for it.`
            : `A hard-fought occasion, but not enough of your gladiators carried the day against the Emperor's elite. The Guard won't be summoned again for a while -- rebuild, and try again when you're ready.`}
        </p>
        <div className="fight-card-grid">
          {results.map((c) => (
            <FightResultCard key={c.fightId} result={c} />
          ))}
        </div>
        {techniqueAnnouncements.map((text) => (
          <p className="hint" key={text}>
            {text}
          </p>
        ))}
        <button className="btn primary" onClick={clearPraetorianFinaleOutcome}>
          Continue
        </button>
      </div>
    </div>
  );
}
