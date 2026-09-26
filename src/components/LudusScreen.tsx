import type { BuildingId } from "../types";
import { useGame } from "../state/GameContext";
import { BUILDING_DEFAULTS } from "../config";
import { canQueueUpgrade, upgradeCost, upgradeTime, isOverextended, computeImbalance, canSellLevel, sellRefund } from "../engine/buildings";
import { Card } from "./Card";
import { Badge } from "./Badge";

const BUILDING_ORDER: BuildingId[] = [
  "training_yard", "barracks", "infirmary", "armory", "arena", "quarters", "gate",
];

export function LudusScreen() {
  const { state, queueBuildingUpgrade, sellBuildingLevel } = useGame();
  const overextended = isOverextended(state);
  const imbalance = computeImbalance(state);

  return (
    <div className="screen">
      <h2>The Ludus</h2>

      {state.bankruptcyCount > 0 && (
        <div className="banner warning">
          This ludus has gone bankrupt {state.bankruptcyCount} time{state.bankruptcyCount > 1 ? "s" : ""}. The debt was
          wiped each time, but so was a level off every building shown below.
        </div>
      )}
      {overextended && (
        <div className="banner warning">
          Construction chaos! Too many upgrades started at once, mood decay and training effectiveness are reduced
          until day {state.overextendedUntil}.
        </div>
      )}
      {imbalance.moodDelta < 0 && (
        <div className="banner warning">
          Facilities are badly imbalanced ({imbalance.moodDelta.toFixed(1)} mood/day to all gladiators).
          {imbalance.flavorText.map((t) => (
            <div key={t}>• {t}</div>
          ))}
        </div>
      )}

      <div className="building-grid">
        {BUILDING_ORDER.map((id) => {
          const building = state.buildings[id];
          const def = BUILDING_DEFAULTS[id];
          const cost = upgradeCost(building);
          const time = upgradeTime(building);
          const check = canQueueUpgrade(state, id);
          const queued = state.buildQueue.find((q) => q.buildingId === id);

          return (
            <Card key={id}>
              <div className="building-card-header">
                <h3>{def.label}</h3>
                <Badge tone="gold">Lv {building.level}</Badge>
              </div>
              <p className="building-desc">{def.description}</p>
              {queued ? (
                <div className="building-queue-status">
                  Building to level {queued.targetLevel}, completes day {queued.completesOnDay}
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            ((state.currentDay - queued.startedOnDay) /
                              (queued.completesOnDay - queued.startedOnDay)) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="building-upgrade-info">
                    <span>Upgrade cost: {cost}g</span>
                    <span>Time: {time}d</span>
                  </div>
                  <button
                    className="btn"
                    disabled={!check.ok}
                    onClick={() => queueBuildingUpgrade(id)}
                    title={check.reason}
                  >
                    {check.ok ? `Upgrade to Lv ${building.level + 1}` : check.reason}
                  </button>
                  {canSellLevel(state, id) && (
                    <button
                      className="btn small danger-outline"
                      onClick={() => sellBuildingLevel(id)}
                      title="Refunds part of what this level cost. A deliberate downgrade to survive a cash crunch."
                    >
                      Sell back to Lv {building.level - 1} (+{sellRefund(building)}g)
                    </button>
                  )}
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
