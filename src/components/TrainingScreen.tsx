import { useState } from "react";
import { useGame } from "../state/GameContext";
import { TRAINING_FOCUS_LABELS } from "../config";
import type { Gladiator, StatKey, TrainingFocus } from "../types";
import { displayedStaffStars, trainerCoveredStats } from "../engine/staff";
import { StarRating } from "./StarRating";
import { Tooltip } from "./Tooltip";
import { Card } from "./Card";

const FOCUS_OPTIONS: TrainingFocus[] = ["attack", "strength", "defence", "weaponSkill", "endurance", "showmanship", "balanced", "rest"];

const FOCUS_STAT_KEY: Partial<Record<TrainingFocus, StatKey>> = {
  attack: "attack",
  strength: "strength",
  defence: "defence",
  weaponSkill: "weaponSkill",
  endurance: "endurance",
  showmanship: "showmanship",
};

const STAFF_ROLE_LABEL: Record<string, (specialty: string) => string> = {
  trainer: (specialty) => `Trainer, ${specialty}`,
  doctor: () => "Doctor",
};

function staffRoleLabel(role: string, specialtyLabel: string): string {
  return (STAFF_ROLE_LABEL[role] ?? (() => role))(specialtyLabel);
}

const STAFF_ROLE_DESCRIPTION: Record<string, (specialty: string) => string> = {
  trainer: (specialty) => `Improves the odds of a training success for any gladiator whose focus (or a balanced session that lands on it) is ${specialty}, or another stat within his coverage.`,
  doctor: () => "Makes every paid doctor visit cheaper and more effective. Doesn't speed recovery just by being on staff.",
};

function staffRoleDescription(role: string, specialtyLabel: string): string {
  return (STAFF_ROLE_DESCRIPTION[role] ?? (() => ""))(specialtyLabel);
}

function StatArrow({ delta }: { delta: number }) {
  if (delta > 0) return <span className="stat-arrow up">&#9650;</span>;
  if (delta < 0) return <span className="stat-arrow down">&#9660;</span>;
  return null;
}

function SoloFocusRow({ gladiator }: { gladiator: Gladiator }) {
  const { setTrainingFocus } = useGame();
  const changeFor = (stat: StatKey) => gladiator.recentStatChanges.find((m) => m.stat === stat)?.delta ?? 0;

  return (
    <div className="training-focus-grid">
      {FOCUS_OPTIONS.map((opt) => {
        const statKey = FOCUS_STAT_KEY[opt];
        return (
          <div className="training-focus-cell" key={opt}>
            <div className="training-focus-number">
              {statKey ? (
                <>
                  {gladiator.stats[statKey]}
                  <StatArrow delta={changeFor(statKey)} />
                </>
              ) : (
                <span className="training-focus-number-blank">&nbsp;</span>
              )}
            </div>
            <button
              className={`btn small ${gladiator.trainingFocus === opt ? "active" : ""}`}
              onClick={() => setTrainingFocus(gladiator.id, opt)}
            >
              {TRAINING_FOCUS_LABELS[opt]}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function SparringPairCard({ a, b }: { a: Gladiator; b: Gladiator }) {
  const { clearSparring } = useGame();
  return (
    <Card accent="gold">
      <div className="sparring-pair-names">
        <strong>{a.name}</strong> &amp; <strong>{b.name}</strong> are sparring
      </div>
      <div className="sparring-pair-stats">
        <div>
          <div className="sparring-pair-gladiator-name">{a.name}</div>
          <span>Atk {a.stats.attack}</span>
          <span>Str {a.stats.strength}</span>
          <span>Def {a.stats.defence}</span>
          <span>Wpn {a.stats.weaponSkill}</span>
          <span>End {a.stats.endurance}</span>
          <span>Show {a.stats.showmanship}</span>
        </div>
        <div>
          <div className="sparring-pair-gladiator-name">{b.name}</div>
          <span>Atk {b.stats.attack}</span>
          <span>Str {b.stats.strength}</span>
          <span>Def {b.stats.defence}</span>
          <span>Wpn {b.stats.weaponSkill}</span>
          <span>End {b.stats.endurance}</span>
          <span>Show {b.stats.showmanship}</span>
        </div>
      </div>
      <button className="btn small danger-outline" onClick={() => clearSparring(a.id)}>
        Stop Sparring
      </button>
    </Card>
  );
}

function SparPicker({ gladiator, candidates }: { gladiator: Gladiator; candidates: Gladiator[] }) {
  const { setSparringPair } = useGame();
  const [partnerId, setPartnerId] = useState("");

  if (candidates.length === 0) return null;

  return (
    <div className="spar-picker">
      <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
        <option value="">Spar with...</option>
        {candidates.map((c) => (
          <option value={c.id} key={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        className="btn small"
        disabled={!partnerId}
        onClick={() => {
          if (partnerId) setSparringPair(gladiator.id, partnerId);
          setPartnerId("");
        }}
      >
        Start Sparring
      </button>
    </div>
  );
}

export function TrainingScreen() {
  const { state, hireStaff, dismissStaff } = useGame();
  const activeGladiators = state.gladiators.filter((g) => g.status === "active");
  const byId = new Map(activeGladiators.map((g) => [g.id, g]));

  const pairedIds = new Set<string>();
  const pairs: [Gladiator, Gladiator][] = [];
  for (const g of activeGladiators) {
    if (pairedIds.has(g.id) || !g.sparringPartnerId) continue;
    const partner = byId.get(g.sparringPartnerId);
    if (!partner || partner.sparringPartnerId !== g.id) continue;
    pairs.push([g, partner]);
    pairedIds.add(g.id);
    pairedIds.add(partner.id);
  }
  const soloGladiators = activeGladiators.filter((g) => !pairedIds.has(g.id));

  return (
    <div className="screen">
      <h2>Training</h2>

      <div className="training-block">
        <h3>Sparring Pairs</h3>
        <p className="hint">
          Pairing two gladiators drops their individual focus for a shared session. Both still train normally, but
          there is a small chance one picks up a trait from the other, and sparring carries its own injury risk.
        </p>
        {pairs.length === 0 && <p className="empty-note">No one is currently paired up.</p>}
        <div className="sparring-pair-grid">
          {pairs.map(([a, b]) => (
            <SparringPairCard a={a} b={b} key={a.id} />
          ))}
        </div>
      </div>

      <div className="training-block">
        <h3>Focus Assignments</h3>
        <div className="training-table">
          {soloGladiators.map((g) => (
            <Card key={g.id} className="training-row">
              <div className="training-row-name">{g.name}</div>
              <SoloFocusRow gladiator={g} />
              <SparPicker gladiator={g} candidates={soloGladiators.filter((c) => c.id !== g.id)} />
            </Card>
          ))}
          {soloGladiators.length === 0 && <p className="empty-note">Everyone is either paired up or unavailable.</p>}
        </div>
      </div>

      <div className="training-block">
        <h3>Hired Staff</h3>
        {state.staff.length === 0 && <p className="empty-note">No trainers or doctors hired yet.</p>}
        <div className="staff-grid">
          {state.staff.map((s) => (
            <Card key={s.id}>
              <div className="staff-card-header">
                <span className="staff-name">{s.name}</span>
                <span className="staff-role">{staffRoleLabel(s.role, TRAINING_FOCUS_LABELS[s.specialty ?? "balanced"])}</span>
              </div>
              <p className="hint staff-role-desc">{staffRoleDescription(s.role, TRAINING_FOCUS_LABELS[s.specialty ?? "balanced"])}</p>
              {s.role === "trainer" && (
                <p className="hint">Covers: {trainerCoveredStats(s).map((stat) => TRAINING_FOCUS_LABELS[stat]).join(", ")}</p>
              )}
              <StarRating value={displayedStaffStars(s, state.reputation)} />
              <div className="staff-salary">{s.weeklySalary}g per week</div>
              <button className="btn small danger-outline" onClick={() => dismissStaff(s.id)}>Dismiss</button>
            </Card>
          ))}
        </div>
      </div>

      <div className="training-block">
        <h3>Available to Hire</h3>
        <p className="hint">
          A rating is only a guess until your ludus earns enough reputation to judge talent properly. Watch results over time to see who is worth keeping.
        </p>
        <div className="staff-grid">
          {state.staffPool.map((c) => (
            <Card key={c.id}>
              <div className="staff-card-header">
                <span className="staff-name">{c.staff.name}</span>
                <span className="staff-role">{staffRoleLabel(c.staff.role, TRAINING_FOCUS_LABELS[c.staff.specialty ?? "balanced"])}</span>
              </div>
              <p className="hint staff-role-desc">{staffRoleDescription(c.staff.role, TRAINING_FOCUS_LABELS[c.staff.specialty ?? "balanced"])}</p>
              {c.staff.role === "trainer" && (
                <p className="hint">Covers: {trainerCoveredStats(c.staff).map((stat) => TRAINING_FOCUS_LABELS[stat]).join(", ")}</p>
              )}
              <Tooltip text="This rating is fuzzy at low reputation and sharpens as your ludus grows more respected.">
                <StarRating value={displayedStaffStars(c.staff, state.reputation)} />
              </Tooltip>
              <div className="staff-salary">{c.staff.weeklySalary}g per week if hired</div>
              <button
                className="btn primary small"
                disabled={state.gold < c.hireCost}
                onClick={() => hireStaff(c.id)}
              >
                Hire for {c.hireCost}g
              </button>
            </Card>
          ))}
          {state.staffPool.length === 0 && <p className="empty-note">No one looking for work right now.</p>}
        </div>
      </div>
    </div>
  );
}
