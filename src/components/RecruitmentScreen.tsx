import { useState } from "react";
import { useGame } from "../state/GameContext";
import { potentialStarDisplay, currentAbilityStars, currentAbilityOf } from "../engine/rating";
import { recruiterSendCost } from "../engine/scouting";
import { RECRUIT_CHANNELS, RECRUITER_TIERS, TRAITS, PHYSICAL_TRAITS } from "../config";
import type { RecruitChannel, RecruiterTier } from "../types";
import { StarRating } from "./StarRating";
import { Tooltip } from "./Tooltip";
import { GladiatorPortrait } from "./GladiatorPortrait";
import { Card } from "./Card";
import { Badge } from "./Badge";

const CHANNEL_ORDER: RecruitChannel[] = ["slave_market", "auction_house", "volunteer_hall"];
const TIER_ORDER: RecruiterTier[] = ["journeyman", "seasoned", "master"];

export function RecruitmentScreen() {
  const { state, recruit, passCandidate, sellOnCandidate, sendRecruiter } = useGame();
  const [selectedTier, setSelectedTier] = useState<RecruiterTier>("journeyman");

  return (
    <div className="screen">
      <h2>Recruitment</h2>

      {state.recruiterTrip && (
        <div className="banner">
          {state.recruiterTrip.recruiterName} ({RECRUITER_TIERS[state.recruiterTrip.tier].label}) is working the{" "}
          {RECRUIT_CHANNELS[state.recruiterTrip.channel].label}, back on day {state.recruiterTrip.returnsOnDay}.
        </div>
      )}

      {!state.recruiterTrip && (
        <>
          <p className="hint">
            Send a procurator on an expedition. There's always one available to send -- pick a channel for the
            profile of fighter you want, and a tier for how good one turns up. The full cost is paid now; when the
            procurator returns, it's a straight keep-or-release choice on whoever he brings back, no more gold
            changes hands.
          </p>

          <h3>Procurator Tier</h3>
          <div className="recruiter-tier-picker">
            {TIER_ORDER.map((tier) => {
              const cfg = RECRUITER_TIERS[tier];
              return (
                <button
                  key={tier}
                  className={`btn tier-btn ${selectedTier === tier ? "active" : ""}`}
                  onClick={() => setSelectedTier(tier)}
                >
                  <span>{cfg.label}</span>
                  <StarRating value={cfg.stars} size="sm" />
                </button>
              );
            })}
          </div>

          <h3>Channel</h3>
          <div className="channel-grid">
            {CHANNEL_ORDER.map((channel) => {
              const cfg = RECRUIT_CHANNELS[channel];
              const cost = recruiterSendCost(state, channel, selectedTier);
              return (
                <Card key={channel}>
                  <h3>{cfg.label}</h3>
                  <p className="hint">{cfg.description}</p>
                  <div className="card-row"><span>Cost (all-inclusive)</span><span>{cost}g</span></div>
                  <div className="card-row"><span>Duration</span><span>{cfg.tripDurationDays}d</span></div>
                  <div className="card-row"><span>Candidates</span><span>{cfg.batchMin}-{cfg.batchMax}</span></div>
                  <button
                    className="btn primary"
                    disabled={state.gold < cost}
                    onClick={() => sendRecruiter(channel, selectedTier)}
                  >
                    Send {RECRUITER_TIERS[selectedTier].label}
                  </button>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {state.recruitPool.length > 0 && (
        <div className="training-block">
          <h3>Candidates to Review</h3>
          <p className="hint">Already paid for -- keep whoever earns a spot, release the rest.</p>
          <div className="recruit-grid">
            {state.recruitPool.map((c) => {
              const potential = potentialStarDisplay(c.gladiator, state.reputation);
              const cfg = RECRUIT_CHANNELS[c.channel];
              return (
                <Card key={c.id}>
                  <div className="recruit-card-header">
                    <GladiatorPortrait name={c.gladiator.name} origin={c.gladiator.origin} condition="healthy" size={72} variant="full" />
                    <div>
                      <h3>{c.gladiator.name}</h3>
                      <span className="recruit-origin">{c.gladiator.origin}, age {c.gladiator.age}</span>
                    </div>
                  </div>
                  <Badge tone="neutral">{cfg.label}</Badge>
                  <p className="backstory">{c.gladiator.backstory}</p>
                  <div className="trait-list">
                    <Tooltip text={PHYSICAL_TRAITS[c.gladiator.physicalTrait].description}>
                      <Badge tone="neutral">{c.gladiator.physicalTrait}</Badge>
                    </Tooltip>
                    {c.gladiator.personalityTraits.map((t) => (
                      <Tooltip text={TRAITS[t].description} key={t}>
                        <Badge tone="gold">{t}</Badge>
                      </Tooltip>
                    ))}
                  </div>
                  {c.gladiator.record.fights > 0 && (
                    <div className="card-row">
                      <span>Record</span>
                      <span>{c.gladiator.record.wins}-{c.gladiator.record.losses}</span>
                    </div>
                  )}
                  <div className="card-row">
                    <span>Current Ability</span>
                    <StarRating value={currentAbilityStars(currentAbilityOf(c.gladiator))} size="sm" />
                  </div>
                  <div className="card-row">
                    <span>Potential</span>
                    <Tooltip text="A procurator's best guess. Not fully reliable at low reputation.">
                      <span><StarRating value={potential.stars} size="sm" /></span>
                    </Tooltip>
                  </div>
                  <div className="potential-label">{potential.label}</div>
                  <div className="card-row"><span>Weekly Upkeep</span><span>{c.gladiator.weeklyUpkeep}g</span></div>
                  <div className="recruit-card-actions">
                    <button className="btn" onClick={() => passCandidate(c.id)}>Release</button>
                    <Tooltip text="Recoup a portion of what he cost instead of releasing him for nothing.">
                      <button className="btn" onClick={() => sellOnCandidate(c.id)}>Sell Him On ({c.refundValue}g)</button>
                    </Tooltip>
                    <button className="btn primary" onClick={() => recruit(c.id)}>Keep</button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
