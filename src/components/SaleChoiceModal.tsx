import { useState } from "react";
import type { Gladiator, SaleType } from "../types";
import { useGame } from "../state/GameContext";
import { instantSalePrice, auctionSalePriceRange } from "../engine/sale";
import { currentAbilityOf } from "../engine/rating";
import { ConfirmDialog } from "./ConfirmDialog";
import { Card } from "./Card";

/**
 * Phase 12 Part H: "Bring to Auction" alongside the existing guaranteed instant sale --
 * both options presented clearly at the point of sale so the player understands which
 * is the sure thing and which is the gamble.
 */
export function SaleChoiceModal({ gladiator, onClose }: { gladiator: Gladiator; onClose: () => void }) {
  const { sellGladiator } = useGame();
  const [confirming, setConfirming] = useState<SaleType | null>(null);

  const ca = currentAbilityOf(gladiator);
  const instant = instantSalePrice(ca);
  const range = auctionSalePriceRange(ca);

  if (confirming) {
    return (
      <ConfirmDialog
        title={confirming === "instant" ? "Sell instantly?" : "Bring to auction?"}
        message={
          confirming === "instant"
            ? `Sell ${gladiator.name} right now for a guaranteed ${instant}g. This cannot be undone.`
            : `Send ${gladiator.name} to auction for somewhere between ${range.min}g and ${range.max}g -- a gamble, could pay out more than an instant sale, could pay out less. This cannot be undone.`
        }
        confirmLabel={confirming === "instant" ? "Sell Instantly" : "Send to Auction"}
        onConfirm={() => {
          sellGladiator(gladiator.id, confirming);
          onClose();
        }}
        onCancel={() => setConfirming(null)}
      />
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Sell {gladiator.name}?</h3>
        <p className="hint">This cannot be undone. Choose how to sell him.</p>
        <div className="sale-choice-grid">
          <Card>
            <h4>Instant Sale</h4>
            <p className="hint">Guaranteed. Paid immediately, no risk.</p>
            <div className="card-row">
              <span>Price</span>
              <span>{instant}g</span>
            </div>
            <button className="btn primary" onClick={() => setConfirming("instant")}>
              Sell Instantly
            </button>
          </Card>
          <Card>
            <h4>Bring to Auction</h4>
            <p className="hint">A gamble. Real risk in both directions around the instant-sale value.</p>
            <div className="card-row">
              <span>Range</span>
              <span>{range.min}g - {range.max}g</span>
            </div>
            <button className="btn danger-outline" onClick={() => setConfirming("auction")}>
              Send to Auction
            </button>
          </Card>
        </div>
        <div className="confirm-actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
