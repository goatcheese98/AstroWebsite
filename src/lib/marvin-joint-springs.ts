// Damped springs that sit between the authored pose and the rig, so every
// joint carries a little suspension: proximal joints track tightly while
// distal ones lag and overshoot slightly, like shock absorbers.

export interface JointSpringState {
  value: number;
  velocity: number;
}

export type JointSpringTier = "proximal" | "distal" | "rootTilt";

// Damping ratios sit just under critical so joints settle with one small,
// quick overshoot — suspension, not wobble.
const TIERS: Record<JointSpringTier, { stiffness: number; damping: number }> = {
  proximal: { stiffness: 240, damping: 22 },
  distal: { stiffness: 130, damping: 14 },
  rootTilt: { stiffness: 300, damping: 30 },
};

const MAX_STEP = 1 / 40;

export function createJointSpring(value = 0): JointSpringState {
  return { value, velocity: 0 };
}

export function snapJointSpring(state: JointSpringState, target: number): void {
  state.value = target;
  state.velocity = 0;
}

/** Semi-implicit Euler step, substepped for stability on slow frames. */
export function stepJointSpring(
  state: JointSpringState,
  target: number,
  tier: JointSpringTier,
  deltaSeconds: number,
): number {
  const { stiffness, damping } = TIERS[tier];
  let remaining = Math.min(Math.max(deltaSeconds, 0), 0.25);
  while (remaining > 0) {
    const dt = Math.min(remaining, MAX_STEP);
    remaining -= dt;
    state.velocity += ((target - state.value) * stiffness - state.velocity * damping) * dt;
    state.value += state.velocity * dt;
  }
  return state.value;
}
