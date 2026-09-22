import type { CombatResult } from "../types";
import { Card } from "./Card";
import { Badge } from "./Badge";

const BADGE_TEXT: Record<CombatResult["outcome"], string> = {
  win: "Victory",
  draw: "Draw",
  loss: "Loss",
};

const BADGE_TONE: Record<CombatResult["outcome"], "success" | "warning" | "danger"> = {
  win: "success",
  draw: "warning",
  loss: "danger",
};

function nameClass(result: CombatResult, isPlayerSide: boolean): string {
  if (result.outcome === "draw") return "fight-name-draw";
  const playerWon = result.outcome === "win";
  const thisSideWon = isPlayerSide ? playerWon : !playerWon;
  return thisSideWon ? "fight-name-win" : "fight-name-loss";
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function metaText(result: CombatResult): string {
  if (result.isDeathMatch) {
    return result.outcome === "win" ? "The opponent did not survive." : "He did not survive.";
  }
  if (result.outcome === "win") {
    return `+${result.goldReward}g, ${signed(result.reputationReward)} rep`;
  }
  if (result.outcome === "draw") {
    return `+${result.goldReward}g, ${signed(result.reputationReward)} rep, no ground lost`;
  }
  const base = `+${result.goldReward}g consolation, ${signed(result.reputationReward)} rep`;
  if (result.died) return `${base}, fatally wounded`;
  if (result.injury) return `${base}, ${result.injury.replace("_", " ")}`;
  return base;
}

export function FightResultCard({ result }: { result: CombatResult }) {
  return (
    <Card accent={result.isDeathMatch ? "danger" : "none"} className="fight-card">
      {result.isDeathMatch && <Badge tone="danger">Death Match</Badge>}
      <Badge tone={BADGE_TONE[result.outcome]}>{BADGE_TEXT[result.outcome]}</Badge>
      <div className="fight-card-matchup">
        <span className={nameClass(result, true)}>{result.gladiatorName}</span> of your ludus versus{" "}
        <span className={nameClass(result, false)}>{result.opponentName}</span> of the {result.rivalLudusName}
      </div>
      <div className="fight-card-meta">{metaText(result)}</div>
      <details className="combat-log">
        <summary>Clash log</summary>
        <div className="combat-log-rounds">
          {result.log.map((r) => (
            <div key={r.round}>{r.text}</div>
          ))}
        </div>
      </details>
    </Card>
  );
}
