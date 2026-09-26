import { useMemo, useState } from "react";
import { useGame } from "../state/GameContext";
import { matchmakeFightDay } from "../engine/fightday";
import { estimateWinChance } from "../engine/combat";
import { currentAbilityStars, currentAbilityOf } from "../engine/rating";
import { moodLabel } from "../engine/mood";
import { GladiatorHoverCard, hoverDataFromGladiator } from "./GladiatorHoverCard";
import { WinChanceBadge } from "./WinChanceBadge";
import { StarRating } from "./StarRating";
import { GladiatorPortrait } from "./GladiatorPortrait";

const TIER_LABELS: Record<string, string> = {
  local: "Local Arena",
  provincial: "Provincial Games",
  rival: "Rival Ludus Challenge",
  colosseum: "The Colosseum",
};

export function FightDaySelectionModal() {
  const { state, eligibleFighters, resolveFightDay } = useGame();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const eligible = eligibleFighters();
  const tier = state.unlockedTier;

  // Computed once per mount (not on every checkbox toggle) so the preview opponent
  // and win estimate don't reroll/flicker as the player selects fighters. This is a
  // preview only: the actual matchup rolled again when "Send" resolves the fight day
  // may differ, same as the estimate itself is only ever an estimate.
  // Deliberately empty deps: this is a mount-once preview, not a live recompute.
  const previewMatchups = useMemo(() => matchmakeFightDay(state, eligible.map((g) => g.id)), []);
  const winEstimates = useMemo(() => {
    const byGladiatorId = new Map<string, ReturnType<typeof estimateWinChance>>();
    for (const matchup of previewMatchups) {
      const gladiator = eligible.find((g) => g.id === matchup.gladiatorId);
      if (!gladiator) continue;
      byGladiatorId.set(matchup.gladiatorId, estimateWinChance(gladiator, matchup, state, state.currentDay));
    }
    return byGladiatorId;
  }, [previewMatchups]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Phase 12 Part E: "who to send" stays a real, meaningful decision -- nobody is
  // forced to send their WHOLE roster -- but a player can no longer indefinitely hide
  // every fit gladiator from risk. At least half the fit roster (rounded up) has to
  // fight each fight day.
  const minimumRequired = eligible.length === 0 ? 0 : Math.max(1, Math.ceil(eligible.length / 2));
  const meetsMinimum = selected.size >= minimumRequired;

  return (
    <div className="modal-backdrop">
      <div className="modal fight-day-modal">
        <h2>Fight Day, {TIER_LABELS[tier]}</h2>
        <p className="hint">
          Choose who fights today. A bruised gladiator can still go, at a real but small penalty -- anyone more
          seriously hurt is not eligible.
          {eligible.length > 0 && ` At least ${minimumRequired} of your ${eligible.length} fit fighter(s) must go -- the rest can sit this one out.`}
        </p>
        {eligible.length === 0 ? (
          <p className="empty-note">No one is fit to fight today.</p>
        ) : (
          <>
            <div className="fighter-select-header">
              <span className="fsh-checkbox" />
              <span className="fsh-portrait" />
              <span className="fsh-name">Name</span>
              <span className="fsh-ability">Ability</span>
              <span className="fsh-mood">Mood</span>
              <span className="fsh-winchance">Win Chance</span>
            </div>
            <div className="fighter-select-list">
            {eligible.map((g) => (
              <GladiatorHoverCard data={hoverDataFromGladiator(g)} reputation={state.reputation} key={g.id}>
                <label className="fighter-select-row">
                  <input
                    type="checkbox"
                    checked={selected.has(g.id)}
                    onChange={() => toggle(g.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <GladiatorPortrait name={g.name} origin={g.origin} condition={g.condition} size={32} variant="headshot" />
                  <span className="fighter-select-name">{g.name}</span>
                  <span className="fighter-select-sub">
                    <StarRating value={currentAbilityStars(currentAbilityOf(g))} size="sm" />
                    <span className="fighter-select-mood">{moodLabel(g.mood)}</span>
                  </span>
                  {winEstimates.has(g.id) && <WinChanceBadge estimate={winEstimates.get(g.id)!} />}
                </label>
              </GladiatorHoverCard>
            ))}
            </div>
          </>
        )}
        <div className="confirm-actions">
          {eligible.length === 0 && (
            <button className="btn" onClick={() => resolveFightDay([])}>
              Sit today out
            </button>
          )}
          <button className="btn primary" disabled={!meetsMinimum} onClick={() => resolveFightDay(Array.from(selected))}>
            Send {selected.size} to the arena
          </button>
        </div>
      </div>
    </div>
  );
}
