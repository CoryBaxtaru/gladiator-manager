import type { ReactNode } from "react";
import type { Gladiator, GladiatorCondition, GladiatorStats, Origin, PersonalityTrait, PhysicalTrait, RivalGladiator } from "../types";
import { currentAbilityStars, currentAbilityOf, fuzzyPotentialStars, potentialStarLabel, statIndicators, type StatIndicator } from "../engine/rating";
import { TRAITS, PHYSICAL_TRAITS, PERSONALITY_TRAIT_UNLOCK } from "../config";
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
}

/** Hover-triggered popup with the same summary info as the Squad detail view: portrait,
 * CA/PA stars, attributes, traits, and a bio snippet. Works for both the player's own
 * gladiators and rival gladiators once their identity is known. */
export function GladiatorHoverCard({ data, reputation, children }: Props) {
  const potentialStars = fuzzyPotentialStars(data.potentialAbility, data.potentialNoiseSeed, reputation, data.potentialRevealed);

  return (
    <span className="hover-card-wrap">
      {children}
      <div className="hover-card-popup card">
        <div className="hover-card-header">
          <GladiatorPortrait name={data.name} origin={data.origin} condition={data.condition ?? "healthy"} size={44} />
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
