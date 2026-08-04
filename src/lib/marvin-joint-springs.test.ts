import { describe, expect, it } from "vitest";

import {
  createJointSpring,
  snapJointSpring,
  stepJointSpring,
  type JointSpringTier,
} from "./marvin-joint-springs";

function simulate(tier: JointSpringTier, seconds: number, target = 1) {
  const spring = createJointSpring(0);
  let peak = 0;
  for (let i = 0; i < seconds * 60; i += 1) {
    stepJointSpring(spring, target, tier, 1 / 60);
    peak = Math.max(peak, spring.value);
  }
  return { spring, peak };
}

describe("Marvin joint springs", () => {
  it("converges to the target for every tier", () => {
    for (const tier of ["proximal", "distal", "rootTilt"] as const) {
      const { spring } = simulate(tier, 2);
      expect(spring.value).toBeCloseTo(1, 2);
      expect(Math.abs(spring.velocity)).toBeLessThan(0.05);
    }
  });

  it("overshoots slightly like suspension, never wildly", () => {
    const distal = simulate("distal", 2);
    const proximal = simulate("proximal", 2);
    // Distal joints lag and overshoot more than proximal ones.
    expect(distal.peak).toBeGreaterThan(1.02);
    expect(distal.peak).toBeLessThan(1.35);
    expect(proximal.peak).toBeLessThan(distal.peak + 0.001);
  });

  it("stays stable across a stalled frame", () => {
    const spring = createJointSpring(0);
    stepJointSpring(spring, 1, "distal", 3);
    expect(Number.isFinite(spring.value)).toBe(true);
    expect(spring.value).toBeGreaterThan(0.9);
    expect(spring.value).toBeLessThan(1.1);
  });

  it("snaps without residual velocity", () => {
    const spring = createJointSpring(0);
    stepJointSpring(spring, 1, "proximal", 0.1);
    snapJointSpring(spring, 0.5);
    expect(spring.value).toBe(0.5);
    expect(spring.velocity).toBe(0);
  });
});
