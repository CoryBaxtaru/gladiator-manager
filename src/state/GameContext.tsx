import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { BuildingId, DaySummary, DeathMatchOutcome, LudusState, PromotionOutcome, RecruitChannel, RecruiterTier, RivalLudus, SaleType, SponsorshipCollateral, TrainingFocus } from "../types";
import { createInitialState } from "./initialState";
import { advanceDay as engineAdvanceDay } from "../engine/tick";
import { queueUpgrade as engineQueueUpgrade, sellBuildingLevel as engineSellBuildingLevel } from "../engine/buildings";
import { takeLoan as engineTakeLoan } from "../engine/loan";
import {
  recruitGladiator as engineRecruitGladiator,
  passRecruitCandidate as enginePassRecruitCandidate,
  sendRecruiter as engineSendRecruiter,
} from "../engine/scouting";
import { matchmakeFightDay, eligibleForFightDay } from "../engine/fightday";
import { computeNextFightDay } from "../engine/fightday";
import { sellGladiator as engineSellGladiator } from "../engine/sale";
import { hireStaff as engineHireStaff, dismissStaff as engineDismissStaff } from "../engine/staff";
import {
  triggerMoraleEvent as engineTriggerMoraleEvent,
  performRitual as enginePerformRitual,
  giveBonusCut as engineGiveBonusCut,
  boastPride as engineBoastPride,
  giveEncouragement as engineGiveEncouragement,
} from "../engine/moodActions";
import { payForDoctorVisit as enginePayForDoctorVisit } from "../engine/training";
import { setSparringPair as engineSetSparringPair, clearSparring as engineClearSparring } from "../engine/sparring";
import {
  eligibleChallengeTargets as engineEligibleChallengeTargets,
  issueChallenge as engineIssueChallenge,
  respondToChallenge as engineRespondToChallenge,
} from "../engine/deathMatch";
import { resolvePromotionFight as engineResolvePromotionFight } from "../engine/promotion";
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

function loadState(): LudusState {
  const saved = loadAutosave();
  return saved ?? createInitialState();
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
  recruit: (candidateId: string) => void;
  passCandidate: (candidateId: string) => void;
  sendRecruiter: (channel: RecruitChannel, tier: RecruiterTier) => void;
  setSparringPair: (gladiatorAId: string, gladiatorBId: string) => void;
  clearSparring: (gladiatorId: string) => void;
  sellGladiator: (gladiatorId: string, saleType: SaleType) => void;
  hireStaff: (candidateId: string) => void;
  dismissStaff: (staffId: string) => void;
  triggerMoraleEvent: (gladiatorId: string) => void;
  performRitual: (gladiatorId: string) => void;
  giveBonusCut: (gladiatorId: string) => void;
  boastPride: (gladiatorId: string) => void;
  giveEncouragement: (gladiatorId: string) => void;
  payForDoctorVisit: (gladiatorId: string) => void;
  eligibleChallengeTargets: () => RivalLudus[];
  issueChallenge: (rivalLudusId: string, gladiatorId: string) => void;
  respondToChallenge: (accept: boolean, gladiatorId?: string) => void;
  deathMatchOutcome: DeathMatchOutcome | null;
  clearDeathMatchOutcome: () => void;
  attemptPromotion: (gladiatorId: string) => void;
  promotionOutcome: PromotionOutcome | null;
  clearPromotionOutcome: () => void;
  newGame: (ludusName: string) => void;
  saveGame: (slot: number) => void;
  loadGame: (slot: number) => void;
  deleteSave: (slot: number) => void;
  saveSlots: () => (SaveSlotMeta | null)[];
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LudusState>(loadState);
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
  }, [state]);

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
  }, [state]);

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
    [state, pendingIntermediateSummaries]
  );

  const eligibleFighters = useCallback(() => eligibleForFightDay(state.gladiators), [state.gladiators]);

  const clearLatestSummaries = useCallback(() => setLatestSummaries([]), []);

  const queueBuildingUpgrade = useCallback((buildingId: BuildingId) => {
    setState((prev) => engineQueueUpgrade(prev, buildingId));
  }, []);

  const sellBuildingLevel = useCallback((buildingId: BuildingId) => {
    setState((prev) => engineSellBuildingLevel(prev, buildingId));
  }, []);

  const takeLoan = useCallback((collateral: SponsorshipCollateral) => {
    setState((prev) => engineTakeLoan(prev, collateral));
  }, []);

  const setTrainingFocus = useCallback((gladiatorId: string, focus: TrainingFocus) => {
    setState((prev) => ({
      ...prev,
      gladiators: prev.gladiators.map((g) =>
        g.id === gladiatorId ? { ...g, trainingFocus: focus } : g
      ),
    }));
  }, []);

  const recruit = useCallback((candidateId: string) => {
    setState((prev) => engineRecruitGladiator(prev, candidateId));
  }, []);

  const passCandidate = useCallback((candidateId: string) => {
    setState((prev) => enginePassRecruitCandidate(prev, candidateId));
  }, []);

  const sendRecruiter = useCallback((channel: RecruitChannel, tier: RecruiterTier) => {
    setState((prev) => engineSendRecruiter(prev, channel, tier));
  }, []);

  const setSparringPair = useCallback((gladiatorAId: string, gladiatorBId: string) => {
    setState((prev) => engineSetSparringPair(prev, gladiatorAId, gladiatorBId));
  }, []);

  const clearSparring = useCallback((gladiatorId: string) => {
    setState((prev) => engineClearSparring(prev, gladiatorId));
  }, []);

  const sellGladiator = useCallback((gladiatorId: string, saleType: SaleType) => {
    setState((prev) => engineSellGladiator(prev, gladiatorId, saleType));
  }, []);

  const hireStaff = useCallback((candidateId: string) => {
    setState((prev) => engineHireStaff(prev, candidateId));
  }, []);

  const dismissStaff = useCallback((staffId: string) => {
    setState((prev) => engineDismissStaff(prev, staffId));
  }, []);

  const triggerMoraleEvent = useCallback((gladiatorId: string) => {
    setState((prev) => engineTriggerMoraleEvent(prev, gladiatorId));
  }, []);

  const performRitual = useCallback((gladiatorId: string) => {
    setState((prev) => enginePerformRitual(prev, gladiatorId));
  }, []);

  const giveBonusCut = useCallback((gladiatorId: string) => {
    setState((prev) => engineGiveBonusCut(prev, gladiatorId));
  }, []);

  const boastPride = useCallback((gladiatorId: string) => {
    setState((prev) => engineBoastPride(prev, gladiatorId));
  }, []);

  const giveEncouragement = useCallback((gladiatorId: string) => {
    setState((prev) => engineGiveEncouragement(prev, gladiatorId));
  }, []);

  const payForDoctorVisit = useCallback((gladiatorId: string) => {
    setState((prev) => enginePayForDoctorVisit(prev, gladiatorId));
  }, []);

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
    [state]
  );

  const respondToChallenge = useCallback(
    (accept: boolean, gladiatorId?: string) => {
      const result = engineRespondToChallenge(state, accept, gladiatorId);
      setState(result.state);
      if (result.outcome) setDeathMatchOutcome(result.outcome);
    },
    [state]
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
    [state]
  );

  const newGame = useCallback((ludusName: string) => {
    clearAutosave();
    setState(createInitialState(ludusName));
    setLatestSummaries([]);
    setPendingFightDay(false);
    setPendingIntermediateSummaries([]);
  }, []);

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
    setLatestSummaries([]);
    setPendingFightDay(false);
    setPendingIntermediateSummaries([]);
  }, []);

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
      recruit,
      passCandidate,
      sendRecruiter,
      setSparringPair,
      clearSparring,
      sellGladiator,
      hireStaff,
      dismissStaff,
      triggerMoraleEvent,
      performRitual,
      giveBonusCut,
      boastPride,
      giveEncouragement,
      payForDoctorVisit,
      eligibleChallengeTargets,
      issueChallenge,
      respondToChallenge,
      deathMatchOutcome,
      clearDeathMatchOutcome,
      attemptPromotion,
      promotionOutcome,
      clearPromotionOutcome,
      newGame,
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
      recruit,
      passCandidate,
      sendRecruiter,
      setSparringPair,
      clearSparring,
      sellGladiator,
      hireStaff,
      dismissStaff,
      triggerMoraleEvent,
      performRitual,
      giveBonusCut,
      boastPride,
      giveEncouragement,
      payForDoctorVisit,
      eligibleChallengeTargets,
      issueChallenge,
      respondToChallenge,
      deathMatchOutcome,
      clearDeathMatchOutcome,
      attemptPromotion,
      promotionOutcome,
      clearPromotionOutcome,
      newGame,
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
