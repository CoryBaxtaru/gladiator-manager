import type { LudusState, Staff, StaffCandidate, StaffRole, TrainingFocus } from "../types";
import { STAFF, REPUTATION_STAR_SCALE_MAX } from "../config";
import { nextId, pick, randInt, randFloat } from "./rng";

const TRAINER_NAMES = [
  "Gnaeus Rutilus", "Publius Ahenus", "Marcus Cordus", "Titus Vinicius", "Quintus Barbatus",
  "Lucius Ferox", "Sextus Aemilianus", "Decimus Corvus", "Aulus Frugi", "Numerius Bibulus",
];

const DOCTOR_NAMES = [
  "Alexios of Cos", "Democedes the Elder", "Hippasus of Pergamon", "Straton the Physician",
  "Philinos of Rhodes", "Kallias the Bonesetter", "Theron of Halicarnassus", "Menon the Surgeon",
];

const SPECIALTIES: Exclude<TrainingFocus, "balanced" | "rest">[] = [
  "strength", "weaponSkill", "endurance", "showmanship",
];

function generateTrueSkill(): number {
  return randInt(STAFF.trueSkillMin, STAFF.trueSkillMax);
}

function generateNoiseSeed(): number {
  return randFloat(-STAFF.ratingNoiseMax, STAFF.ratingNoiseMax);
}

function nameForRole(role: StaffRole): string {
  return role === "trainer" ? pick(TRAINER_NAMES) : pick(DOCTOR_NAMES);
}

export function generateStaff(role: StaffRole, currentDay: number, specialty?: TrainingFocus): Staff {
  const trueSkill = generateTrueSkill();
  const resolvedSpecialty = role === "trainer" ? (specialty as Exclude<TrainingFocus, "balanced" | "rest">) ?? pick(SPECIALTIES) : null;
  return {
    id: nextId("st"),
    role,
    name: nameForRole(role),
    specialty: resolvedSpecialty,
    trueSkill,
    ratingNoiseSeed: generateNoiseSeed(),
    weeklySalary: Math.round(trueSkill * STAFF.salaryPerSkillPoint),
    hireDay: currentDay,
  };
}

/** Displayed star rating (0.5 to 5), fuzzy at low reputation, converging on the true value as reputation grows. */
export function displayedStaffStars(staff: Staff, reputation: number): number {
  const trueStars = staff.trueSkill / 20;
  const decay = Math.max(0, Math.min(1, 1 - reputation / REPUTATION_STAR_SCALE_MAX));
  const fuzzed = trueStars + staff.ratingNoiseSeed * decay;
  const clamped = Math.max(0.5, Math.min(5, fuzzed));
  return Math.round(clamped * 2) / 2;
}

function rollStaffRole(): StaffRole {
  return Math.random() < 0.6 ? "trainer" : "doctor";
}

export function generateStaffPool(currentDay: number): StaffCandidate[] {
  const pool: StaffCandidate[] = [];
  for (let i = 0; i < STAFF.poolSize; i++) {
    const staff = generateStaff(rollStaffRole(), currentDay);
    const hireCost = Math.round(staff.trueSkill * STAFF.hireCostPerSkillPoint);
    pool.push({ id: nextId("sc"), staff, hireCost });
  }
  return pool;
}

export function maybeRefreshStaffPool(state: LudusState): LudusState {
  if (state.currentDay - state.staffPoolRefreshedOnDay < STAFF.refreshIntervalDays) {
    return state;
  }
  return {
    ...state,
    staffPool: generateStaffPool(state.currentDay),
    staffPoolRefreshedOnDay: state.currentDay,
  };
}

export function hireStaff(state: LudusState, candidateId: string): LudusState {
  const candidate = state.staffPool.find((c) => c.id === candidateId);
  if (!candidate || state.gold < candidate.hireCost) return state;
  return {
    ...state,
    gold: state.gold - candidate.hireCost,
    staff: [...state.staff, candidate.staff],
    staffPool: state.staffPool.filter((c) => c.id !== candidateId),
  };
}

export function dismissStaff(state: LudusState, staffId: string): LudusState {
  return { ...state, staff: state.staff.filter((s) => s.id !== staffId) };
}

export function bestTrainerFor(state: LudusState, focus: TrainingFocus): Staff | null {
  const trainers = state.staff.filter((s) => s.role === "trainer" && s.specialty === focus);
  if (trainers.length === 0) return null;
  return trainers.reduce((best, t) => (t.trueSkill > best.trueSkill ? t : best), trainers[0]);
}

export function bestDoctor(state: LudusState): Staff | null {
  const doctors = state.staff.filter((s) => s.role === "doctor");
  if (doctors.length === 0) return null;
  return doctors.reduce((best, d) => (d.trueSkill > best.trueSkill ? d : best), doctors[0]);
}

export function weeklyStaffSalaries(state: LudusState): number {
  return state.staff.reduce((sum, s) => sum + s.weeklySalary, 0);
}
