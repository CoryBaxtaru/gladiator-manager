import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePointerCanHover } from "../hooks/usePointerCanHover";

interface TooltipProps {
  text: string;
  children: ReactNode;
  className?: string;
}

const VIEWPORT_MARGIN = 8;

/**
 * Touch devices have no hover, so the trigger toggles the bubble on tap and a tap
 * elsewhere dismisses it; mouse users get pure CSS :hover/:focus-within. Either way,
 * once shown the bubble is shifted horizontally to stay inside the viewport -- a
 * trigger near the right edge would otherwise open half off-screen on a phone.
 */
export function Tooltip({ text, children, className }: TooltipProps) {
  const canHover = usePointerCanHover();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const bubbleId = useId();

  useEffect(() => {
    if (canHover || !open) return;
    function handleOutside(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [canHover, open]);

  function keepInViewport() {
    requestAnimationFrame(() => {
      const bubble = bubbleRef.current;
      if (!bubble) return;
      bubble.style.setProperty("--tooltip-shift", "0px");
      const rect = bubble.getBoundingClientRect();
      if (rect.width === 0) return;
      const overRight = rect.right - (window.innerWidth - VIEWPORT_MARGIN);
      const overLeft = VIEWPORT_MARGIN - rect.left;
      const shift = overRight > 0 ? -overRight : overLeft > 0 ? overLeft : 0;
      bubble.style.setProperty("--tooltip-shift", `${Math.round(shift)}px`);
    });
  }

  return (
    <span
      className={`tooltip-wrap ${className ?? ""} ${open ? "tooltip-open" : ""}`}
      ref={wrapRef}
      aria-describedby={bubbleId}
      onMouseEnter={keepInViewport}
      onFocus={keepInViewport}
      onClick={
        canHover
          ? undefined
          : () => {
              setOpen((o) => !o);
              keepInViewport();
            }
      }
    >
      {children}
      <span className="tooltip-bubble" role="tooltip" id={bubbleId} ref={bubbleRef}>
        {text}
      </span>
    </span>
  );
}
