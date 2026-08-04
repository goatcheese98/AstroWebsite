export type MarvinIntroPhase = "grappling" | "braking" | "landing" | "online";
export type MarvinMove =
  | "right-arm"
  | "left-arm"
  | "left-leg"
  | "right-leg"
  | "head-bang"
  | "dance"
  | "jump"
  | "floss"
  | "orange-justice"
  | "hype"
  | "sprinkler"
  | "shuffle"
  | "grapple"
  | "moonwalk"
  | "victory";

export interface MarvinIntroStep {
  phase: MarvinIntroPhase;
  at: number;
}

export const MARVIN_INTRO_DURATION_MS = 2600;

export const MARVIN_MOVES: readonly MarvinMove[] = [
  "right-arm",
  "left-arm",
  "left-leg",
  "right-leg",
  "head-bang",
  "dance",
  "jump",
  "floss",
  "orange-justice",
  "hype",
  "sprinkler",
  "shuffle",
  "grapple",
  "moonwalk",
  "victory",
];

const MARVIN_INTRO_PLAN: readonly MarvinIntroStep[] = [
  { phase: "grappling", at: 0 },
  { phase: "braking", at: 1120 },
  { phase: "landing", at: 1880 },
  { phase: "online", at: MARVIN_INTRO_DURATION_MS },
];

export function createMarvinIntroPlan(reducedMotion: boolean): MarvinIntroStep[] {
  if (reducedMotion) {
    return [{ phase: "online", at: 0 }];
  }

  return MARVIN_INTRO_PLAN.map((step) => ({ ...step }));
}

export function pickMarvinMove(randomValue = Math.random()): MarvinMove {
  const normalizedValue = Math.max(0, Math.min(0.999999, randomValue));
  return MARVIN_MOVES[Math.floor(normalizedValue * MARVIN_MOVES.length)];
}
