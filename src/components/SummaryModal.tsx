import type { DaySummary } from "../types";
import { useGame } from "../state/GameContext";
import { FightResultCard } from "./FightResultCard";

function CategoryIcon({ category }: { category: DaySummary["entries"][number]["category"] }) {
  const icons: Record<string, string> = {
    training: "\u{1F3CB}",
    building: "\u{1F3DB}",
    upkeep: "\u{1F4B0}",
    mood: "\u{1F3AD}",
    fight: "⚔",
    event: "✨",
    recruitment: "\u{1F91D}",
    staff: "\u{1F489}",
  };
  return <span className="entry-icon">{icons[category] ?? "•"}</span>;
}

export function SummaryModal({ summaries }: { summaries: DaySummary[] }) {
  const { clearLatestSummaries } = useGame();
  const allFights = summaries.flatMap((s) => s.combatResults);

  return (
    <div className="modal-backdrop">
      <div className="modal summary-modal">
        <h2>
          {summaries.length > 1
            ? `Week Summary, Days ${summaries[0].day} to ${summaries[summaries.length - 1].day}`
            : `Day ${summaries[0].day} Summary`}
        </h2>
        <div className="summary-scroll">
          {summaries.map((s) => (
            <div className="summary-day-block" key={s.day}>
              {summaries.length > 1 && <h4>Day {s.day}</h4>}
              {s.entries.length === 0 && s.combatResults.length === 0 && (
                <p className="empty-note">A quiet day. Nothing of note happened.</p>
              )}
              {s.entries.map((e, i) => (
                <div className="summary-entry" key={i}>
                  <CategoryIcon category={e.category} />
                  <span>{e.text}</span>
                </div>
              ))}
            </div>
          ))}

          {allFights.length > 0 && (
            <div className="fight-day-results">
              <h4>Fight Day Results</h4>
              <div className="fight-card-grid">
                {allFights.map((c) => (
                  <FightResultCard key={c.fightId} result={c} />
                ))}
              </div>
            </div>
          )}
        </div>
        <button className="btn primary" onClick={clearLatestSummaries}>
          Continue
        </button>
      </div>
    </div>
  );
}
