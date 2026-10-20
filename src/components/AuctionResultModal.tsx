import { useGame } from "../state/GameContext";
import { Modal } from "./Modal";

export function AuctionResultModal() {
  const { auctionResult, clearAuctionResult } = useGame();
  if (!auctionResult) return null;

  return (
    <Modal className="confirm-modal" onClose={clearAuctionResult}>
      <h3>Auction Result</h3>
      <p>
        {auctionResult.gladiatorName} sold at auction for <strong>{auctionResult.price}g</strong>.
      </p>
      <div className="confirm-actions">
        <button className="btn primary" onClick={clearAuctionResult}>
          Continue
        </button>
      </div>
    </Modal>
  );
}
