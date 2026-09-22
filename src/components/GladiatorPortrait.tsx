import type { GladiatorCondition, Origin } from "../types";
import { getPortrait } from "../assets/portraits";

interface GladiatorPortraitProps {
  name: string;
  origin: Origin;
  condition: GladiatorCondition;
  size?: number;
}

export function GladiatorPortrait({ name, origin, condition, size = 48 }: GladiatorPortraitProps) {
  const { initial, baseColor, borderColor } = getPortrait(name, origin, condition);
  return (
    <div
      className="gladiator-portrait"
      style={{
        width: size,
        height: size,
        background: baseColor,
        borderColor,
        fontSize: size * 0.45,
      }}
    >
      {initial}
    </div>
  );
}
