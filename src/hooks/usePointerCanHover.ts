import { useEffect, useState } from "react";

/**
 * True when the device's primary pointer can hover with fine precision (mouse,
 * trackpad). False on touch-only devices, where CSS :hover/:focus-within never
 * fire and anything gated behind them (the gladiator hover card, trait tooltips)
 * is otherwise unreachable. Used to switch those to a tap-to-show interaction
 * without changing anything for desktop/mouse users.
 */
export function usePointerCanHover(): boolean {
  const query = "(hover: hover) and (pointer: fine)";
  const [canHover, setCanHover] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : true));

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = () => setCanHover(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return canHover;
}
