import { describe, expect, it } from "vitest";

import {
  MARVIN_INTRO_DURATION_MS,
  MARVIN_MOVES,
  createMarvinIntroPlan,
  pickMarvinMove,
} from "./marvin-motion";

describe("Marvin intro motion", () => {
  it("progresses through grapple, braking, landing, and online phases", () => {
    const plan = createMarvinIntroPlan(false);

    expect(plan.map((step) => step.phase)).toEqual([
      "grappling",
      "braking",
      "landing",
      "online",
    ]);
    expect(plan[0].at).toBe(0);
    expect(plan.at(-1)?.at).toBe(MARVIN_INTRO_DURATION_MS);
    expect(plan.every((step, index) => index === 0 || step.at > plan[index - 1].at)).toBe(true);
  });

  it("settles immediately when reduced motion is requested", () => {
    expect(createMarvinIntroPlan(true)).toEqual([{ phase: "online", at: 0 }]);
  });

  it("includes the new grapple and authored dance moves in the surprise rotation", () => {
    expect(MARVIN_MOVES).toEqual(expect.arrayContaining(["grapple", "moonwalk", "victory"]));
    expect(pickMarvinMove(0)).toBe(MARVIN_MOVES[0]);
    expect(pickMarvinMove(0.999)).toBe(MARVIN_MOVES.at(-1));
  });
});
