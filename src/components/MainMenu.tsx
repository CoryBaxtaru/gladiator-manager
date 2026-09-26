import { useState } from "react";
import { useGame } from "../state/GameContext";
import { ConfirmDialog } from "./ConfirmDialog";
import { clearAllSaveData } from "../state/saveManager";
import { generateLudusName, generateRomanCitizenName } from "../engine/names";

type MenuView = "root" | "save" | "load" | "settings";

export function MainMenu({ onClose }: { onClose: () => void }) {
  const { state, newGame, saveGame, loadGame, deleteSave, saveSlots } = useGame();
  const [view, setView] = useState<MenuView>("root");
  const [namingNewGame, setNamingNewGame] = useState<string | null>(null);
  const [namingNewGameFounder, setNamingNewGameFounder] = useState("");
  const [confirmingClearData, setConfirmingClearData] = useState(false);
  const [savedFlash, setSavedFlash] = useState<number | null>(null);

  const slots = saveSlots();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal main-menu-modal" onClick={(e) => e.stopPropagation()}>
        {view === "root" && (
          <>
            <h2>Menu</h2>
            <div className="menu-list">
              <button
                className="btn primary"
                onClick={() => {
                  setNamingNewGame(generateLudusName());
                  setNamingNewGameFounder(generateRomanCitizenName({ freedman: true }));
                }}
              >
                New Game
              </button>
              <button className="btn" onClick={() => setView("save")}>Save Game</button>
              <button className="btn" onClick={() => setView("load")}>Load Game</button>
              <button className="btn" onClick={() => setView("settings")}>Settings</button>
              <button className="btn" onClick={onClose}>Resume</button>
            </div>
          </>
        )}

        {view === "save" && (
          <>
            <h2>Save Game</h2>
            <p className="hint">Your progress also autosaves after every action. Use a slot to keep a checkpoint you can return to.</p>
            <div className="save-slot-list">
              {slots.map((slot, i) => {
                const slotNumber = i + 1;
                return (
                  <div className="save-slot-row" key={slotNumber}>
                    <div className="save-slot-info">
                      <strong>Slot {slotNumber}</strong>
                      {slot ? (
                        <span>{slot.ludusName}, day {slot.day}, {slot.gold}g, saved {new Date(slot.savedAt).toLocaleString()}</span>
                      ) : (
                        <span className="empty-note">Empty</span>
                      )}
                    </div>
                    <button
                      className="btn small primary"
                      onClick={() => {
                        saveGame(slotNumber);
                        setSavedFlash(slotNumber);
                        setTimeout(() => setSavedFlash(null), 1500);
                      }}
                    >
                      {savedFlash === slotNumber ? "Saved" : "Save here"}
                    </button>
                  </div>
                );
              })}
            </div>
            <button className="btn" onClick={() => setView("root")}>Back</button>
          </>
        )}

        {view === "load" && (
          <>
            <h2>Load Game</h2>
            <div className="save-slot-list">
              {slots.map((slot, i) => {
                const slotNumber = i + 1;
                return (
                  <div className="save-slot-row" key={slotNumber}>
                    <div className="save-slot-info">
                      <strong>Slot {slotNumber}</strong>
                      {slot ? (
                        <span>{slot.ludusName}, day {slot.day}, {slot.gold}g, saved {new Date(slot.savedAt).toLocaleString()}</span>
                      ) : (
                        <span className="empty-note">Empty</span>
                      )}
                    </div>
                    <div className="save-slot-actions">
                      <button
                        className="btn small primary"
                        disabled={!slot}
                        onClick={() => {
                          loadGame(slotNumber);
                          onClose();
                        }}
                      >
                        Load
                      </button>
                      <button
                        className="btn small danger-outline"
                        disabled={!slot}
                        onClick={() => deleteSave(slotNumber)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="btn" onClick={() => setView("root")}>Back</button>
          </>
        )}

        {view === "settings" && (
          <>
            <h2>Settings</h2>
            <div className="settings-block">
              <p>{state.ludusName}, currently on day {state.currentDay}.</p>
              <button className="btn danger-outline" onClick={() => setConfirmingClearData(true)}>
                Clear all save data
              </button>
            </div>
            <button className="btn" onClick={() => setView("root")}>Back</button>
          </>
        )}
      </div>

      {namingNewGame !== null && (
        <div className="modal-backdrop" onClick={() => setNamingNewGame(null)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Found a new ludus</h3>
            <p>
              This starts a fresh ludus from scratch and erases your current autosaved progress. If you want to keep
              it, save to a numbered slot first.
            </p>
            <label className="field-label" htmlFor="founder-name-input">Your name (the lanista)</label>
            <input
              id="founder-name-input"
              className="text-input"
              type="text"
              value={namingNewGameFounder}
              maxLength={60}
              onChange={(e) => setNamingNewGameFounder(e.target.value)}
              autoFocus
            />
            <label className="field-label" htmlFor="ludus-name-input">Ludus name</label>
            <input
              id="ludus-name-input"
              className="text-input"
              type="text"
              value={namingNewGame}
              maxLength={60}
              onChange={(e) => setNamingNewGame(e.target.value)}
            />
            <div className="confirm-actions">
              <button className="btn" onClick={() => setNamingNewGame(null)}>Cancel</button>
              <button
                className="btn primary"
                disabled={namingNewGame.trim().length === 0 || namingNewGameFounder.trim().length === 0}
                onClick={() => {
                  newGame(namingNewGame.trim(), namingNewGameFounder.trim());
                  setNamingNewGame(null);
                  onClose();
                }}
              >
                Start new game
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmingClearData && (
        <ConfirmDialog
          title="Clear all save data?"
          message="This deletes the autosave and every save slot. This cannot be undone."
          confirmLabel="Clear everything"
          onConfirm={() => {
            clearAllSaveData();
            setConfirmingClearData(false);
          }}
          onCancel={() => setConfirmingClearData(false)}
        />
      )}
    </div>
  );
}
