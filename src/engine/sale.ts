import type { LudusState, SaleType } from "../types";
import { SALE } from "../config";
import { currentAbilityOf } from "./rating";
import { randInt } from "./rng";

export function instantSalePrice(currentAbility: number): number {
  return Math.round(currentAbility * SALE.instantPriceMultiplierOfCA);
}

/** The range an auction sale can realize -- real risk in both directions around the
 * guaranteed instant-sale price, shown to the player before they commit. */
export function auctionSalePriceRange(currentAbility: number): { min: number; max: number } {
  const base = instantSalePrice(currentAbility);
  return {
    min: Math.round(base * SALE.auctionMinFraction),
    max: Math.round(base * SALE.auctionMaxFraction),
  };
}

/**
 * Sells a gladiator. "instant" pays the guaranteed price immediately. "auction"
 * (Phase 12 Part H, finally implementing the saleType stubbed out since Phase 2) rolls
 * a randomized price within auctionSalePriceRange -- sometimes more than an instant
 * sale would have paid, sometimes less. Not a pure function of state alone for the
 * auction case (uses Math.random), so -- same convention as advanceDay/issueChallenge
 * in GameContext -- the caller should read state from a stable closure and commit the
 * result once, not pass this into a setState updater that could run twice.
 */
export function sellGladiator(state: LudusState, gladiatorId: string, saleType: SaleType): { state: LudusState; auctionPrice: number | null } {
  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  if (!gladiator) return { state, auctionPrice: null };

  const markSold = (g: LudusState["gladiators"][number]) =>
    g.id === gladiatorId ? { ...g, status: "sold" as const } : g;

  if (saleType === "instant") {
    const price = instantSalePrice(currentAbilityOf(gladiator));
    return {
      state: { ...state, gold: state.gold + price, gladiators: state.gladiators.map(markSold) },
      auctionPrice: null,
    };
  }

  const { min, max } = auctionSalePriceRange(currentAbilityOf(gladiator));
  const price = randInt(min, max);
  return {
    state: { ...state, gold: state.gold + price, gladiators: state.gladiators.map(markSold) },
    auctionPrice: price,
  };
}
