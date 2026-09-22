import { useState } from "react";
import { useGame } from "../state/GameContext";
import { previewOpponent } from "../engine/deathMatch";
import { estimateWinChance } from "../engine/combat";
import { currentAbilityStars, currentAbilityOf } from "../engine/rating";
import { moodLabel } from "../engine/mood";
import type { FightMatchup } from "../types";
import { GladiatorHoverCard, hoverDataFromGladiator, hoverDataFromRival } from "./GladiatorHoverCard";
import { WinChanceBadge } from "./WinChanceBadge";
import { StarRating } from "./StarRating";

export function IncomingChallengeModal() {
  const { state, respondToChallenge } = useGame();
  const [picking, setPicking] = useState(false);
  const [previewGladiatorId, setPreviewGladiatorId] = useState<string | null>(null);

  const challenge = state.pendingDeathMatchChallenge;
  if (!challenge) return null;

  const eligibleGladiators = state.gladiators.filter((g) => g.status === "active" && g.injuryDaysRemaining === 0);
  const previewGladiator = eligibleGladiators.find((g) => g.id === previewGladiatorId) ?? null;
  const opponent = previewGladiator ? previewOpponent(state, challenge.rivalLudusId, previewGladiator.id) : null;

  let winEstimate = null;
  if (previewGladiator && opponent) {
    const rivalLudus = state.rivalLudi.find((l) => l.id === challenge.rivalLudusId);
    const matchup: FightMatchup = {
      id: "preview",
      gladiatorId: previewGladiator.id,
      tier: rivalLudus?.tier ?? "local",
      opponentName: opponent.name,
      opponentPowerLevel: opponent.currentAbility,
      opponentStats: opponent.stats,
      rivalLudusName: challenge.rivalLudusName,
    };
    winEstimate = estimateWinChance(previewGladiator, matchup, state, state.currentDay);
  }

  if (!picking) {
    return (
      <div className="modal-backdrop">
        <div className="modal fight-day-modal">
          <h2>A Death Match Challenge</h2>
          <p className="hint deathmatch-warning">
            {challenge.rivalLudusName} has challenged your ludus to a death match. Accepting means one of your
            gladiators fights to the death. Declining costs nothing but pride.
          </p>
          <div className="confirm-actions">
            <button className="btn" onClick={() => respondToChallenge(false)}>Decline</button>
            <button
              className="btn danger-outline"
              disabled={eligibleGladiators.length === 0}
              onClick={() => setPicking(true)}
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!previewGladiator) {
    return (
      <div className="modal-backdrop">
        <div className="modal fight-day-modal">
          <h2>Choose Your Champion</h2>
          <p className="hint deathmatch-warning">
            Whoever you send against {challenge.rivalLudusName} risks his life. If he loses, he dies.
          </p>
          <div className="fighter-select-header">
            <span className="fsh-name">Name</span>
            <span className="fsh-ability">Ability</span>
            <span className="fsh-mood">Mood</span>
            <span className="fsh-action" />
          </div>
          <div className="fighter-select-list">
            {eligibleGladiators.map((g) => (
              <GladiatorHoverCard data={hoverDataFromGladiator(g)} reputation={state.reputation} key={g.id}>
                <div className="fighter-select-row">
                  <span className="fighter-select-name">{g.name}</span>
                  <span className="fighter-select-sub">
                    <StarRating value={currentAbilityStars(currentAbilityOf(g))} size="sm" />
                    <span className="fighter-select-mood">{moodLabel(g.mood)}</span>
                  </span>
                  <button className="btn small danger-outline" onClick={() => setPreviewGladiatorId(g.id)}>
                    Preview
                  </button>
                </div>
              </GladiatorHoverCard>
            ))}
          </div>
          <div className="confirm-actions">
            <button className="btn" onClick={() => setPicking(false)}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop">
      <div className="modal fight-day-modal">
        <h2>Matchup Preview</h2>
        <p className="hint deathmatch-warning">This is final if you commit. The loser dies.</p>
        {opponent && (
          <div className="matchup-preview">
            <GladiatorHoverCard data={hoverDataFromGladiator(previewGladiator)} reputation={state.reputation}>
              <div className="matchup-preview-side">
                <div className="matchup-preview-name">{previewGladiator.name}</div>
                <div className="hint">your ludus</div>
              </div>
            </GladiatorHoverCard>
            <div className="matchup-preview-vs">
              versus
              {winEstimate && <WinChanceBadge estimate={winEstimate} />}
            </div>
            <GladiatorHoverCard data={hoverDataFromRival(opponent)} reputation={state.reputation}>
              <div className="matchup-preview-side">
                <div className="matchup-preview-name">{opponent.name}</div>
                <div className="hint">{challenge.rivalLudusName}</div>
              </div>
            </GladiatorHoverCard>
          </div>
        )}
        <div className="confirm-actions">
          <button className="btn" onClick={() => setPreviewGladiatorId(null)}>Back</button>
          <button
            className="btn danger-outline"
            onClick={() => {
              respondToChallenge(true, previewGladiator.id);
              setPicking(false);
              setPreviewGladiatorId(null);
            }}
          >
            Commit to the Death Match
          </button>
        </div>
      </div>
    </div>
  );
}
