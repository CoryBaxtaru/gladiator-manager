// Building illustrations, keyed by BuildingId (Phase 17). Same convention as
// assets/portraits.ts: served unchanged from public/, path built off BASE_URL rather
// than a hardcoded leading slash so a subpath deploy (GitHub Pages) still resolves.
import type { BuildingId } from "../types";

const BASE = import.meta.env.BASE_URL;

const BUILDING_FILE: Record<BuildingId, string> = {
  training_yard: "training_yard",
  barracks: "barracks",
  infirmary: "infirmary",
  armory: "armory",
  arena: "arena",
  quarters: "quarters",
  gate: "gate_and_walls",
};

export function getBuildingSrc(buildingId: BuildingId): string {
  return `${BASE}buildings/${BUILDING_FILE[buildingId]}.png`;
}
