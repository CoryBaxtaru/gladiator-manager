import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePointerCanHover } from "../hooks/usePointerCanHover";

interface TooltipProps {
  text: string;
  children: ReactNode;
  className?: string;
}

/**
 * On a touch device there's no hover, so the bubble would otherwise be unreachable --
 * tap the trigger to toggle it, tap elsewhere to dismiss. Desktop/mouse users are
 * unaffected: canHover is true there, so this state is never touched and the existing
 * pure-CSS :hover/:focus-within behavior still does all the work.
 */
export function Tooltip({ text, children, className }: TooltipProps) {
  const canHover = usePointerCanHover();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (canHover || !open) return;
    function handleOutside(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [canHover, open]);

  return (
    <span
      className={`tooltip-wrap ${className ?? ""} ${open ? "tooltip-open" : ""}`}
      ref={wrapRef}
      onClick={canHover ? undefined : () => setOpen((o) => !o)}
    >
      {children}
      <span className="tooltip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}
