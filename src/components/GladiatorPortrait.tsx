import type { GladiatorCondition, Origin } from "../types";
import { getPortraitSrc, getHeadshotSrc } from "../assets/portraits";

interface GladiatorPortraitProps {
  name: string;
  origin: Origin;
  condition: GladiatorCondition;
  size?: number;
  /**
   * "full" (default) shows the whole square full-body sprite as-is: Roster
   * detail/bio, hover cards, Promotion, Fight Day and Challenge selection all have
   * room for the full figure. "headshot" is for the compact Roster list row: a
   * separate, purpose-composed head-and-shoulders portrait (not a CSS crop of the
   * full-body image), see getHeadshotSrc.
   */
  variant?: "full" | "headshot";
}

export function GladiatorPortrait({ name, origin, condition, size = 48, variant = "full" }: GladiatorPortraitProps) {
  const src = variant === "headshot" ? getHeadshotSrc(origin, condition) : getPortraitSrc(origin, condition);
  return (
    <div
      className={`gladiator-portrait ${variant === "headshot" ? "gladiator-portrait-headshot" : "gladiator-portrait-full"}`}
      style={{ width: size, height: size }}
    >
      <img src={src} alt={name} className="gladiator-portrait-img" />
    </div>
  );
}
