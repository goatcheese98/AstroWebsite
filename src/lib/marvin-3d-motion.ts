export type Marvin3DGrapplePhase = "aim" | "zip" | "landing" | "steps" | "online";
export type Marvin3DAction = "idle" | "wave" | "dance" | "victory";

export interface Marvin3DRootPose {
  x: number;
  y: number;
  z: number;
  rotationZ: number;
  rotationY: number;
  /** Forward pitch, used by the zip lean and landing stumble. */
  rotationX?: number;
}

export interface Marvin3DPose {
  root: Marvin3DRootPose;
  leftShoulderZ: number;
  rightShoulderZ: number;
  leftShoulderX: number;
  rightShoulderX: number;
  leftElbowZ: number;
  rightElbowZ: number;
  leftHipZ: number;
  rightHipZ: number;
  /** Forward/back leg swing for steps; defaults to neutral. */
  leftHipX?: number;
  rightHipX?: number;
  /** Per-leg knee bend added on top of the shared kneeBend. */
  leftKneeExtra?: number;
  rightKneeExtra?: number;
  /** Ankle pitch: positive points the toes, negative flexes the foot flat. */
  leftAnkleX?: number;
  rightAnkleX?: number;
  kneeBend: number;
  /** Waist twist — the torso turns above the waist cylinder. */
  torsoYaw?: number;
  headTiltZ: number;
}

export interface Marvin3DGrapplePose extends Marvin3DPose {
  phase: Marvin3DGrapplePhase;
  cableVisible: boolean;
  cableTension: number;
  /** 0..1 flight of the fired hook from hand to anchor; 1 = attached. */
  cableHookProgress: number;
}

export const MARVIN_3D_GRAPPLE_DURATION = 3.0;
export const MARVIN_3D_ACTION_DURATION = 1.25;
export const MARVIN_3D_IDLE_PERIOD = 5.2;

// The line anchors above the top of the frame, slightly left of the landing
// mark — he starts fully offscreen to the right, fires the hook across the
// top of the frame, and pendulums in from the right edge.
export const MARVIN_3D_CABLE_ANCHOR = { x: 0.4, y: 6.2, z: 1.2 };

// Floor area he lands in and stumbles through; the walk ends on the mark.
export const MARVIN_3D_LANDING_ZONE = { x: 0, z: -0.9, radius: 2.1 };

// Arms hang with a slight outward bend so the settled figure never looks stiff.
const SETTLED_POSE: Marvin3DPose = {
  root: { x: 0, y: 0, z: 0, rotationZ: 0, rotationY: 0 },
  leftShoulderZ: -0.07,
  rightShoulderZ: 0.07,
  leftShoulderX: 0,
  rightShoulderX: 0,
  leftElbowZ: -0.14,
  rightElbowZ: 0.14,
  leftHipZ: 0,
  rightHipZ: 0,
  kneeBend: 0,
  headTiltZ: 0,
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function smoothstep(value: number) {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

// Leg geometry (hip→knee, knee→ankle, flat foot height) used to keep the
// stance foot on the floor while knees bend.
const HIP_SEGMENT = 1.1;
const ANKLE_SEGMENT = 1.06;
const FOOT_HEIGHT = 0.36;
const LEG_LENGTH = HIP_SEGMENT + ANKLE_SEGMENT + FOOT_HEIGHT;

/** How far the pelvis must drop so the stance foot stays planted. */
export function marvinGroundOffset(stanceHipX: number, kneeBend: number, rootPitch = 0): number {
  const upright =
    HIP_SEGMENT * Math.cos(stanceHipX) +
    ANKLE_SEGMENT * Math.cos(stanceHipX + kneeBend) +
    FOOT_HEIGHT;
  return LEG_LENGTH - upright + (1 - Math.cos(rootPitch)) * LEG_LENGTH;
}

/** Ankle counter-rotation that keeps a planted foot flat; past the clamp the
 * heel lifts naturally, like a real deep crouch. */
export function marvinFlatAnkle(rootPitch: number, hipX: number, knee: number): number {
  return Math.max(-0.65, Math.min(0.5, -(rootPitch + hipX + knee)));
}

function settledGrapplePose(): Marvin3DGrapplePose {
  return {
    ...SETTLED_POSE,
    root: { ...SETTLED_POSE.root },
    phase: "online",
    cableVisible: false,
    cableTension: 0,
    cableHookProgress: 0,
  };
}

export function getMarvin3DGrapplePose(
  elapsedSeconds: number,
  reducedMotion: boolean,
): Marvin3DGrapplePose {
  if (reducedMotion || elapsedSeconds >= MARVIN_3D_GRAPPLE_DURATION) {
    return settledGrapplePose();
  }

  const elapsed = Math.max(0, elapsedSeconds);

  // Aim (0–0.45): fully offscreen past the right edge of the frame. The only
  // thing the viewer sees is the grapple: the hook streaks across the top of
  // the frame, bites the anchor, and the line snaps taut.
  if (elapsed < 0.45) {
    const raise = smoothstep(elapsed / 0.2);
    const hookFlight = clamp01((elapsed - 0.1) / 0.22);
    const braced = smoothstep((elapsed - 0.3) / 0.15);
    const crouchKnee = 0.12 + braced * 0.53;
    return {
      ...SETTLED_POSE,
      root: {
        x: 12.5,
        y: -marvinGroundOffset(0, crouchKnee),
        z: -2.6,
        rotationZ: 0,
        rotationY: -0.5,
      },
      leftShoulderZ: lerp(SETTLED_POSE.leftShoulderZ, -2.5, raise),
      leftShoulderX: raise * -0.2,
      leftElbowZ: lerp(SETTLED_POSE.leftElbowZ, -0.1, raise),
      rightShoulderZ: lerp(SETTLED_POSE.rightShoulderZ, 0.3, raise),
      rightShoulderX: raise * 0.25,
      kneeBend: crouchKnee,
      leftAnkleX: marvinFlatAnkle(0, 0, crouchKnee),
      rightAnkleX: marvinFlatAnkle(0, 0, crouchKnee),
      torsoYaw: raise * -0.22,
      headTiltZ: 0.05,
      phase: "aim",
      cableVisible: elapsed >= 0.1,
      cableTension: hookFlight < 1 ? 0.2 : lerp(0.2, 1, braced),
      cableHookProgress: hookFlight,
    };
  }

  // Swing (0.45–1.25): he appears from the very right edge of the frame,
  // pendulums through a low swoop while the line reels in, and is carrying
  // full speed as he crosses toward the mark.
  if (elapsed < 1.25) {
    const raw = clamp01((elapsed - 0.45) / 0.8);
    const swing = smoothstep(raw);
    return {
      ...SETTLED_POSE,
      root: {
        x: lerp(12.5, -0.4, swing),
        y: lerp(-0.22, 1.0, swing) + Math.sin(swing * Math.PI) * 1.2,
        z: lerp(-2.6, -2.0, swing),
        rotationX: swing * 0.14,
        rotationZ: Math.sin(swing * Math.PI) * 0.3,
        rotationY: lerp(-0.5, 0.15, swing),
      },
      leftShoulderZ: lerp(-2.5, -2.1, swing),
      leftShoulderX: lerp(-0.2, -0.1, swing),
      leftElbowZ: -0.1,
      rightShoulderZ: 0.35,
      rightShoulderX: 0.5,
      rightElbowZ: 0.3,
      leftHipX: -0.5,
      rightHipX: -0.6,
      leftHipZ: -0.08,
      rightHipZ: 0.1,
      kneeBend: 0.75,
      leftAnkleX: 0.4,
      rightAnkleX: 0.4,
      torsoYaw: 0.12,
      headTiltZ: -0.05,
      phase: "zip",
      cableVisible: true,
      cableTension: 1,
      cableHookProgress: 1,
    };
  }

  // Landing (1.25–2.0): release. The zip's velocity carries straight into a
  // ballistic flight at the camera — most of the size growth happens here —
  // then a deep compression at the back edge of the landing zone.
  if (elapsed < 2.0) {
    const progress = (elapsed - 1.25) / 0.75;
    const f = Math.min(progress / 0.55, 1);
    const flight = 1 - (1 - f) ** 1.7;
    const ground = clamp01((progress - 0.55) / 0.45);
    // Torso stays fairly upright through the catch — the drama lives in the
    // legs. Pitch peaks at impact and eases as he balances over his feet.
    const rootPitch =
      f < 1 ? lerp(0.16, 0.2, smoothstep(f)) : lerp(0.2, 0.1, smoothstep(ground));
    // Legs extend to reach the floor through the fall, then the stance leg
    // takes the weight: thigh swings well forward, knee folds deep, and the
    // pelvis drops by exactly the height the folded leg loses, so the feet
    // stay ON the ground while the heels lift past the ankle clamp.
    const stanceHip = 0.4 * (1 - smoothstep(ground) * 0.35);
    const kneeLanding =
      f < 1
        ? lerp(0.75, 0.25, flight)
        : 0.25 + Math.sin(ground * Math.PI) * 0.75 + smoothstep(ground) * 0.05;
    const contact = smoothstep(Math.min(ground * 2.5, 1));
    return {
      ...SETTLED_POSE,
      root: {
        x: lerp(-0.4, -0.9, flight),
        y:
          f < 1
            ? Math.max(1.0 + 0.4 * f - 1.49 * f * f, -0.09)
            : -lerp(0.09, marvinGroundOffset(stanceHip, kneeLanding, rootPitch), contact),
        z: lerp(-2.0, -1.9, flight) + smoothstep(ground) * 0.05,
        rotationX: rootPitch,
        rotationZ: Math.sin(progress * Math.PI) * -0.05,
        rotationY: lerp(0.15, 0.3, smoothstep(f)),
      },
      leftShoulderZ: lerp(-2.1, -1.05, smoothstep(flight)) - Math.sin(ground * Math.PI) * 0.1,
      rightShoulderZ: lerp(0.35, 1.15, smoothstep(flight)) + Math.sin(ground * Math.PI) * 0.15,
      leftShoulderX: lerp(-0.1, -0.35, flight),
      rightShoulderX: lerp(0.5, -0.5, flight),
      leftElbowZ: lerp(-0.1, -0.2, flight),
      rightElbowZ: lerp(0.3, 0.2, flight),
      leftHipX: lerp(-0.5, -0.12, flight) + ground * 0.03,
      rightHipX: f < 1 ? lerp(-0.6, 0.4, flight) : stanceHip,
      leftHipZ: lerp(-0.08, -0.05, flight),
      rightHipZ: lerp(0.1, 0.05, flight),
      kneeBend: kneeLanding,
      leftAnkleX:
        f < 1
          ? lerp(0.4, 0.05, flight)
          : marvinFlatAnkle(rootPitch, -0.09, kneeLanding),
      rightAnkleX:
        f < 1
          ? lerp(0.4, 0.05, flight)
          : marvinFlatAnkle(rootPitch, stanceHip, kneeLanding),
      torsoYaw: lerp(0.12, 0.05, progress),
      headTiltZ: Math.sin(progress * Math.PI) * 0.1,
      phase: "landing",
      cableVisible: progress < 0.12,
      cableTension: 0,
      cableHookProgress: 1,
    };
  }

  // Steps (2.0–3.0): three catch-steps on a diagonal across the zone, facing
  // along the travel direction. The root only advances while a foot swings,
  // so the walk reads as steps instead of a glide.
  const progress = (elapsed - 2.0) / 1.0;
  const stepOne = smoothstep(clamp01(progress / 0.3));
  const stepTwo = smoothstep(clamp01((progress - 0.28) / 0.3));
  const stepThree = smoothstep(clamp01((progress - 0.56) / 0.28));
  const settle = smoothstep(clamp01((progress - 0.8) / 0.2));
  const calm = smoothstep(Math.min(progress * 1.1, 1));
  const travel = 0.4 * stepOne + 0.35 * stepTwo + 0.2 * stepThree + 0.05 * settle;
  const swingL = Math.sin(stepOne * Math.PI) + Math.sin(stepThree * Math.PI);
  const swingR = Math.sin(stepTwo * Math.PI);
  const rootPitch = lerp(0.1, 0, calm);
  const kneeBase = 0.35 * (1 - settle);
  const stanceHip = 0.18 * (1 - calm);
  const leftHipX = Math.sin(stepOne * Math.PI) * 0.7 - Math.sin(stepTwo * Math.PI) * 0.14 + Math.sin(stepThree * Math.PI) * 0.45;
  const rightHipX = 0.26 * (1 - stepOne) + Math.sin(stepTwo * Math.PI) * 0.6 - Math.sin(stepThree * Math.PI) * 0.12;
  const leftKneeExtra = Math.sin(stepOne * Math.PI) * 0.6 + Math.sin(stepThree * Math.PI) * 0.4;
  const rightKneeExtra = Math.sin(stepTwo * Math.PI) * 0.55;
  return {
    ...SETTLED_POSE,
    root: {
      x: -0.9 + 0.9 * travel,
      // Step bobs ride on top of the planted-foot compensation, so the body
      // stays seated on the stance leg instead of floating at rest height.
      y:
        (Math.sin(stepOne * Math.PI) + Math.sin(stepTwo * Math.PI)) * 0.045 +
        Math.sin(stepThree * Math.PI) * 0.035 -
        marvinGroundOffset(stanceHip, kneeBase, rootPitch),
      z: -1.9 + 1.9 * travel,
      rotationX: rootPitch,
      rotationZ: Math.sin(stepOne * Math.PI) * 0.06 - Math.sin(stepTwo * Math.PI) * 0.05 + Math.sin(stepThree * Math.PI) * 0.04,
      rotationY: 0.3 * (1 - settle),
    },
    leftShoulderZ: lerp(-1.05, SETTLED_POSE.leftShoulderZ, calm) - Math.sin(stepTwo * Math.PI) * 0.14,
    rightShoulderZ: lerp(1.15, SETTLED_POSE.rightShoulderZ, calm) + Math.sin(stepOne * Math.PI) * 0.14 + Math.sin(stepThree * Math.PI) * 0.1,
    leftShoulderX: lerp(-0.35, 0, calm),
    rightShoulderX: lerp(-0.5, 0, calm),
    leftElbowZ: lerp(-0.2, SETTLED_POSE.leftElbowZ, calm),
    rightElbowZ: lerp(0.2, SETTLED_POSE.rightElbowZ, calm),
    leftHipX,
    rightHipX,
    leftKneeExtra,
    rightKneeExtra,
    kneeBend: kneeBase,
    // Planted feet stay flat; a swinging foot releases into a toe-down arc.
    leftAnkleX: marvinFlatAnkle(rootPitch, leftHipX, kneeBase + leftKneeExtra) + swingL * 0.45,
    rightAnkleX: marvinFlatAnkle(rootPitch, rightHipX, kneeBase + rightKneeExtra) + swingR * 0.45,
    torsoYaw: Math.sin(stepOne * Math.PI) * 0.07 - Math.sin(stepTwo * Math.PI) * 0.06 + Math.sin(stepThree * Math.PI) * 0.05,
    headTiltZ: lerp(-0.06, 0, calm) + Math.sin(stepOne * Math.PI) * 0.05 - Math.sin(stepTwo * Math.PI) * 0.04,
    phase: "steps",
    cableVisible: false,
    cableTension: 0,
    cableHookProgress: 1,
  };
}

export function getMarvin3DActionPose(
  action: Marvin3DAction,
  progressValue: number,
): Marvin3DPose {
  const progress = clamp01(progressValue);
  const cycle = progress * Math.PI * 2;

  if (action === "wave") {
    // Raise, wave three times, lower — with a friendly head tilt.
    const raise = smoothstep(Math.min(progress * 4, 1));
    const lower = smoothstep(Math.max((progress - 0.78) * 4.5, 0));
    const envelope = raise * (1 - lower);
    return {
      ...SETTLED_POSE,
      root: { ...SETTLED_POSE.root, y: Math.sin(cycle) * 0.03, rotationY: envelope * -0.08 },
      rightShoulderZ: SETTLED_POSE.rightShoulderZ + envelope * 2.0,
      rightShoulderX: envelope * -0.12,
      rightElbowZ: 0.14 + envelope * (0.4 + Math.sin(cycle * 3) * 0.42),
      leftShoulderZ: SETTLED_POSE.leftShoulderZ - envelope * 0.08,
      torsoYaw: envelope * -0.1,
      headTiltZ: envelope * -0.14,
    };
  }

  if (action === "dance") {
    const sway = Math.sin(cycle * 2);
    const bounce = Math.abs(Math.sin(cycle * 2));
    return {
      ...SETTLED_POSE,
      root: {
        ...SETTLED_POSE.root,
        y: bounce * 0.18,
        rotationZ: sway * 0.17,
        rotationY: Math.sin(cycle) * 0.26,
      },
      leftShoulderZ: -0.85 - sway * 0.5,
      rightShoulderZ: 0.85 - sway * 0.5,
      leftShoulderX: Math.sin(cycle * 2 + 1.1) * 0.25,
      rightShoulderX: Math.sin(cycle * 2) * -0.25,
      leftElbowZ: -0.5 + sway * 0.2,
      rightElbowZ: 0.5 + sway * 0.2,
      leftHipZ: sway * 0.2,
      rightHipZ: -sway * 0.2,
      kneeBend: Math.abs(sway) * 0.26,
      torsoYaw: Math.sin(cycle) * 0.18,
      headTiltZ: sway * -0.1,
    };
  }

  if (action === "victory") {
    // Anticipation crouch, then a true ballistic hop: the ascent eases off
    // as gravity wins and the fall comes back down faster than the rise.
    const crouch = progress < 0.18 ? Math.sin((progress / 0.18) * Math.PI) * 0.14 : 0;
    const crouchKnee = crouch * 3.4;
    const air = clamp01((progress - 0.18) / 0.64) ** 0.87;
    const jump = Math.max(4 * air * (1 - air), 0) * 0.8;
    const armsUp = smoothstep(Math.min(progress * 3, 1));
    return {
      ...SETTLED_POSE,
      root: {
        ...SETTLED_POSE.root,
        y: jump - marvinGroundOffset(0, crouchKnee),
        rotationZ: Math.sin(cycle) * 0.05,
      },
      leftShoulderZ: SETTLED_POSE.leftShoulderZ - armsUp * 2.38,
      rightShoulderZ: SETTLED_POSE.rightShoulderZ + armsUp * 2.38,
      leftElbowZ: -0.22,
      rightElbowZ: 0.22,
      leftHipZ: -jump * 0.22,
      rightHipZ: jump * 0.22,
      kneeBend: crouchKnee + jump * 0.7,
      leftAnkleX: marvinFlatAnkle(0, 0, crouchKnee) + jump * 0.5,
      rightAnkleX: marvinFlatAnkle(0, 0, crouchKnee) + jump * 0.5,
      headTiltZ: -0.07,
    };
  }

  // Continuous idle: breathing, a slow weight shift, a hint of head sway.
  return {
    ...SETTLED_POSE,
    root: {
      ...SETTLED_POSE.root,
      y: Math.sin(cycle) * 0.035,
      rotationY: Math.sin(cycle + 1.2) * 0.022,
      rotationZ: Math.sin(cycle + 0.4) * 0.008,
    },
    leftShoulderZ: SETTLED_POSE.leftShoulderZ - Math.sin(cycle) * 0.022,
    rightShoulderZ: SETTLED_POSE.rightShoulderZ + Math.sin(cycle) * 0.022,
    torsoYaw: Math.sin(cycle + 0.9) * 0.03,
    headTiltZ: Math.sin(cycle + 0.6) * 0.03,
  };
}
