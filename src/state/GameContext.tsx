import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { BuildingId, DaySummary, DeathMatchOutcome, LudusState, PromotionOutcome, RecruitChannel, RecruiterTier, RivalLudus, SaleType, SponsorshipCollateral, TrainingFocus, WeaponType } from "../types";
import { createInitialState } from "./initialState";
import { advanceDay as engineAdvanceDay } from "../engine/tick";
import { withMilestones } from "../engine/milestones";
import { queueUpgrade as engineQueueUpgrade, sellBuildingLevel as engineSellBuildingLevel } from "../engine/buildings";
import { takeLoan as engineTakeLoan } from "../engine/loan";
import {
  recruitGladiator as engineRecruitGladiator,
  passRecruitCandidate as enginePassRecruitCandidate,
  sellOnCandidate as engineSellOnCandidate,
  sendRecruiter as engineSendRecruiter,
} from "../engine/scouting";
import { matchmakeFightDay, eligibleForFightDay } from "../engine/fightday";
import { computeNextFightDay } from "../engine/fightday";
import { sellGladiator as engineSellGladiator } from "../engine/sale";
import { hireStaff as engineHireStaff, dismissStaff as engineDismissStaff, retireGladiatorToStaff as engineRetireGladiatorToStaff } from "../engine/staff";
import {
  triggerMoraleEvent as engineTriggerMoraleEvent,
  performRitual as enginePerformRitual,
  giveBonusCut as engineGiveBonusCut,
  boastPride as engineBoastPride,
  giveEncouragement as engineGiveEncouragement,
  giveLeave as engineGiveLeave,
  visitBaths as engineVisitBaths,
  givePublicRecognition as engineGivePublicRecognition,
} from "../engine/moodActions";
import { payForDoctorVisit as enginePayForDoctorVisit, setWeaponType as engineSetWeaponType } from "../engine/training";
import { setSparringPair as engineSetSparringPair, clearSparring as engineClearSparring } from "../engine/sparring";
import {
  eligibleChallengeTargets as engineEligibleChallengeTargets,
  issueChallenge as engineIssueChallenge,
  respondToChallenge as engineRespondToChallenge,
  resolveSelfChallenge as engineResolveSelfChallenge,
  drawSelfChallengeOpponent as engineDrawSelfChallengeOpponent,
} from "../engine/deathMatch";
import { resolvePromotionFight as engineResolvePromotionFight } from "../engine/promotion";
import { resolveFateDecision as engineResolveFateDecision } from "../engine/combat";
import { resolvePraetorianFinale as engineResolvePraetorianFinale, type PraetorianFinaleOutcome } from "../engine/colosseumFinale";
import {
  loadAutosave,
  saveAutosave,
  clearAutosave,
  saveToSlot,
  loadFromSlot,
  deleteSlot,
  listSaveSlots,
  type SaveSlotMeta,
} from "./saveManager";

interface InitialLoad {
  state: LudusState;
  /** True only when no autosave existed at all -- a genuine first launch, not a
   * reload of an existing game (Phase 12 Part N). */
  isFirstLaunch: boolean;
}

function loadInitial(): InitialLoad {
  const saved = loadAutosave();
  return saved ? { state: saved, isFirstLaunch: false } : { state: createInitialState(), isFirstLaunch: true };
}

interface GameContextValue {
  state: LudusState;
  latestSummaries: DaySummary[];
  clearLatestSummaries: () => void;
  pendingFightDay: boolean;
  advanceDay: () => void;
  advanceToNextFight: () => void;
  resolveFightDay: (selectedGladiatorIds: string[]) => void;
  eligibleFighters: () => ReturnType<typeof eligibleForFightDay>;
  queueBuildingUpgrade: (buildingId: BuildingId) => void;
  sellBuildingLevel: (buildingId: BuildingId) => void;
  takeLoan: (collateral: SponsorshipCollateral) => void;
  setTrainingFocus: (gladiatorId: string, focus: TrainingFocus) => void;
  setWeaponType: (gladiatorId: string, weaponType: WeaponType) => void;
  retireGladiator: (gladiatorId: string) => void;
  recruit: (candidateId: string) => void;
  passCandidate: (candidateId: string) => void;
  sellOnCandidate: (candidateId: string) => void;
  sendRecruiter: (channel: RecruitChannel, tier: RecruiterTier) => void;
  setSparringPair: (gladiatorAId: string, gladiatorBId: string) => void;
  clearSparring: (gladiatorId: string) => void;
  sellGladiator: (gladiatorId: string, saleType: SaleType) => void;
  auctionResult: { gladiatorName: string; price: number } | null;
  clearAuctionResult: () => void;
  hireStaff: (candidateId: string) => void;
  dismissStaff: (staffId: string) => void;
  triggerMoraleEvent: (gladiatorId: string) => void;
  performRitual: (gladiatorId: string) => void;
  giveBonusCut: (gladiatorId: string) => void;
  boastPride: (gladiatorId: string) => void;
  giveEncouragement: (gladiatorId: string) => void;
  giveLeave: (gladiatorId: string) => void;
  visitBaths: (gladiatorId: string) => void;
  givePublicRecognition: (gladiatorId: string) => void;
  payForDoctorVisit: (gladiatorId: string) => void;
  eligibleChallengeTargets: () => RivalLudus[];
  issueChallenge: (rivalLudusId: string, gladiatorId: string) => void;
  respondToChallenge: (accept: boolean, gladiatorId?: string) => void;
  issueSelfChallenge: (gladiatorId: string) => void;
  previewSelfChallenge: (gladiatorId: string) => void;
  deathMatchOutcome: DeathMatchOutcome | null;
  clearDeathMatchOutcome: () => void;
  attemptPromotion: (gladiatorId: string) => void;
  promotionOutcome: PromotionOutcome | null;
  clearPromotionOutcome: () => void;
  resolveFateDecision: (gladiatorId: string, sponsor: boolean) => void;
  resolvePraetorianFinale: (selectedGladiatorIds: string[]) => void;
  praetorianFinaleOutcome: PraetorianFinaleOutcome | null;
  clearPraetorianFinaleOutcome: () => void;
  newGame: (ludusName: string, founderName?: string) => void;
  isFirstLaunch: boolean;
  completeFounding: (founderName: string, ludusName: string) => void;
  saveGame: (slot: number) => void;
  loadGame: (slot: number) => void;
  deleteSave: (slot: number) => void;
  saveSlots: () => (SaveSlotMeta | null)[];
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [initial] = useState(loadInitial);
  const [state, setStateRaw] = useState<LudusState>(initial.state);
  // Phase 16 Part C: every state-mutating action in this file goes through this one
  // wrapper (a drop-in replacement for useState's own setter, same call shapes) so the
  // permanent milestone log stays populated no matter which of the many engine call
  // sites caused a death/escape/retirement/promotion/bankruptcy/technique unlock --
  // see engine/milestones.ts's withMilestones for the diff itself.
  const setState = useCallback((updater: LudusState | ((prev: LudusState) => LudusState)) => {
    setStateRaw((prev) => {
      const next = typeof updater === "function" ? (updater as (p: LudusState) => LudusState)(prev) : updater;
      return next === prev ? next : withMilestones(prev, next);
    });
  }, []);
  // Phase 12 Part N: on a genuine first launch (no autosave found at all), the shell
  // shows a blocking FoundingModal so the player can pick their own founder/ludus name
  // instead of one being silently generated. Cleared for good once they submit it or
  // once any other new game starts.
  const [isFirstLaunch, setIsFirstLaunch] = useState(initial.isFirstLaunch);
  const [latestSummaries, setLatestSummaries] = useState<DaySummary[]>([]);
  const [pendingFightDay, setPendingFightDay] = useState(false);
  const [pendingIntermediateSummaries, setPendingIntermediateSummaries] = useState<DaySummary[]>([]);

  useEffect(() => {
    saveAutosave(state);
  }, [state]);

  // These three read `state` from the closure and compute their result once, then
  // commit with plain setState(value) calls rather than functional updaters. The
  // engine calls here use Math.random() and generate ids from Date.now(), so they
  // are not pure: passing them to a setState updater is unsafe, since React (in
  // StrictMode especially) may invoke an updater more than once, which would
  // simulate the same day twice with different random outcomes and desync the
  // displayed summary from the committed gladiator state.
  const advanceDay = useCallback(() => {
    if (state.currentDay + 1 === state.nextFightDay) {
      setPendingFightDay(true);
      setPendingIntermediateSummaries([]);
      return;
    }
    const { state: next, summary } = engineAdvanceDay(state);
    setState(next);
    setLatestSummaries([summary]);
  }, [state, setState]);

  const advanceToNextFight = useCallback(() => {
    let working = state;
    const collected: DaySummary[] = [];
    while (working.currentDay + 1 < working.nextFightDay) {
      const { state: next, summary } = engineAdvanceDay(working);
      working = next;
      collected.push(summary);
    }
    setState(working);
    setPendingIntermediateSummaries(collected);
    setPendingFightDay(true);
  }, [state, setState]);

  const resolveFightDay = useCallback(
    (selectedGladiatorIds: string[]) => {
      const matchups = matchmakeFightDay(state, selectedGladiatorIds);
      const { state: next, summary } = engineAdvanceDay(state, matchups);
      const withNextFightDay = { ...next, nextFightDay: computeNextFightDay(next.currentDay) };
      setState(withNextFightDay);
      setLatestSummaries([...pendingIntermediateSummaries, summary]);
      setPendingIntermediateSummaries([]);
      setPendingFightDay(false);
    },
    [state, pendingIntermediateSummaries, setState]
  );

  const eligibleFighters = useCallback(() => eligibleForFightDay(state.gladiators), [state.gladiators]);

  const clearLatestSummaries = useCallback(() => setLatestSummaries([]), []);

  const queueBuildingUpgrade = useCallback((buildingId: BuildingId) => {
    setState((prev) => engineQueueUpgrade(prev, buildingId));
  }, [setState]);

  const sellBuildingLevel = useCallback((buildingId: BuildingId) => {
    setState((prev) => engineSellBuildingLevel(prev, buildingId));
  }, [setState]);

  const takeLoan = useCallback((collateral: SponsorshipCollateral) => {
    setState((prev) => engineTakeLoan(prev, collateral));
  }, [setState]);

  const setTrainingFocus = useCallback((gladiatorId: string, focus: TrainingFocus) => {
    setState((prev) => ({
      ...prev,
      gladiators: prev.gladiators.map((g) =>
        g.id === gladiatorId ? { ...g, trainingFocus: focus } : g
      ),
    }));
  }, [setState]);

  const setWeaponType = useCallback((gladiatorId: string, weaponType: WeaponType) => {
    setState((prev) => engineSetWeaponType(prev, gladiatorId, weaponType));
  }, [setState]);

  const retireGladiator = useCallback((gladiatorId: string) => {
    setState((prev) => engineRetireGladiatorToStaff(prev, gladiatorId));
  }, [setState]);

  const recruit = useCallback((candidateId: string) => {
    setState((prev) => engineRecruitGladiator(prev, candidateId));
  }, [setState]);

  const passCandidate = useCallback((candidateId: string) => {
    setState((prev) => enginePassRecruitCandidate(prev, candidateId));
  }, [setState]);

  const sellOnCandidate = useCallback((candidateId: string) => {
    setState((prev) => engineSellOnCandidate(prev, candidateId));
  }, [setState]);

  const sendRecruiter = useCallback((channel: RecruitChannel, tier: RecruiterTier) => {
    setState((prev) => engineSendRecruiter(prev, channel, tier));
  }, [setState]);

  const setSparringPair = useCallback((gladiatorAId: string, gladiatorBId: string) => {
    setState((prev) => engineSetSparringPair(prev, gladiatorAId, gladiatorBId));
  }, [setState]);

  const clearSparring = useCallback((gladiatorId: string) => {
    setState((prev) => engineClearSparring(prev, gladiatorId));
  }, [setState]);

  const [auctionResult, setAuctionResult] = useState<{ gladiatorName: string; price: number } | null>(null);
  const clearAuctionResult = useCallback(() => setAuctionResult(null), []);

  // Auction pricing uses Math.random() (see sale.ts), so read state from the closure
  // and commit once, same reasoning as advanceDay above.
  const sellGladiator = useCallback(
    (gladiatorId: string, saleType: SaleType) => {
      const gladiator = state.gladiators.find((g) => g.id === gladiatorId);
      const result = engineSellGladiator(state, gladiatorId, saleType);
      setState(result.state);
      if (result.auctionPrice !== null && gladiator) {
        setAuctionResult({ gladiatorName: gladiator.name, price: result.auctionPrice });
      }
    },
    [state, setState]
  );

  const hireStaff = useCallback((candidateId: string) => {
    setState((prev) => engineHireStaff(prev, candidateId));
  }, [setState]);

  const dismissStaff = useCallback((staffId: string) => {
    setState((prev) => engineDismissStaff(prev, staffId));
  }, [setState]);

  const triggerMoraleEvent = useCallback((gladiatorId: string) => {
    setState((prev) => engineTriggerMoraleEvent(prev, gladiatorId));
  }, [setState]);

  const performRitual = useCallback((gladiatorId: string) => {
    setState((prev) => enginePerformRitual(prev, gladiatorId));
  }, [setState]);

  const giveBonusCut = useCallback((gladiatorId: string) => {
    setState((prev) => engineGiveBonusCut(prev, gladiatorId));
  }, [setState]);

  const boastPride = useCallback((gladiatorId: string) => {
    setState((prev) => engineBoastPride(prev, gladiatorId));
  }, [setState]);

  const giveEncouragement = useCallback((gladiatorId: string) => {
    setState((prev) => engineGiveEncouragement(prev, gladiatorId));
  }, [setState]);

  const giveLeave = useCallback((gladiatorId: string) => {
    setState((prev) => engineGiveLeave(prev, gladiatorId));
  }, [setState]);

  const visitBaths = useCallback((gladiatorId: string) => {
    setState((prev) => engineVisitBaths(prev, gladiatorId));
  }, [setState]);

  const givePublicRecognition = useCallback((gladiatorId: string) => {
    setState((prev) => engineGivePublicRecognition(prev, gladiatorId));
  }, [setState]);

  const payForDoctorVisit = useCallback((gladiatorId: string) => {
    setState((prev) => enginePayForDoctorVisit(prev, gladiatorId));
  }, [setState]);

  const [deathMatchOutcome, setDeathMatchOutcome] = useState<DeathMatchOutcome | null>(null);
  const clearDeathMatchOutcome = useCallback(() => setDeathMatchOutcome(null), []);

  const eligibleChallengeTargets = useCallback(() => engineEligibleChallengeTargets(state), [state]);

  const issueChallenge = useCallback(
    (rivalLudusId: string, gladiatorId: string) => {
      const result = engineIssueChallenge(state, rivalLudusId, gladiatorId);
      if (!result) return;
      setState(result.state);
      setDeathMatchOutcome(result.outcome);
    },
    [state, setState]
  );

  const respondToChallenge = useCallback(
    (accept: boolean, gladiatorId?: string) => {
      const result = engineRespondToChallenge(state, accept, gladiatorId);
      setState(result.state);
      if (result.outcome) setDeathMatchOutcome(result.outcome);
    },
    [state, setState]
  );

  const issueSelfChallenge = useCallback(
    (gladiatorId: string) => {
      const result = engineResolveSelfChallenge(state, gladiatorId);
      if (!result) return;
      setState(result.state);
      setDeathMatchOutcome(result.outcome);
    },
    [state, setState]
  );

  // Phase 13 Part B: generates (and locks in) today's self-challenge opponent the
  // first time it's requested for a gladiator; a later call the same day is a no-op
  // (drawSelfChallengeOpponent returns the same state reference). Uses Math.random()
  // on a fresh draw, so read state from the closure and commit once, same reasoning
  // as every other randomness-using action here.
  const previewSelfChallenge = useCallback(
    (gladiatorId: string) => {
      const result = engineDrawSelfChallengeOpponent(state, gladiatorId);
      if (result.state !== state) setState(result.state);
    },
    [state, setState]
  );

  const resolveFateDecision = useCallback(
    (gladiatorId: string, sponsor: boolean) => {
      setState((prev) => engineResolveFateDecision(prev, gladiatorId, sponsor));
    },
    [setState]
  );

  const [praetorianFinaleOutcome, setPraetorianFinaleOutcome] = useState<PraetorianFinaleOutcome | null>(null);
  const clearPraetorianFinaleOutcome = useCallback(() => setPraetorianFinaleOutcome(null), []);

  const resolvePraetorianFinale = useCallback(
    (selectedGladiatorIds: string[]) => {
      const result = engineResolvePraetorianFinale(state, selectedGladiatorIds);
      if (!result) return;
      setState(result.state);
      setPraetorianFinaleOutcome(result.outcome);
    },
    [state, setState]
  );

  const [promotionOutcome, setPromotionOutcome] = useState<PromotionOutcome | null>(null);
  const clearPromotionOutcome = useCallback(() => setPromotionOutcome(null), []);

  // Uses Math.random() via resolveFight, so read state from the closure and commit a
  // plain value once, same reasoning as advanceDay/issueChallenge above.
  const attemptPromotion = useCallback(
    (gladiatorId: string) => {
      const result = engineResolvePromotionFight(state, gladiatorId, state.currentDay);
      if (!result) return;
      setState(result.state);
      setPromotionOutcome(result.outcome);
    },
    [state, setState]
  );

  const newGame = useCallback((ludusName: string, founderName?: string) => {
    clearAutosave();
    setState(createInitialState(ludusName, founderName));
    setIsFirstLaunch(false);
    setLatestSummaries([]);
    setPendingFightDay(false);
    setPendingIntermediateSummaries([]);
  }, [setState]);

  // Phase 12 Part N: applies the player's chosen names to the auto-generated first-
  // launch state in place, rather than regenerating a whole new game (which would
  // reroll the starting roster the player has already seen).
  const completeFounding = useCallback((founderName: string, ludusName: string) => {
    setState((prev) => ({
      ...prev,
      founderName: founderName.trim() || prev.founderName,
      ludusName: ludusName.trim() || prev.ludusName,
    }));
    setIsFirstLaunch(false);
  }, [setState]);

  const saveGame = useCallback(
    (slot: number) => {
      saveToSlot(slot, state);
    },
    [state]
  );

  const loadGame = useCallback((slot: number) => {
    const loaded = loadFromSlot(slot);
    if (!loaded) return;
    setState(loaded);
    setIsFirstLaunch(false);
    setLatestSummaries([]);
    setPendingFightDay(false);
    setPendingIntermediateSummaries([]);
  }, [setState]);

  const deleteSave = useCallback((slot: number) => {
    deleteSlot(slot);
  }, []);

  const saveSlots = useCallback(() => listSaveSlots(), []);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      latestSummaries,
      clearLatestSummaries,
      pendingFightDay,
      advanceDay,
      advanceToNextFight,
      resolveFightDay,
      eligibleFighters,
      queueBuildingUpgrade,
      sellBuildingLevel,
      takeLoan,
      setTrainingFocus,
      setWeaponType,
      retireGladiator,
      recruit,
      passCandidate,
      sellOnCandidate,
      sendRecruiter,
      setSparringPair,
      clearSparring,
      sellGladiator,
      auctionResult,
      clearAuctionResult,
      hireStaff,
      dismissStaff,
      triggerMoraleEvent,
      performRitual,
      giveBonusCut,
      boastPride,
      giveEncouragement,
      giveLeave,
      visitBaths,
      givePublicRecognition,
      payForDoctorVisit,
      eligibleChallengeTargets,
      issueChallenge,
      respondToChallenge,
      issueSelfChallenge,
      previewSelfChallenge,
      deathMatchOutcome,
      clearDeathMatchOutcome,
      attemptPromotion,
      promotionOutcome,
      clearPromotionOutcome,
      resolveFateDecision,
      resolvePraetorianFinale,
      praetorianFinaleOutcome,
      clearPraetorianFinaleOutcome,
      newGame,
      isFirstLaunch,
      completeFounding,
      saveGame,
      loadGame,
      deleteSave,
      saveSlots,
    }),
    [
      state,
      latestSummaries,
      clearLatestSummaries,
      pendingFightDay,
      advanceDay,
      advanceToNextFight,
      resolveFightDay,
      eligibleFighters,
      queueBuildingUpgrade,
      sellBuildingLevel,
      takeLoan,
      setTrainingFocus,
      setWeaponType,
      retireGladiator,
      recruit,
      passCandidate,
      sellOnCandidate,
      sendRecruiter,
      setSparringPair,
      clearSparring,
      sellGladiator,
      auctionResult,
      clearAuctionResult,
      hireStaff,
      dismissStaff,
      triggerMoraleEvent,
      performRitual,
      giveBonusCut,
      boastPride,
      giveEncouragement,
      giveLeave,
      visitBaths,
      givePublicRecognition,
      payForDoctorVisit,
      eligibleChallengeTargets,
      issueChallenge,
      respondToChallenge,
      issueSelfChallenge,
      previewSelfChallenge,
      deathMatchOutcome,
      clearDeathMatchOutcome,
      attemptPromotion,
      promotionOutcome,
      clearPromotionOutcome,
      resolveFateDecision,
      resolvePraetorianFinale,
      praetorianFinaleOutcome,
      clearPraetorianFinaleOutcome,
      newGame,
      isFirstLaunch,
      completeFounding,
      saveGame,
      loadGame,
      deleteSave,
      saveSlots,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
