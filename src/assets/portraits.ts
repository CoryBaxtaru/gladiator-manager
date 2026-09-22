// Placeholder art lookup layer. Nothing here draws real art yet: it hands back a
// color and initial keyed by origin and condition so the UI has something to show.
// When real sprites exist, swap the implementation of getPortrait to return image
// paths (ideally keyed by gladiator id, falling back to this archetype lookup for
// anyone without bespoke art) without touching any calling component.
import type { GladiatorCondition, Origin } from "../types";

const ORIGIN_COLORS: Record<Origin, string> = {
  Thracian: "#7a3b2e",
  Gaul: "#3b5c3f",
  Nubian: "#4a3b6b",
  Roman: "#8a2f2f",
  Numidian: "#6b5122",
  Germanic: "#2f4f5c",
  Syrian: "#7a5a2b",
  Greek: "#2e5f6b",
};

const CONDITION_BORDER: Record<GladiatorCondition, string> = {
  healthy: "#5a9e5a",
  bruised: "#c9a227",
  injured: "#c0392b",
  gravely_injured: "#7a1f1f",
};

export interface PortraitDescriptor {
  initial: string;
  baseColor: string;
  borderColor: string;
}

export function getPortrait(name: string, origin: Origin, condition: GladiatorCondition): PortraitDescriptor {
  return {
    initial: name.charAt(0).toUpperCase(),
    baseColor: ORIGIN_COLORS[origin],
    borderColor: CONDITION_BORDER[condition],
  };
}
