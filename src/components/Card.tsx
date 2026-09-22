import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Special-case border/background treatments for cards that need to stand out. */
  accent?: "none" | "gold" | "danger" | "success";
  selected?: boolean;
  onClick?: () => void;
}

/**
 * The one card shell used everywhere in the app: squad entries, recruitment
 * candidates, challenge cards, fight result cards, staff cards, sparring pairs.
 * Padding, radius, and shadow come from the shared `card` CSS class so every
 * card-like block in the UI looks like it belongs to the same product.
 */
export function Card({ children, className, accent = "none", selected, onClick }: CardProps) {
  const classes = [
    "card",
    accent !== "none" ? `card-accent-${accent}` : "",
    selected ? "card-selected" : "",
    onClick ? "card-clickable" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (onClick) {
    return (
      <button className={classes} onClick={onClick} type="button">
        {children}
      </button>
    );
  }

  return <div className={classes}>{children}</div>;
}
