import { useState } from "react";
import { useGame } from "../state/GameContext";
import { REPUTATION_TIER_LABELS, DEBT, BUILDING_DEFAULTS } from "../config";
import { reputationToStars } from "../engine/rating";
import { canTakeLoan, loanAmount } from "../engine/loan";
import { promotionAvailable } from "../engine/promotion";
import { StarRating } from "./StarRating";
import { Badge } from "./Badge";
import { MainMenu } from "./MainMenu";
import { SponsorshipModal } from "./SponsorshipModal";

export function TopBar() {
  const { state, advanceDay, advanceToNextFight, pendingFightDay } = useGame();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sponsorshipOpen, setSponsorshipOpen] = useState(false);
  const currentTierLabel = REPUTATION_TIER_LABELS[state.unlockedTier];
  const inDebt = state.gold < 0;
  const hasLoan = state.loanPrincipal > 0;
  const promotionReady = promotionAvailable(state);

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>Ludus Manager</h1>
        <span className="topbar-founder">{state.ludusName}</span>
      </div>
      <div className="topbar-stats">
        <div className="stat">
          <span className="stat-label">Day</span>
          <span className="stat-value">{state.currentDay}</span>
          <span className="stat-sub">next fight day {state.nextFightDay}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Gold</span>
          <span className={`stat-value gold ${inDebt ? "gold-debt" : ""}`}>{state.gold}g</span>
          {inDebt && (
            <Badge tone={state.debtWeeksActive >= DEBT.severeConsequenceFromWeek ? "danger" : "warning"}>
              Debt, week {state.debtWeeksActive}
            </Badge>
          )}
          {hasLoan ? (
            <Badge
              tone="warning"
              title={
                state.loanCollateral?.type === "building"
                  ? `Interest accrues weekly, gold is garnished automatically while positive. Collateral: ${BUILDING_DEFAULTS[state.loanCollateral.buildingId].label}.`
                  : state.loanPurseCutFraction > 0
                    ? `Interest accrues weekly, gold is garnished automatically while positive. The sponsor also takes ${Math.round(state.loanPurseCutFraction * 100)}% of every fight purse.`
                    : "Interest accrues weekly, gold is garnished automatically while positive. Collateral: a cut of future purses if unresolved too long."
              }
            >
              Sponsor: {state.loanPrincipal}g owed
            </Badge>
          ) : (
            <button
              className="btn small"
              onClick={() => setSponsorshipOpen(true)}
              disabled={!canTakeLoan(state)}
              title="A real sponsorship with real interest, sized by reputation, against real collateral. Only one can be outstanding at a time."
            >
              Seek Sponsorship (+{loanAmount(state)}g)
            </button>
          )}
        </div>
        <div className="stat">
          <span className="stat-label">Reputation</span>
          <StarRating value={reputationToStars(state.reputation)} />
        </div>
        <div className="stat tier-stat">
          <span className="stat-label">Tier</span>
          <span className="stat-value">{currentTierLabel}</span>
          {promotionReady && (
            <Badge tone="gold" title="Reputation has reached the cap for this tier. Visit Promotion when ready to challenge for the next one.">
              Promotion Available
            </Badge>
          )}
        </div>
      </div>
      <div className="topbar-actions">
        <button className="btn primary" onClick={advanceDay} disabled={pendingFightDay}>Advance Day</button>
        <button className="btn primary" onClick={advanceToNextFight} disabled={pendingFightDay}>Advance to Next Fight</button>
        <button className="btn" onClick={() => setMenuOpen(true)}>Menu</button>
      </div>
      {menuOpen && <MainMenu onClose={() => setMenuOpen(false)} />}
      {sponsorshipOpen && <SponsorshipModal onClose={() => setSponsorshipOpen(false)} />}
    </header>
  );
}
