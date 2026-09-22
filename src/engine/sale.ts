import type { LudusState, SaleType } from "../types";
import { SALE } from "../config";
import { currentAbilityOf } from "./rating";

export function instantSalePrice(currentAbility: number): number {
  return Math.round(currentAbility * SALE.instantPriceMultiplierOfCA);
}

/**
 * Sells a gladiator. Only "instant" is implemented. "auction" is a stub extension point
 * for a future market event where the sale price is decided at a later date rather than
 * paid out immediately.
 */
export function sellGladiator(state: LudusState, gladiatorId: string, saleType: SaleType): LudusState {
  const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
  if (!gladiator) return state;

  switch (saleType) {
    case "instant": {
      const price = instantSalePrice(currentAbilityOf(gladiator));
      return {
        ...state,
        gold: state.gold + price,
        gladiators: state.gladiators.map((g) =>
          g.id === gladiatorId ? { ...g, status: "sold" as const } : g
        ),
      };
    }
    case "auction":
      // Not implemented yet. Intended to list the gladiator for a future market
      // event instead of paying out immediately.
      return state;
    default:
      return state;
  }
}
