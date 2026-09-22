import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  tone?: "neutral" | "gold" | "success" | "danger" | "warning";
  className?: string;
  title?: string;
}

/**
 * One visual treatment for every small tag/badge in the app: personality
 * traits, condition tags, hot streak, fight outcome, recruitment channel.
 * Only the tone (color) should vary between uses.
 */
export function Badge({ children, tone = "neutral", className, title }: BadgeProps) {
  return (
    <span className={`badge badge-${tone} ${className ?? ""}`} title={title}>
      {children}
    </span>
  );
}
