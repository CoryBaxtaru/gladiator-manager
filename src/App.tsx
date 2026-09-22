import { useState } from "react";
import "./App.css";
import { GameProvider, useGame } from "./state/GameContext";
import { TopBar } from "./components/TopBar";
import { LudusScreen } from "./components/LudusScreen";
import { SquadScreen } from "./components/SquadScreen";
import { TrainingScreen } from "./components/TrainingScreen";
import { RecruitmentScreen } from "./components/RecruitmentScreen";
import { LudiRankingsScreen } from "./components/LudiRankingsScreen";
import { ChallengesScreen } from "./components/ChallengesScreen";
import { HistoryScreen } from "./components/HistoryScreen";
import { PromotionScreen } from "./components/PromotionScreen";
import { SummaryModal } from "./components/SummaryModal";
import { FightDaySelectionModal } from "./components/FightDaySelectionModal";
import { IncomingChallengeModal } from "./components/IncomingChallengeModal";
import { DeathMatchResultModal } from "./components/DeathMatchResultModal";
import { PromotionResultModal } from "./components/PromotionResultModal";
import { promotionAvailable } from "./engine/promotion";

type Tab = "squad" | "training" | "ludus" | "recruitment" | "rankings" | "challenges" | "history" | "promotion";

function GameShell() {
  const [tab, setTab] = useState<Tab>("squad");
  const { state, latestSummaries, pendingFightDay, deathMatchOutcome, promotionOutcome } = useGame();

  return (
    <div className="app-shell">
      <TopBar />
      <nav className="tab-bar">
        <button className={`tab-btn ${tab === "squad" ? "active" : ""}`} onClick={() => setTab("squad")}>
          Roster
        </button>
        <button className={`tab-btn ${tab === "training" ? "active" : ""}`} onClick={() => setTab("training")}>
          Training
        </button>
        <button className={`tab-btn ${tab === "ludus" ? "active" : ""}`} onClick={() => setTab("ludus")}>
          Ludus
        </button>
        <button className={`tab-btn ${tab === "recruitment" ? "active" : ""}`} onClick={() => setTab("recruitment")}>
          Recruitment
        </button>
        <button className={`tab-btn ${tab === "rankings" ? "active" : ""}`} onClick={() => setTab("rankings")}>
          Rankings
        </button>
        <button className={`tab-btn ${tab === "challenges" ? "active" : ""}`} onClick={() => setTab("challenges")}>
          Challenges
        </button>
        <button className={`tab-btn ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
          History
        </button>
        <button className={`tab-btn ${tab === "promotion" ? "active" : ""} ${promotionAvailable(state) ? "tab-btn-alert" : ""}`} onClick={() => setTab("promotion")}>
          Promotion
        </button>
      </nav>
      <main className="app-main">
        {tab === "squad" && <SquadScreen />}
        {tab === "training" && <TrainingScreen />}
        {tab === "ludus" && <LudusScreen />}
        {tab === "recruitment" && <RecruitmentScreen />}
        {tab === "rankings" && <LudiRankingsScreen />}
        {tab === "challenges" && <ChallengesScreen />}
        {tab === "history" && <HistoryScreen />}
        {tab === "promotion" && <PromotionScreen />}
      </main>
      {pendingFightDay ? (
        <FightDaySelectionModal />
      ) : promotionOutcome ? (
        <PromotionResultModal />
      ) : deathMatchOutcome ? (
        <DeathMatchResultModal />
      ) : state.pendingDeathMatchChallenge ? (
        <IncomingChallengeModal />
      ) : (
        latestSummaries.length > 0 && <SummaryModal summaries={latestSummaries} />
      )}
    </div>
  );
}

function App() {
  return (
    <GameProvider>
      <GameShell />
    </GameProvider>
  );
}

export default App;
