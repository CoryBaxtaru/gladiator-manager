import { useGame } from "../state/GameContext";
import { reputationToStars, currentAbilityOf } from "../engine/rating";
import { RIVALRY } from "../config";
import { StarRating } from "./StarRating";
import { Badge } from "./Badge";

interface RankRow {
  id: string;
  name: string;
  reputation: number;
  facilityLevel: number;
  rosterStrength: number;
  isPlayer: boolean;
  record: { wins: number; losses: number } | null;
}

export function LudiRankingsScreen() {
  const { state } = useGame();

  const activeCount = state.gladiators.filter((g) => g.status === "active").length;
  const avgCA = activeCount > 0
    ? Math.round(state.gladiators.filter((g) => g.status === "active").reduce((sum, g) => sum + currentAbilityOf(g), 0) / activeCount)
    : 0;
  const playerFacility = Math.round(
    Object.values(state.buildings).reduce((sum, b) => sum + b.level, 0) / Object.values(state.buildings).length
  );

  const rows: RankRow[] = [
    {
      id: "player",
      name: state.ludusName,
      reputation: state.reputation,
      facilityLevel: Math.max(1, playerFacility),
      rosterStrength: avgCA,
      isPlayer: true,
      record: null,
    },
    ...state.rivalLudi.map((l) => ({
      id: l.id,
      name: l.name,
      reputation: l.reputation,
      facilityLevel: l.facilityLevel,
      rosterStrength: Math.round(l.roster.reduce((sum, g) => sum + g.currentAbility, 0) / Math.max(1, l.roster.length)),
      isPlayer: false,
      record: l.record,
    })),
  ].sort((a, b) => b.reputation - a.reputation);

  return (
    <div className="screen">
      <h2>Ludi Rankings</h2>
      <p className="hint">Roster strength and facility quality are shown coarsely, the same way you'd size up a rival from the outside.</p>
      <div className="rankings-table-scroll">
      <table className="rankings-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Ludus</th>
            <th>Reputation</th>
            <th>Roster</th>
            <th>Facilities</th>
            <th>Record</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className={row.isPlayer ? "rankings-player-row" : ""}>
              <td>{i + 1}</td>
              <td>{row.name}</td>
              <td><StarRating value={reputationToStars(row.reputation)} size="sm" /></td>
              <td>{rosterBand(row.rosterStrength)}</td>
              <td><StarRating value={row.facilityLevel} size="sm" /></td>
              <td>
                {row.record && (row.record.wins > 0 || row.record.losses > 0) ? (
                  <span className="rivalry-record">
                    {row.record.wins}-{row.record.losses}
                    {row.record.losses >= RIVALRY.noticeThresholds[0] && row.record.losses > row.record.wins && (
                      <Badge tone="danger" title={`${row.name} has beaten you ${row.record.losses} times.`}>
                        Bitter Rival
                      </Badge>
                    )}
                  </span>
                ) : (
                  <span className="hint">--</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function rosterBand(avgCA: number): string {
  if (avgCA >= 70) return "Elite";
  if (avgCA >= 50) return "Strong";
  if (avgCA >= 30) return "Solid";
  if (avgCA >= 15) return "Green";
  return "Untested";
}
