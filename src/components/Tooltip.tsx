import type { ReactNode } from "react";

interface TooltipProps {
  text: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ text, children, className }: TooltipProps) {
  return (
    <span className={`tooltip-wrap ${className ?? ""}`}>
      {children}
      <span className="tooltip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}
