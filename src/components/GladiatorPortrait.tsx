import type { GladiatorCondition, Origin } from "../types";
import { getPortraitSrc, getHeadshotSrc } from "../assets/portraits";

interface GladiatorPortraitProps {
  name: string;
  origin: Origin;
  condition: GladiatorCondition;
  /** Square size in px. Omit (along with width/height) to let `className` size the
   * box entirely via CSS instead -- e.g. a fluid, non-square trading-card frame. */
  size?: number;
  /** Overrides `size` per-dimension for a fixed-px non-square box. Prefer sizing via
   * `className` instead when the box needs to be fluid (a %-width grid card, etc). */
  width?: number;
  height?: number;
  /**
   * "full" (default) shows the whole square full-body sprite as-is: Roster
   * detail/bio, hover cards, Promotion, Fight Day and Challenge selection all have
   * room for the full figure. "headshot" is for the compact Roster list row: a
   * separate, purpose-composed head-and-shoulders portrait (not a CSS crop of the
   * full-body image), see getHeadshotSrc.
   */
  variant?: "full" | "headshot";
  /** Extra class(es) on the wrapper -- e.g. to size/crop (object-fit: cover) a "full"
   * portrait into a non-square frame instead of the default letterboxed contain. */
  className?: string;
}

export function GladiatorPortrait({ name, origin, condition, size, width, height, variant = "full", className }: GladiatorPortraitProps) {
  const src = variant === "headshot" ? getHeadshotSrc(origin, condition) : getPortraitSrc(origin, condition);
  const w = width ?? size;
  const h = height ?? size;
  const style = w !== undefined || h !== undefined ? { width: w, height: h } : undefined;
  return (
    <div
      className={`gladiator-portrait ${variant === "headshot" ? "gladiator-portrait-headshot" : "gladiator-portrait-full"} ${className ?? ""}`}
      style={style}
    >
      <img src={src} alt={name} className="gladiator-portrait-img" />
    </div>
  );
}
