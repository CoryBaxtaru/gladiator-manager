import { useGame } from "../state/GameContext";
import { REPUTATION_TIER_LABELS, TIER_NEGLECT } from "../config";
import { computeStanding, nextTierOf, promotionReadiness, reputationCapFor } from "../engine/promotion";
import { tierSustainStandard, tierNeglectOnCooldown } from "../engine/tierNeglect";
import { Card } from "./Card";
import { Badge } from "./Badge";

// Floor, never round, the current value: rounding could show "1.3 / 1.3" for a true
// 1.2857 and read as a bar that's met when it isn't (Phase 18 Part A). Precision is
// chosen so a floored value can't contradict the met/unmet mark beside it: building
// averages move in sevenths, the softened roster bars land on tenths.
const floorTo = (v: number, places: number) => (Math.floor(v * 10 ** places) / 10 ** places).toFixed(places);
const building = (v: number) => v.toFixed(2);
const ability = (v: number) => v.toFixed(1);

function Threshold({ current, required, format, label }: { current: number; required: number; format: (v: number) => string; label: string }) {
  const met = current >= required;
  return (
    <td className={met ? "standing-met" : "standing-unmet"} data-label={label}>
      <span aria-hidden="true">{met ? "✓ " : "✗ "}</span>
      {format(required)}
      <span className="visually-hidden">{met ? " (met)" : " (not met)"}</span>
    </td>
  );
}

/**
 * The two bars a ludus is measured against, side by side: what it must keep up to
 * hold the tier it's in (checked weekly, see engine/tierNeglect.ts) and what it needs
 * to be promoted out of it. Before this, the hold bar was invisible until a rival
 * poached someone, and the promotion bar only appeared once reputation was maxed.
 */
export function TierStandingCard() {
  const { state } = useGame();
  const tierLabel = REPUTATION_TIER_LABELS[state.unlockedTier];
  const nextTier = nextTierOf(state.unlockedTier);
  const hold = tierSustainStandard(state);
  const reach = promotionReadiness(state);
  const cap = reputationCapFor(state);
  const { avgBuildingLevel, avgRosterCA } = computeStanding(state);
  const weeksBelow = state.tierNeglectWeeksBelowStandard;
  const belowHoldNow = !!hold && (avgBuildingLevel < hold.minAvgBuildingLevel || avgRosterCA < hold.minAvgRosterCA);
  const coolingDown = tierNeglectOnCooldown(state);

  let status: { tone: "success" | "warning" | "danger" | "neutral"; label: string; text: string };
  if (!hold) {
    status = { tone: "neutral", label: "No floor", text: `${tierLabel} is the ground floor: nothing to hold yet, only the next tier to reach.` };
  } else if (coolingDown) {
    status = {
      tone: "warning",
      label: "Recovering",
      text: `A rival already made a move. Weekly standing checks resume after day ${state.tierNeglectCooldownUntilDay}.`,
    };
  } else if (weeksBelow > 0) {
    status = {
      tone: "danger",
      label: `Slipping, week ${weeksBelow} of ${TIER_NEGLECT.graceWeeks}`,
      text: `Below what ${tierLabel} expects. After ${TIER_NEGLECT.graceWeeks} straight weeks a rival poaches your worst-off gladiator, or the ludus drops a tier if he's the last one.`,
    };
  } else if (belowHoldNow) {
    status = {
      tone: "warning",
      label: "Below the bar",
      text: `Below what ${tierLabel} expects. The next weekly check will start counting unless this is fixed first.`,
    };
  } else {
    status = { tone: "success", label: "Holding", text: `Meeting everything ${tierLabel} expects.` };
  }

  return (
    <Card className="tier-standing">
      <div className="tier-standing-head">
        <h3>Tier Standing</h3>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <p className="hint">{status.text}</p>
      <div>
        <table className="standing-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Measure</span>
              </th>
              <th scope="col">Now</th>
              {hold && <th scope="col">To hold {tierLabel}</th>}
              {nextTier && <th scope="col">To reach {REPUTATION_TIER_LABELS[nextTier]}</th>}
            </tr>
          </thead>
          <tbody>
            {nextTier && (
              <tr>
                <th scope="row">Reputation</th>
                <td data-label="Now">{state.reputation}</td>
                {hold && <td className="standing-na" data-label="To hold">--</td>}
                <Threshold current={state.reputation} required={cap} format={(v) => `${v}`} label="To reach" />
              </tr>
            )}
            <tr>
              <th scope="row">Average building level</th>
              <td data-label="Now">{floorTo(avgBuildingLevel, 2)}</td>
              {hold && <Threshold current={avgBuildingLevel} required={hold.minAvgBuildingLevel} format={building} label="To hold" />}
              {reach && <Threshold current={avgBuildingLevel} required={reach.requiredBuildingLevel} format={building} label="To reach" />}
            </tr>
            <tr>
              <th scope="row">Average roster ability</th>
              <td data-label="Now">{floorTo(avgRosterCA, 1)}</td>
              {hold && <Threshold current={avgRosterCA} required={hold.minAvgRosterCA} format={ability} label="To hold" />}
              {reach && <Threshold current={avgRosterCA} required={reach.requiredRosterCA} format={ability} label="To reach" />}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="hint">Upgrade buildings on the Ludus screen; train or recruit to lift the roster average.</p>
    </Card>
  );
}
