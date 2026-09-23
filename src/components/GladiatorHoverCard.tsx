import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { Gladiator, GladiatorCondition, GladiatorStats, Origin, PersonalityTrait, PhysicalTrait, RivalGladiator } from "../types";
import { currentAbilityStars, currentAbilityOf, fuzzyPotentialStars, potentialStarLabel, statIndicators, type StatIndicator } from "../engine/rating";
import { TRAITS, PHYSICAL_TRAITS, PERSONALITY_TRAIT_UNLOCK } from "../config";
import { usePointerCanHover } from "../hooks/usePointerCanHover";
import { StarRating } from "./StarRating";
import { GladiatorPortrait } from "./GladiatorPortrait";
import { Badge } from "./Badge";

export interface HoverCardData {
  name: string;
  origin: Origin;
  currentAbility: number;
  potentialAbility: number;
  potentialNoiseSeed: number;
  potentialRevealed: boolean;
  stats: GladiatorStats;
  physicalTrait: PhysicalTrait;
  personalityTraits: PersonalityTrait[];
  statIndicators: Partial<Record<keyof GladiatorStats, StatIndicator>>;
  backstory: string;
  condition?: GladiatorCondition;
  /** age/wins progress toward the first personality trait, only set when still blank */
  personalityProgress?: { age: number; wins: number };
}

export function hoverDataFromGladiator(g: Gladiator): HoverCardData {
  return {
    name: g.name,
    origin: g.origin,
    currentAbility: currentAbilityOf(g),
    potentialAbility: g.potentialAbility,
    potentialNoiseSeed: g.potentialNoiseSeed ?? 0,
    potentialRevealed: g.potentialRevealed === "exact",
    stats: g.stats,
    physicalTrait: g.physicalTrait,
    personalityTraits: g.personalityTraits,
    statIndicators: statIndicators(g),
    backstory: g.backstory,
    condition: g.condition,
    personalityProgress: g.personalityTraits.length === 0 ? { age: g.age, wins: g.record.wins } : undefined,
  };
}

export function hoverDataFromRival(r: RivalGladiator): HoverCardData {
  return {
    name: r.name,
    origin: r.origin,
    currentAbility: r.currentAbility,
    potentialAbility: r.potentialAbility,
    potentialNoiseSeed: r.potentialNoiseSeed,
    potentialRevealed: false,
    stats: r.stats,
    physicalTrait: r.physicalTrait,
    personalityTraits: r.personalityTraits,
    // Rivals store already-effective stats (see rivalLudi.ts) with no separate base
    // to diff against, so no boost/penalty markers to show here.
    statIndicators: {},
    backstory: r.backstory,
  };
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "...";
}

interface Props {
  data: HoverCardData;
  reputation: number;
  children: ReactNode;
  /** Extra class(es) on the trigger wrapper -- the wrapper is inline-flex and sizes to
   * its trigger content by default, so a trigger that's meant to fill/center within a
   * wider parent (see the Promotion screen's Champion card) needs this to override. */
  triggerClassName?: string;
}

/**
 * Hover-triggered popup with the same summary info as the Squad detail view: portrait,
 * CA/PA stars, attributes, traits, and a bio snippet. Works for both the player's own
 * gladiators and rival gladiators once their identity is known.
 *
 * On a touch device there's no hover, so the popup would otherwise be unreachable --
 * below we add a tap-to-toggle path gated on usePointerCanHover(). Desktop/mouse users
 * are unaffected: canHover is true there, so this state is never touched and the
 * existing pure-CSS :hover/:focus-within behavior (see .hover-card-wrap in App.css)
 * still does all the work.
 */
export function GladiatorHoverCard({ data, reputation, children, triggerClassName }: Props) {
  const potentialStars = fuzzyPotentialStars(data.potentialAbility, data.potentialNoiseSeed, reputation, data.potentialRevealed);
  const canHover = usePointerCanHover();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canHover || !open) return;
    function handleOutside(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [canHover, open]);

  // Phase 10 Part E: the popup's default position (centered under/over the trigger)
  // has no awareness of the viewport's edges, so a trigger near the side or top of the
  // window renders it partially or fully off-screen -- the reported "bugged most of
  // the time" symptom. Clamped here in JS (measured at the moment it opens) rather
  // than in CSS, since CSS alone can't know the trigger's position on the page.
  //
  // The popup is `position: fixed` (see .hover-card-popup in App.css) specifically so
  // it's computed in plain viewport pixels here, not relative to the trigger's own
  // box -- an absolutely-positioned popup, even while invisible, still counted toward
  // the scrollable overflow of any scrolling ancestor (e.g. the Fight Day list),
  // silently inflating its scrollHeight and pushing real rows out of view.
  const reposition = () => {
    const wrap = wrapRef.current;
    const popup = popupRef.current;
    if (!wrap || !popup) return;
    const margin = 8;
    const wrapRect = wrap.getBoundingClientRect();
    const popupWidth = popup.offsetWidth || 220;
    const popupHeight = popup.offsetHeight;

    const spaceAbove = wrapRect.top;
    const spaceBelow = window.innerHeight - wrapRect.bottom;
    const placeBelow = spaceAbove < popupHeight + margin && spaceBelow > spaceAbove;
    const top = placeBelow ? wrapRect.bottom + margin : wrapRect.top - margin - popupHeight;

    let left = wrapRect.left + wrapRect.width / 2 - popupWidth / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin));

    popup.style.top = `${Math.max(margin, top)}px`;
    popup.style.left = `${left}px`;
  };

  useEffect(() => {
    if (open) reposition();
  }, [open]);

  // Being `position: fixed` now, the popup no longer scrolls along with its trigger
  // (see .hover-card-popup in App.css) -- keep it tracking while a scroll happens
  // during either an open touch tap or a live desktop hover, capture:true so this
  // also catches scrolling inside a nested list like the Fight Day modal's.
  useEffect(() => {
    function handleScroll() {
      if (open || wrapRef.current?.matches(":hover")) reposition();
    }
    document.addEventListener("scroll", handleScroll, true);
    return () => document.removeEventListener("scroll", handleScroll, true);
  }, [open]);

  const handleTriggerClick = (e: MouseEvent<HTMLSpanElement>) => {
    if (canHover) return;
    // Let an actual control inside the trigger (a selection checkbox, a
    // Challenge/Preview button) handle its own tap rather than also toggling the
    // info popup as a side effect.
    if ((e.target as HTMLElement).closest("button, input, a, select, textarea")) return;
    setOpen((o) => !o);
  };

  return (
    <span
      className={`hover-card-wrap ${triggerClassName ?? ""} ${open ? "hover-card-open" : ""}`}
      ref={wrapRef}
      onClick={handleTriggerClick}
      onMouseEnter={reposition}
      onFocus={reposition}
    >
      {children}
      <div className="hover-card-popup card" ref={popupRef}>
        <div className="hover-card-header">
          <GladiatorPortrait name={data.name} origin={data.origin} condition={data.condition ?? "healthy"} size={84} variant="full" />
          <div>
            <div className="hover-card-name">{data.name}</div>
            <div className="hover-card-origin">{data.origin}</div>
          </div>
        </div>
        <div className="hover-card-stars">
          <span>CA <StarRating value={currentAbilityStars(data.currentAbility)} size="sm" /></span>
          <span>PA <StarRating value={potentialStars} size="sm" /></span>
        </div>
        <div className="hover-card-label">{potentialStarLabel(potentialStars)}</div>
        <div className="hover-card-attrs">
          <span>Str {data.stats.strength}{data.statIndicators.strength && <span className={`stat-indicator stat-indicator-${data.statIndicators.strength}`}>{data.statIndicators.strength === "boost" ? "▲" : "▼"}</span>}</span>
          <span>Wpn {data.stats.weaponSkill}{data.statIndicators.weaponSkill && <span className={`stat-indicator stat-indicator-${data.statIndicators.weaponSkill}`}>{data.statIndicators.weaponSkill === "boost" ? "▲" : "▼"}</span>}</span>
          <span>End {data.stats.endurance}{data.statIndicators.endurance && <span className={`stat-indicator stat-indicator-${data.statIndicators.endurance}`}>{data.statIndicators.endurance === "boost" ? "▲" : "▼"}</span>}</span>
          <span>Show {data.stats.showmanship}{data.statIndicators.showmanship && <span className={`stat-indicator stat-indicator-${data.statIndicators.showmanship}`}>{data.statIndicators.showmanship === "boost" ? "▲" : "▼"}</span>}</span>
        </div>
        <div className="hover-card-traits">
          <Badge tone="neutral" title={PHYSICAL_TRAITS[data.physicalTrait].description}>{data.physicalTrait}</Badge>
          {data.personalityTraits.map((t) => (
            <Badge tone="gold" key={t} title={TRAITS[t].description}>{t}</Badge>
          ))}
          {data.personalityProgress && (
            <Badge
              tone="neutral"
              title={
                data.personalityProgress.age <= PERSONALITY_TRAIT_UNLOCK.youngAgeMax
                  ? "Too young to have developed a personality yet."
                  : `First trait after ${PERSONALITY_TRAIT_UNLOCK.firstSlotWinMilestone} career wins (${data.personalityProgress.wins}/${PERSONALITY_TRAIT_UNLOCK.firstSlotWinMilestone}).`
              }
            >
              No personality yet
            </Badge>
          )}
        </div>
        <p className="hover-card-bio">{truncate(data.backstory, 100)}</p>
      </div>
    </span>
  );
}
