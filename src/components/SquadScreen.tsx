import { useState } from "react";
import type { Gladiator } from "../types";
import { useGame } from "../state/GameContext";
import { potentialStarDisplay, currentAbilityStars, currentAbilityOf, statIndicators } from "../engine/rating";
import { TRAITS, PHYSICAL_TRAITS, PERSONALITY_TRAIT_UNLOCK, ROSTER_DEATH_GRACE_DAYS } from "../config";
import { StarRating } from "./StarRating";
import { Tooltip } from "./Tooltip";
import { ConfirmDialog } from "./ConfirmDialog";
import { GladiatorPortrait } from "./GladiatorPortrait";
import {
  canTriggerMoraleEvent,
  canPerformRitual,
  canGiveBonusCut,
  bonusCutCost,
  moraleEventCostFor,
  canBoastPride,
  canGiveEncouragement,
  canGiveLeave,
  canVisitBaths,
  bathsCostFor,
  canGivePublicRecognition,
  recognitionCostFor,
} from "../engine/moodActions";
import { doctorVisitCost } from "../engine/training";
import { instantSalePrice } from "../engine/sale";
import { riskTagFor, moodLabel } from "../engine/mood";
import { rosterCapacity } from "../engine/buildings";
import { Card } from "./Card";
import { Badge } from "./Badge";

const CONDITION_BADGE_TONE: Record<Gladiator["condition"], "success" | "warning" | "danger"> = {
  healthy: "success",
  bruised: "warning",
  injured: "danger",
  gravely_injured: "danger",
};

function moodColor(mood: number): string {
  if (mood >= 70) return "mood-good";
  if (mood >= 40) return "mood-ok";
  if (mood >= 25) return "mood-bad";
  return "mood-critical";
}

const CONDITION_LABELS: Record<Gladiator["condition"], string> = {
  healthy: "Healthy",
  bruised: "Bruised",
  injured: "Injured",
  gravely_injured: "Gravely injured",
};

const CONDITION_TOOLTIPS: Record<Gladiator["condition"], string> = {
  healthy: "Fit to train and fight.",
  bruised: "Minor knocks. A small penalty in the arena, heals fast.",
  injured: "A real wound. Noticeably weaker until it heals.",
  gravely_injured: "Close to death. Needs time before fighting again.",
};

export function SquadScreen() {
  const {
    state,
    sellGladiator,
    triggerMoraleEvent,
    performRitual,
    giveBonusCut,
    boastPride,
    giveEncouragement,
    giveLeave,
    visitBaths,
    givePublicRecognition,
    payForDoctorVisit,
  } = useGame();
  const [selectedId, setSelectedId] = useState<string | null>(
    state.gladiators.find((g) => g.status === "active")?.id ?? null
  );
  const [confirmingSell, setConfirmingSell] = useState<string | null>(null);

  const activeGladiators = state.gladiators.filter((g) => g.status === "active");
  // A death or escape stays visible, greyed out, for a grace period rather than
  // vanishing from the list the instant it happens (Phase 8 Part C).
  const recentlyGone = state.gladiators.filter(
    (g) =>
      (g.status === "dead" || g.status === "escaped") &&
      g.statusChangedOnDay !== null &&
      state.currentDay - g.statusChangedOnDay <= ROSTER_DEATH_GRACE_DAYS
  );
  const visibleGladiators = [...activeGladiators, ...recentlyGone];
  const selected = visibleGladiators.find((g) => g.id === selectedId) ?? activeGladiators[0] ?? null;
  const potential = selected ? potentialStarDisplay(selected, state.reputation) : null;
  const feastCost = moraleEventCostFor(state);
  const bathsCost = bathsCostFor(state);
  const recognitionCost = recognitionCostFor(state);
  const capacity = rosterCapacity(state);
  const overCapacity = activeGladiators.length > capacity;

  return (
    <div className="screen squad-screen">
      <h2>
        Roster{" "}
        <span
          className={`roster-capacity ${overCapacity ? "roster-capacity-over" : ""}`}
          title={overCapacity ? "Over Barracks capacity -- weekly upkeep is running higher until you're back under cap or upgrade the Barracks." : "Barracks capacity"}
        >
          {activeGladiators.length}/{capacity}
        </span>
      </h2>
      <div className="squad-layout">
        <div className="squad-list">
          {visibleGladiators.length === 0 && <p className="empty-note">No active gladiators. Recruit some.</p>}
          {visibleGladiators.map((g) => {
            const isGone = g.status !== "active";
            return (
              <Card
                key={g.id}
                className={`squad-list-item ${isGone ? "squad-list-item-gone" : ""}`}
                selected={selected?.id === g.id}
                onClick={() => setSelectedId(g.id)}
              >
                <div className="squad-list-item-portrait">
                  <GladiatorPortrait name={g.name} origin={g.origin} condition={g.condition} size={56} variant="headshot" />
                </div>
                <div className="squad-list-item-name">{g.name}</div>
                <div className="squad-list-item-stars">
                  {!isGone && <StarRating value={currentAbilityStars(currentAbilityOf(g))} size="sm" />}
                </div>
                <div className="squad-list-item-mood-row">
                  {!isGone && (
                    <>
                      <span className="squad-mood-label">Mood</span>
                      <div className={`mood-bar ${moodColor(g.mood)}`} title={`Mood: ${g.mood}/100`}>
                        <div className="mood-bar-fill" style={{ width: `${g.mood}%` }} />
                      </div>
                    </>
                  )}
                </div>
                <div className="squad-list-item-condition">
                  {isGone ? (
                    <span className="squad-list-condition">{g.status === "dead" ? "Dead" : "Escaped"}</span>
                  ) : (
                    <span className="squad-list-condition">
                      {CONDITION_LABELS[g.condition]}
                      {g.injuryDaysRemaining > 0 ? ` (${g.injuryDaysRemaining}d)` : ""}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {selected && (
          <Card className="gladiator-detail">
            <div className="gladiator-detail-header">
              <GladiatorPortrait name={selected.name} origin={selected.origin} condition={selected.condition} size={112} variant="full" />
              <div>
                <h3>{selected.name}</h3>
                <span>{selected.origin}, age {selected.age}</span>
                {selected.birthName && selected.birthName !== selected.name && (
                  <span className="birth-name">born {selected.birthName}</span>
                )}
              </div>
            </div>
            <p className="backstory">{selected.backstory}</p>

            <div className="trait-list">
              <Tooltip text={PHYSICAL_TRAITS[selected.physicalTrait].description}>
                <Badge tone="neutral">{selected.physicalTrait}</Badge>
              </Tooltip>
              {selected.personalityTraits.map((t) => (
                <Tooltip text={TRAITS[t].description} key={t}>
                  <Badge tone="gold">{t}</Badge>
                </Tooltip>
              ))}
              {selected.personalityTraits.length === 0 && (
                <Tooltip
                  text={
                    selected.age <= PERSONALITY_TRAIT_UNLOCK.youngAgeMax
                      ? "Too young to have developed a personality yet."
                      : `Develops his first personality trait after ${PERSONALITY_TRAIT_UNLOCK.firstSlotWinMilestone} career wins (currently ${selected.record.wins}/${PERSONALITY_TRAIT_UNLOCK.firstSlotWinMilestone}).`
                  }
                >
                  <Badge tone="neutral">No personality yet</Badge>
                </Tooltip>
              )}
              <Tooltip text={CONDITION_TOOLTIPS[selected.condition]}>
                <Badge tone={CONDITION_BADGE_TONE[selected.condition]}>{CONDITION_LABELS[selected.condition]}</Badge>
              </Tooltip>
              {selected.hotStreakUntilDay && selected.hotStreakUntilDay > state.currentDay && (
                <Tooltip text="Riding high morale. A temporary edge in the arena.">
                  <Badge tone="gold">Hot Streak</Badge>
                </Tooltip>
              )}
              {(() => {
                const risk = riskTagFor(selected);
                return risk ? (
                  <Tooltip text={risk.tooltip}>
                    <Badge tone={risk.tone}>{risk.label}</Badge>
                  </Tooltip>
                ) : null;
              })()}
            </div>

            <div className="detail-grid detail-grid-3">
              <div className="detail-column">
                <div className="detail-block">
                  <h4>Stats</h4>
                  {(() => {
                    const indicators = statIndicators(selected);
                    const rows: [string, keyof typeof indicators, number][] = [
                      ["Strength", "strength", selected.stats.strength],
                      ["Weapon Skill", "weaponSkill", selected.stats.weaponSkill],
                      ["Endurance", "endurance", selected.stats.endurance],
                      ["Showmanship", "showmanship", selected.stats.showmanship],
                    ];
                    return rows.map(([label, key, value]) => {
                      const indicator = indicators[key];
                      return (
                        <div className="card-row" key={key}>
                          <span>
                            {label}
                            {indicator && (
                              <span className={`stat-indicator stat-indicator-${indicator}`}>
                                {indicator === "boost" ? "▲" : "▼"}
                              </span>
                            )}
                          </span>
                          <span>{value}</span>
                        </div>
                      );
                    });
                  })()}
                  <div className="card-row">
                    <span>Current Ability</span>
                    <StarRating value={currentAbilityStars(currentAbilityOf(selected))} size="sm" />
                  </div>
                  <div className="card-row">
                    <span>Potential</span>
                    <Tooltip
                      text={
                        potential?.revealed
                          ? "Potential fully scouted."
                          : "Not fully scouted yet. This guess sharpens as your ludus earns more reputation."
                      }
                    >
                      <span>{potential && <StarRating value={potential.stars} size="sm" />}</span>
                    </Tooltip>
                  </div>
                  {potential && <div className="potential-label">{potential.label}</div>}
                </div>
              </div>

              <div className="detail-column">
                <div className="detail-block">
                  <h4>Record</h4>
                  <div className="card-row"><span>Fights</span><span>{selected.record.fights}</span></div>
                  <div className="card-row"><span>Wins</span><span>{selected.record.wins}</span></div>
                  <div className="card-row"><span>Losses</span><span>{selected.record.losses}</span></div>
                  <div className="card-row"><span>Near Deaths</span><span>{selected.record.nearDeaths}</span></div>
                  <div className="card-row"><span>Weekly Upkeep</span><span>{selected.weeklyUpkeep}g</span></div>
                </div>
              </div>

              <div className="detail-column">
                {selected.status !== "active" ? (
                  <div className="detail-block">
                    <p className="empty-note">
                      {selected.status === "dead"
                        ? `${selected.name} did not survive. He is no longer part of the roster.`
                        : `${selected.name} escaped and is no longer part of the roster.`}
                    </p>
                  </div>
                ) : (
                  <div className="detail-block">
                    <h4>Mood</h4>
                    <div className="card-row"><span>Current Mood</span><span>{moodLabel(selected.mood)}</span></div>
                    {selected.moodModifiers.length === 0 ? (
                      <p className="empty-note">Nothing actively affecting his mood right now.</p>
                    ) : (
                      <div className="mood-breakdown">
                        {selected.moodModifiers.map((m) => (
                          <div className="mood-breakdown-row" key={m.id}>
                            <span className={m.magnitude >= 0 ? "mood-positive" : "mood-negative"}>
                              {m.magnitude >= 0 ? "+" : ""}{m.magnitude}
                            </span>
                            <span>{m.source}</span>
                            <span className="mood-breakdown-days">{Math.max(0, m.expiresOnDay - state.currentDay)}d left</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mood-actions">
                      <button
                        className="btn small"
                        disabled={!canGiveEncouragement(selected, state.currentDay)}
                        onClick={() => giveEncouragement(selected.id)}
                        title="Free, always available, a small and short boost. The one mood tool that never costs gold, for when nothing else is affordable."
                      >
                        Word of Encouragement
                      </button>
                      <button
                        className="btn small"
                        disabled={!canGiveLeave(selected, state.currentDay)}
                        onClick={() => giveLeave(selected.id)}
                        title="Free. Puts him on Rest training focus for a couple of days on top of the mood boost -- a real rest, not just a number."
                      >
                        Grant a Day of Leave
                      </button>
                      <button
                        className="btn small"
                        disabled={state.gold < bathsCost || !canVisitBaths(selected, state.currentDay)}
                        onClick={() => visitBaths(selected.id)}
                        title={`Costs ${bathsCost}g. Effectiveness scales with the Quarters building's level.`}
                      >
                        Evening at the Baths ({bathsCost}g)
                      </button>
                      <button
                        className="btn small"
                        disabled={state.gold < recognitionCost || !canGivePublicRecognition(selected, state.currentDay)}
                        onClick={() => givePublicRecognition(selected.id)}
                        title={`Costs ${recognitionCost}g. The boost scales with his showmanship -- crowd favorites benefit more.`}
                      >
                        Public Recognition ({recognitionCost}g)
                      </button>
                      <button
                        className="btn small"
                        disabled={state.gold < feastCost || !canTriggerMoraleEvent(selected, state.currentDay)}
                        onClick={() => triggerMoraleEvent(selected.id)}
                        title={`Costs ${feastCost}g, a few days between uses`}
                      >
                        Throw a Feast ({feastCost}g)
                      </button>
                      {selected.personalityTraits.includes("Devout") && (
                        <button
                          className="btn small"
                          disabled={!canPerformRitual(selected, state.currentDay)}
                          onClick={() => performRitual(selected.id)}
                        >
                          Observe Pre-Fight Ritual
                        </button>
                      )}
                      {selected.personalityTraits.includes("Greedy") && (
                        <button
                          className="btn small"
                          disabled={state.gold < bonusCutCost(selected) || !canGiveBonusCut(selected, state.currentDay)}
                          onClick={() => giveBonusCut(selected.id)}
                        >
                          Give Bigger Cut ({bonusCutCost(selected)}g)
                        </button>
                      )}
                      {selected.personalityTraits.includes("Prideful") && (
                        <button
                          className="btn small"
                          disabled={!canBoastPride(selected, state.currentDay)}
                          onClick={() => boastPride(selected.id)}
                          title="Free. Lets him hold court and boast of his own glory."
                        >
                          Let Him Boast
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selected.status === "active" && selected.injuryDaysRemaining > 0 && (
              <div className="detail-block">
                <h4>Recovery</h4>
                <p className="hint">
                  Resting under the Infirmary's care, {selected.injuryDaysRemaining} day(s) remaining. Paying for a
                  doctor visit cuts this recovery time significantly, right now. A doctor on staff doesn't speed
                  recovery just by existing, but makes every visit cheaper and more effective.
                </p>
                <button
                  className="btn small"
                  disabled={state.gold < doctorVisitCost(selected, state)}
                  onClick={() => payForDoctorVisit(selected.id)}
                >
                  Pay for a Doctor Visit ({doctorVisitCost(selected, state)}g)
                </button>
              </div>
            )}

            {selected.status === "active" && (
              <div className="detail-actions">
                <button className="btn danger-outline" onClick={() => setConfirmingSell(selected.id)}>
                  Release / Sell ({instantSalePrice(currentAbilityOf(selected))}g)
                </button>
              </div>
            )}
          </Card>
        )}
      </div>

      {confirmingSell && (
        <ConfirmDialog
          title="Sell gladiator?"
          message={`Are you sure you want to sell ${activeGladiators.find((g) => g.id === confirmingSell)?.name}? This cannot be undone.`}
          confirmLabel="Sell"
          onConfirm={() => {
            sellGladiator(confirmingSell, "instant");
            setConfirmingSell(null);
          }}
          onCancel={() => setConfirmingSell(null)}
        />
      )}
    </div>
  );
}
