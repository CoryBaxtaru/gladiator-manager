import { useGame } from "../state/GameContext";

export function AuctionResultModal() {
  const { auctionResult, clearAuctionResult } = useGame();
  if (!auctionResult) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal confirm-modal">
        <h3>Auction Result</h3>
        <p>
          {auctionResult.gladiatorName} sold at auction for <strong>{auctionResult.price}g</strong>.
        </p>
        <div className="confirm-actions">
          <button className="btn primary" onClick={clearAuctionResult}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
