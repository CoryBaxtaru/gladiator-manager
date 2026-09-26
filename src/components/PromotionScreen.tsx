import { useState } from "react";
import { useGame } from "../state/GameContext";
import { REPUTATION_TIER_LABELS, PROMOTION, REPUTATION_BANDS_BY_TIER } from "../config";
import {
  promotionAvailable,
  promotionOnCooldown,
  promotionChampion,
  promotionReadiness,
  reputationCapFor,
  nextTierOf,
  buildPromotionMatchup,
} from "../engine/promotion";
import { praetorianFinaleAvailable, praetorianFinaleOnCooldown } from "../engine/colosseumFinale";
import { estimateWinChance, canFight } from "../engine/combat";
import { currentAbilityStars, currentAbilityOf } from "../engine/rating";
import { moodLabel } from "../engine/mood";
import { StarRating } from "./StarRating";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { GladiatorHoverCard, hoverDataFromGladiator, hoverDataFromRival } from "./GladiatorHoverCard";
import { WinChanceBadge } from "./WinChanceBadge";
import { ConfirmDialog } from "./ConfirmDialog";
import { GladiatorPortrait } from "./GladiatorPortrait";

/**
 * Tier-up is gated behind an optional, player-timed Promotion Fight against a
 * median-strength gladiator drawn from the tier being entered (see
 * engine/promotion.ts). Reaching the reputation cap unlocks the option only once the
 * ludus also clears a readiness bar (building/roster investment, see
 * promotionReadiness) -- nothing forces the attempt once both are met, so a player
 * still gets a real prep window before committing.
 */
export function PromotionScreen() {
  const { state, attemptPromotion, resolvePraetorianFinale } = useGame();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [finaleSelection, setFinaleSelection] = useState<Set<string>>(new Set());

  const nextTier = nextTierOf(state.unlockedTier);
  const cap = reputationCapFor(state);
  const onCooldown = promotionOnCooldown(state);
  const available = promotionAvailable(state);
  const champion = promotionChampion(state);
  const readiness = promotionReadiness(state);
  const repReady = state.reputation >= cap;
  const eligibleGladiators = state.gladiators.filter(canFight);
  const confirmingGladiator = eligibleGladiators.find((g) => g.id === confirmingId) ?? null;

  if (!nextTier) {
    const finaleAvailable = praetorianFinaleAvailable(state);
    const finaleOnCooldown = praetorianFinaleOnCooldown(state);
    const colosseumCap = REPUTATION_BANDS_BY_TIER.colosseum.max;

    const toggleFinaleFighter = (id: string) => {
      setFinaleSelection((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    return (
      <div className="screen">
        <h2>Promotion</h2>
        <p className="hint">
          The ludus has reached the Colosseum, the highest tier there is -- no one left to be promoted past. What's
          left is the closest thing this game has to an ending.
        </p>

        <Card accent={finaleAvailable ? "gold" : "none"}>
          <h3>The Emperor's Praetorian Guard</h3>
          {state.praetorianVictories > 0 && <Badge tone="gold">Defeated {state.praetorianVictories} time(s)</Badge>}
          <p className="hint">
            A genuine capstone, not just another fight day: the Emperor fields a squad matching the size of your
            active roster, each one significantly stronger than an ordinary Colosseum-tier opponent. A real test of
            a well-developed ludus, with a real conclusive payoff for winning.
          </p>

          {!finaleAvailable && !finaleOnCooldown && (
            <>
              <div className="card-row">
                <span>Reputation</span>
                <span>{state.reputation} / {colosseumCap}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.round((state.reputation / colosseumCap) * 100))}%` }} />
              </div>
              <p className="hint">Max out reputation at the Colosseum to summon the Guard.</p>
            </>
          )}

          {finaleOnCooldown && (
            <div className="banner warning">
              The Guard won't be summoned again until day {state.praetorianCooldownUntilDay}. Ordinary fighting,
              training, and recruiting continue as normal in the meantime.
            </div>
          )}

          {finaleAvailable && (
            <>
              <p className="hint">Choose who stands with you. A bruised gladiator can still go; anyone more seriously hurt cannot.</p>
              {eligibleGladiators.length === 0 ? (
                <p className="empty-note">No one is fit to fight right now.</p>
              ) : (
                <>
                  <div className="fighter-select-header">
                    <span className="fsh-checkbox" />
                    <span className="fsh-portrait" />
                    <span className="fsh-name">Name</span>
                    <span className="fsh-ability">Ability</span>
                    <span className="fsh-mood">Mood</span>
                  </div>
                  <div className="fighter-select-list">
                    {eligibleGladiators.map((g) => (
                      <GladiatorHoverCard data={hoverDataFromGladiator(g)} reputation={state.reputation} key={g.id}>
                        <label className="fighter-select-row">
                          <input
                            type="checkbox"
                            checked={finaleSelection.has(g.id)}
                            onChange={() => toggleFinaleFighter(g.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <GladiatorPortrait name={g.name} origin={g.origin} condition={g.condition} size={32} variant="headshot" />
                          <span className="fighter-select-name">{g.name}</span>
                          <span className="fighter-select-sub">
                            <StarRating value={currentAbilityStars(currentAbilityOf(g))} size="sm" />
                            <span className="fighter-select-mood">{moodLabel(g.mood)}</span>
                          </span>
                        </label>
                      </GladiatorHoverCard>
                    ))}
                  </div>
                  <button
                    className="btn primary"
                    disabled={finaleSelection.size === 0}
                    onClick={() => {
                      resolvePraetorianFinale(Array.from(finaleSelection));
                      setFinaleSelection(new Set());
                    }}
                  >
                    Summon the Guard with {finaleSelection.size} fighter(s)
                  </button>
                </>
              )}
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2>Promotion</h2>
      <p className="hint">
        Reputation caps at {cap} while fighting at {REPUTATION_TIER_LABELS[state.unlockedTier]}. Winning a
        Promotion Fight against a real test of {REPUTATION_TIER_LABELS[nextTier]} unlocks it for real, on your own
        schedule, not the moment reputation alone qualifies you.
      </p>

      {!available && !onCooldown && (
        <Card>
          <div className="card-row">
            <span>Reputation</span>
            <span>{state.reputation} / {cap}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.round((state.reputation / cap) * 100))}%` }} />
          </div>
          {!repReady ? (
            <p className="hint">Keep fighting to reach the cap. A Promotion Fight unlocks once you do and the ludus is ready.</p>
          ) : readiness && !readiness.ok ? (
            <>
              <p className="hint">
                Reputation is there, but the ludus isn't built for {REPUTATION_TIER_LABELS[nextTier]} yet:
              </p>
              <div className="card-row">
                <span>Average building level</span>
                <span className={readiness.avgBuildingLevel >= readiness.requiredBuildingLevel ? "" : "mood-negative"}>
                  {readiness.avgBuildingLevel.toFixed(1)} / {readiness.requiredBuildingLevel.toFixed(1)} needed
                </span>
              </div>
              <div className="card-row">
                <span>Average roster ability</span>
                <span className={readiness.avgRosterCA >= readiness.requiredRosterCA ? "" : "mood-negative"}>
                  {Math.round(readiness.avgRosterCA)} / {readiness.requiredRosterCA} needed
                </span>
              </div>
              <p className="hint">Upgrade buildings on the Ludus screen or keep training/recruiting to close the gap.</p>
            </>
          ) : null}
        </Card>
      )}

      {onCooldown && (
        <div className="banner warning">
          That attempt didn't go your way. {champion ? champion.gladiator.name : "The champion"} will accept a
          rematch after day {state.promotionCooldownUntilDay}. Ordinary fighting, training, and recruiting continue
          as normal in the meantime.
        </div>
      )}

      {available && champion && (
        <>
          <Card accent="gold">
            <h3>The Champion</h3>
            <GladiatorHoverCard
              data={hoverDataFromRival(champion.gladiator)}
              reputation={state.reputation}
              triggerClassName="champion-trigger"
            >
              <div className="matchup-preview-side">
                <GladiatorPortrait name={champion.gladiator.name} origin={champion.gladiator.origin} condition="healthy" size={100} variant="full" />
                <div className="matchup-preview-name">{champion.gladiator.name}</div>
                <div className="hint">Of the {champion.rivalLudus.name}</div>
              </div>
            </GladiatorHoverCard>
            <p className="hint">
              A hard fight, not a death match: losing isn't a guaranteed death sentence the way that is. But it's a
              real fight all the same, and a bad enough defeat can still turn fatal. Losing costs reputation and
              time either way, and you can regroup and try again after the cooldown.
            </p>
          </Card>

          <h3>Choose Your Champion</h3>
          <p className="hint">
            Review your roster before committing, sell off anyone who won't hold up at the next tier, recruit or
            train a replacement, from Roster, Training, or Recruitment, then come back when you're ready.
          </p>
          {eligibleGladiators.length === 0 ? (
            <p className="empty-note">No one is fit to fight right now.</p>
          ) : (
            <>
              <div className="fighter-select-header">
                <span className="fsh-portrait" />
                <span className="fsh-name">Name</span>
                <span className="fsh-ability">Ability</span>
                <span className="fsh-mood">Mood</span>
                <span className="fsh-winchance">Win Chance</span>
                <span className="fsh-action" />
              </div>
              <div className="fighter-select-list">
              {eligibleGladiators.map((g) => {
                const matchup = buildPromotionMatchup(state, g.id);
                const estimate = matchup ? estimateWinChance(g, matchup, state, state.currentDay) : null;
                return (
                  <GladiatorHoverCard data={hoverDataFromGladiator(g)} reputation={state.reputation} key={g.id}>
                    <div className="fighter-select-row">
                      <GladiatorPortrait name={g.name} origin={g.origin} condition={g.condition} size={32} variant="headshot" />
                      <span className="fighter-select-name">{g.name}</span>
                      <span className="fighter-select-sub">
                        <StarRating value={currentAbilityStars(currentAbilityOf(g))} size="sm" />
                        <span className="fighter-select-mood">{moodLabel(g.mood)}</span>
                      </span>
                      {estimate && <WinChanceBadge estimate={estimate} />}
                      <button className="btn small primary" onClick={() => setConfirmingId(g.id)}>
                        Challenge
                      </button>
                    </div>
                  </GladiatorHoverCard>
                );
              })}
              </div>
            </>
          )}
        </>
      )}

      {confirmingGladiator && champion && (
        <ConfirmDialog
          title="Challenge for promotion?"
          message={`Send ${confirmingGladiator.name} to challenge ${champion.gladiator.name}. A loss costs real reputation and starts a ${PROMOTION.cooldownDays}-day cooldown before another attempt -- and carries the same real risk to his life a losing fight always does. This is not risk-free.`}
          confirmLabel="Challenge"
          onConfirm={() => {
            attemptPromotion(confirmingGladiator.id);
            setConfirmingId(null);
          }}
          onCancel={() => setConfirmingId(null)}
        />
      )}
    </div>
  );
}
