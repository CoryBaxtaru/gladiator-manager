import { useState } from "react";
import { useGame } from "../state/GameContext";
import { BUILDING_DEFAULTS, LOAN } from "../config";
import { loanAmount } from "../engine/loan";
import type { BuildingId, SponsorshipCollateral } from "../types";

const BUILDING_ORDER: BuildingId[] = ["training_yard", "barracks", "infirmary", "armory", "arena", "quarters", "gate"];

/**
 * Seeking sponsorship requires picking what's on the line before the gold ever
 * changes hands: a specific building (loses a level if it goes unresolved too long)
 * or a cut of future fight purses redirected to the sponsor until it's repaid. See
 * engine/loan.ts -- this is what replaced the old flat reputation penalty.
 */
export function SponsorshipModal({ onClose }: { onClose: () => void }) {
  const { state, takeLoan } = useGame();
  const [collateral, setCollateral] = useState<SponsorshipCollateral>({ type: "purseCut" });
  const amount = loanAmount(state);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal sponsorship-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Seek Sponsorship</h2>
        <p className="hint">
          A patron will advance {amount}g against the ludus's reputation, right now. Interest accrues weekly, and
          gold is garnished toward it automatically whenever the ludus is in the black. But a sponsor wants
          collateral: pick what's on the line before you take the money. If the debt goes unresolved too long, the
          consequence lands on whatever you chose here, not a flat number that eventually costs nothing.
        </p>

        <div className="collateral-options">
          <div
            className={`card collateral-option ${collateral.type === "purseCut" ? "card-selected" : ""}`}
            onClick={() => setCollateral({ type: "purseCut" })}
          >
            <h4>A Cut of Future Purses</h4>
            <p className="hint">
              If the sponsorship goes unresolved too long, the sponsor starts taking a share of every fight purse
              until it's repaid, starting at {Math.round(LOAN.purseCutStartFraction * 100)}% and climbing the longer
              it's ignored. Costs more the more the ludus fights.
            </p>
          </div>

          <div
            className={`card collateral-option ${collateral.type === "building" ? "card-selected" : ""}`}
            onClick={() =>
              setCollateral((prev) =>
                prev.type === "building" ? prev : { type: "building", buildingId: BUILDING_ORDER[0] }
              )
            }
          >
            <h4>A Building</h4>
            <p className="hint">
              If the sponsorship goes unresolved too long, the building put up loses a level, repeatedly if it stays
              unresolved. Costs whatever that building was doing for the ludus.
            </p>
            {collateral.type === "building" && (
              <div className="collateral-building-picker">
                {BUILDING_ORDER.map((id) => {
                  const def = BUILDING_DEFAULTS[id];
                  const level = state.buildings[id].level;
                  return (
                    <button
                      key={id}
                      className={`btn small ${collateral.buildingId === id ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCollateral({ type: "building", buildingId: id });
                      }}
                    >
                      {def.label} (lvl {level})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="confirm-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            onClick={() => {
              takeLoan(collateral);
              onClose();
            }}
          >
            Take {amount}g
          </button>
        </div>
      </div>
    </div>
  );
}
