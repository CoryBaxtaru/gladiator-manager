import type { CombatResult, DaySummary, MilestoneCategory } from "../types";
import { useGame } from "../state/GameContext";
import { Card } from "./Card";
import { Badge } from "./Badge";

const CATEGORY_ICONS: Record<string, string> = {
  training: "\u{1F3CB}",
  building: "\u{1F3DB}",
  upkeep: "\u{1F4B0}",
  mood: "\u{1F3AD}",
  fight: "⚔",
  event: "✨",
  recruitment: "\u{1F91D}",
  staff: "\u{1F489}",
};

function CategoryIcon({ category }: { category: DaySummary["entries"][number]["category"] }) {
  return <span className="entry-icon">{CATEGORY_ICONS[category] ?? "•"}</span>;
}

const MILESTONE_ICONS: Record<MilestoneCategory, string> = {
  death: "\u{1F480}",
  escape: "\u{1F3C3}",
  retirement: "\u{1F396}",
  promotion: "\u{1F3C6}",
  bankruptcy: "\u{1F4B8}",
  technique: "\u{2694}",
  poaching: "\u{1F575}",
  demotion: "\u{1F4C9}",
};

const MILESTONE_TONE: Record<MilestoneCategory, "success" | "warning" | "danger" | "gold" | "neutral"> = {
  death: "danger",
  escape: "danger",
  retirement: "neutral",
  promotion: "gold",
  bankruptcy: "danger",
  technique: "gold",
  poaching: "danger",
  demotion: "danger",
};

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

const OUTCOME_LABEL: Record<CombatResult["outcome"], string> = { win: "Victory", draw: "Draw", loss: "Loss" };
const OUTCOME_TONE: Record<CombatResult["outcome"], "success" | "warning" | "danger"> = {
  win: "success",
  draw: "warning",
  loss: "danger",
};

function CompactFightLine({ result }: { result: CombatResult }) {
  return (
    <div className="history-fight-line">
      <Badge tone={OUTCOME_TONE[result.outcome]}>{OUTCOME_LABEL[result.outcome]}</Badge>
      <span>
        {result.gladiatorName} versus {result.opponentName} of the {result.rivalLudusName}
      </span>
      <span className="hint">
        {signed(result.goldReward)}g, {signed(result.reputationReward)} rep
      </span>
    </div>
  );
}

/** A rolling log of past week/day summaries and major events, so nothing is lost the
 * moment a Week Summary modal is dismissed -- the player can always look back. */
export function HistoryScreen() {
  const { state } = useGame();
  const days = [...state.history].reverse();
  const milestones = [...state.milestones].reverse();

  return (
    <div className="screen">
      <h2>Ludus History</h2>

      <h3>Milestones</h3>
      <p className="hint">
        The significant moments -- deaths, escapes, retirements, promotions, demotions, poachings, bankruptcies, signature techniques --
        kept permanently, well past the rolling day-by-day log below.
      </p>
      {milestones.length === 0 && <p className="empty-note">Nothing significant has happened yet.</p>}
      {milestones.length > 0 && (
        <div className="history-milestone-list">
          {milestones.map((m) => (
            <div className="history-milestone-row" key={m.id}>
              <span className="entry-icon">{MILESTONE_ICONS[m.category]}</span>
              <Badge tone={MILESTONE_TONE[m.category]}>Day {m.day}</Badge>
              <span>{m.text}</span>
            </div>
          ))}
        </div>
      )}

      <h3>Day by Day</h3>
      <p className="hint">
        Everything that's happened, most recent first, so a moment doesn't vanish once its summary is dismissed.
        Only the last 60 days are kept here -- see Milestones above for the permanent record.
      </p>
      {days.length === 0 && <p className="empty-note">Nothing has happened yet.</p>}
      <div className="history-list">
        {days.map((day) => (
          <Card key={day.day} className="history-day">
            <h4>Day {day.day}</h4>
            {day.entries.length === 0 && day.combatResults.length === 0 && (
              <p className="empty-note">A quiet day. Nothing of note happened.</p>
            )}
            {day.entries.map((e, i) => (
              <div className="summary-entry" key={i}>
                <CategoryIcon category={e.category} />
                <span>{e.text}</span>
              </div>
            ))}
            {day.combatResults.map((r) => (
              <CompactFightLine result={r} key={r.fightId} />
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}
