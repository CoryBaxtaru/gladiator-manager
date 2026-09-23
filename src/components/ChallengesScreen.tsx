import { useState } from "react";
import { useGame } from "../state/GameContext";
import { reputationToStars, currentAbilityStars, currentAbilityOf } from "../engine/rating";
import { previewOpponent } from "../engine/deathMatch";
import { estimateWinChance } from "../engine/combat";
import { moodLabel } from "../engine/mood";
import type { FightMatchup } from "../types";
import { StarRating } from "./StarRating";
import { Card } from "./Card";
import { GladiatorHoverCard, hoverDataFromGladiator, hoverDataFromRival } from "./GladiatorHoverCard";
import { WinChanceBadge } from "./WinChanceBadge";
import { GladiatorPortrait } from "./GladiatorPortrait";

export function ChallengesScreen() {
  const { state, eligibleChallengeTargets, issueChallenge } = useGame();
  const [pickingLudusId, setPickingLudusId] = useState<string | null>(null);
  const [previewGladiatorId, setPreviewGladiatorId] = useState<string | null>(null);

  const targets = eligibleChallengeTargets();
  const eligibleGladiators = state.gladiators.filter((g) => g.status === "active" && g.injuryDaysRemaining === 0);
  const pickingLudus = targets.find((l) => l.id === pickingLudusId) ?? null;
  const previewGladiator = eligibleGladiators.find((g) => g.id === previewGladiatorId) ?? null;

  const opponent = pickingLudus && previewGladiator ? previewOpponent(state, pickingLudus.id, previewGladiator.id) : null;

  let winEstimate = null;
  if (pickingLudus && previewGladiator && opponent) {
    const matchup: FightMatchup = {
      id: "preview",
      gladiatorId: previewGladiator.id,
      tier: state.unlockedTier,
      opponentName: opponent.name,
      opponentPowerLevel: opponent.currentAbility,
      opponentStats: opponent.stats,
      rivalLudusName: pickingLudus.name,
    };
    winEstimate = estimateWinChance(previewGladiator, matchup, state, state.currentDay);
  }

  const closePicker = () => {
    setPickingLudusId(null);
    setPreviewGladiatorId(null);
  };

  return (
    <div className="screen">
      <h2>Reputation Challenges</h2>
      <p className="hint deathmatch-warning">
        A death match has no mercy. The loser does not walk away. Only issue a challenge you mean to see through.
      </p>
      <p className="hint">
        You can challenge any ludus with strictly higher reputation than yours. Winning takes a real cut of their
        reputation for your own; losing costs you the same, and the gladiator you send.
      </p>

      {targets.length === 0 ? (
        <p className="empty-note">No ludus is both more reputable than you and off cooldown right now.</p>
      ) : (
        <div className="challenge-grid">
          {targets.map((l) => (
            <Card key={l.id}>
              <h3>{l.name}</h3>
              <div className="card-row">
                <span>Reputation</span>
                <StarRating value={reputationToStars(l.reputation)} size="sm" />
              </div>
              <div className="card-row"><span>Roster size</span><span>{l.roster.length}</span></div>
              <button
                className="btn danger-outline"
                disabled={eligibleGladiators.length === 0}
                onClick={() => setPickingLudusId(l.id)}
              >
                Issue Challenge
              </button>
            </Card>
          ))}
        </div>
      )}

      {pickingLudus && !previewGladiator && (
        <div className="modal-backdrop" onClick={closePicker}>
          <div className="modal fight-day-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Choose Your Champion</h2>
            <p className="hint deathmatch-warning">
              Whoever you send to challenge {pickingLudus.name} risks his life. If he loses, he dies.
            </p>
            <div className="fighter-select-header">
              <span className="fsh-portrait" />
              <span className="fsh-name">Name</span>
              <span className="fsh-ability">Ability</span>
              <span className="fsh-mood">Mood</span>
              <span className="fsh-action" />
            </div>
            <div className="fighter-select-list">
              {eligibleGladiators.map((g) => (
                <GladiatorHoverCard data={hoverDataFromGladiator(g)} reputation={state.reputation} key={g.id}>
                  <div className="fighter-select-row">
                    <GladiatorPortrait name={g.name} origin={g.origin} condition={g.condition} size={32} variant="headshot" />
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
              <button className="btn" onClick={closePicker}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {pickingLudus && previewGladiator && opponent && (
        <div className="modal-backdrop" onClick={closePicker}>
          <div className="modal fight-day-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Matchup Preview</h2>
            <p className="hint deathmatch-warning">This is final if you commit. The loser dies.</p>
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
                  <div className="hint">{pickingLudus.name}</div>
                </div>
              </GladiatorHoverCard>
            </div>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setPreviewGladiatorId(null)}>Back</button>
              <button
                className="btn danger-outline"
                onClick={() => {
                  issueChallenge(pickingLudus.id, previewGladiator.id);
                  closePicker();
                }}
              >
                Commit to the Death Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
