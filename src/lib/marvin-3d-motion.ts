export type Marvin3DGrapplePhase = "launch" | "swing" | "landing" | "recovery" | "online";
export type Marvin3DAction = "idle" | "wave" | "dance" | "victory";

export interface Marvin3DRootPose {
  x: number;
  y: number;
  z: number;
  rotationZ: number;
  rotationY: number;
}

export interface Marvin3DPose {
  root: Marvin3DRootPose;
  leftShoulderZ: number;
  rightShoulderZ: number;
  leftElbowZ: number;
  rightElbowZ: number;
  leftHipZ: number;
  rightHipZ: number;
  kneeBend: number;
  headTiltZ: number;
}

export interface Marvin3DGrapplePose extends Marvin3DPose {
  phase: Marvin3DGrapplePhase;
  cableVisible: boolean;
  cableTension: number;
}

export const MARVIN_3D_GRAPPLE_DURATION = 3.2;

const SETTLED_POSE: Marvin3DPose = {
  root: { x: 0, y: 0, z: 0, rotationZ: 0, rotationY: 0 },
  leftShoulderZ: 0,
  rightShoulderZ: 0,
  leftElbowZ: 0,
  rightElbowZ: 0,
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

function settledGrapplePose(): Marvin3DGrapplePose {
  return {
    ...SETTLED_POSE,
    root: { ...SETTLED_POSE.root },
    phase: "online",
    cableVisible: false,
    cableTension: 0,
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

  if (elapsed < 0.8) {
    const progress = smoothstep(elapsed / 0.8);
    return {
      ...SETTLED_POSE,
      root: {
        x: lerp(4.2, 2.5, progress),
        y: lerp(6.4, 4.4, progress),
        z: lerp(-2, 0.2, progress),
        rotationZ: lerp(-0.48, 0.24, progress),
        rotationY: lerp(-0.55, 0.18, progress),
      },
      rightShoulderZ: 2.32,
      rightElbowZ: 0.42,
      leftShoulderZ: -0.5,
      leftHipZ: -0.22,
      rightHipZ: 0.18,
      kneeBend: 0.35,
      headTiltZ: -0.08,
      phase: "launch",
      cableVisible: true,
      cableTension: lerp(0.25, 1, progress),
    };
  }

  if (elapsed < 1.9) {
    const progress = smoothstep((elapsed - 0.8) / 1.1);
    return {
      ...SETTLED_POSE,
      root: {
        x: lerp(2.5, 0, progress),
        y: lerp(4.4, 0.72, progress) + Math.sin(progress * Math.PI) * 0.45,
        z: lerp(0.2, 0, progress),
        rotationZ: Math.sin(progress * Math.PI) * 0.34 - 0.08,
        rotationY: lerp(0.18, -0.08, progress),
      },
      rightShoulderZ: lerp(2.32, 1.58, progress),
      rightElbowZ: lerp(0.42, 0.18, progress),
      leftShoulderZ: lerp(-0.5, 0.35, progress),
      leftElbowZ: -0.24,
      leftHipZ: lerp(-0.22, 0.14, progress),
      rightHipZ: lerp(0.18, -0.12, progress),
      kneeBend: lerp(0.35, 0.5, progress),
      headTiltZ: Math.sin(progress * Math.PI) * -0.12,
      phase: "swing",
      cableVisible: true,
      cableTension: 1,
    };
  }

  if (elapsed < 2.65) {
    const progress = smoothstep((elapsed - 1.9) / 0.75);
    const bounce = Math.sin(progress * Math.PI * 2) * 0.24 * (1 - progress);
    return {
      ...SETTLED_POSE,
      root: {
        x: 0,
        y: lerp(0.72, 0, progress) + bounce,
        z: 0,
        rotationZ: Math.sin(progress * Math.PI) * -0.08,
        rotationY: lerp(-0.08, 0, progress),
      },
      rightShoulderZ: lerp(1.58, 0.12, progress),
      rightElbowZ: lerp(0.18, 0, progress),
      leftShoulderZ: lerp(0.35, -0.12, progress),
      leftElbowZ: lerp(-0.24, 0, progress),
      leftHipZ: lerp(0.14, -0.08, progress),
      rightHipZ: lerp(-0.12, 0.08, progress),
      kneeBend: Math.sin(progress * Math.PI) * 0.72,
      headTiltZ: Math.sin(progress * Math.PI) * 0.1,
      phase: "landing",
      cableVisible: elapsed < 2.18,
      cableTension: clamp01(1 - (elapsed - 1.9) / 0.28),
    };
  }

  const recovery = smoothstep((elapsed - 2.65) / 0.55);
  return {
    ...SETTLED_POSE,
    root: {
      ...SETTLED_POSE.root,
      y: Math.sin(recovery * Math.PI) * 0.08,
    },
    leftShoulderZ: lerp(-0.12, 0, recovery),
    rightShoulderZ: lerp(0.12, 0, recovery),
    kneeBend: lerp(0.18, 0, recovery),
    phase: "recovery",
    cableVisible: false,
    cableTension: 0,
  };
}

export function getMarvin3DActionPose(
  action: Marvin3DAction,
  progressValue: number,
): Marvin3DPose {
  const progress = clamp01(progressValue);
  const cycle = progress * Math.PI * 2;

  if (action === "wave") {
    return {
      ...SETTLED_POSE,
      root: { ...SETTLED_POSE.root, y: Math.sin(cycle) * 0.04 },
      rightShoulderZ: 1.95,
      rightElbowZ: 0.55 + Math.sin(cycle * 3) * 0.38,
      headTiltZ: -0.08,
    };
  }

  if (action === "dance") {
    const sway = Math.sin(cycle * 2);
    return {
      ...SETTLED_POSE,
      root: {
        ...SETTLED_POSE.root,
        y: Math.abs(Math.sin(cycle * 2)) * 0.16,
        rotationZ: sway * 0.16,
        rotationY: Math.sin(cycle) * 0.2,
      },
      leftShoulderZ: -0.75 - sway * 0.42,
      rightShoulderZ: 0.75 - sway * 0.42,
      leftElbowZ: 0.35,
      rightElbowZ: -0.35,
      leftHipZ: sway * 0.18,
      rightHipZ: -sway * 0.18,
      kneeBend: Math.abs(sway) * 0.22,
      headTiltZ: sway * -0.08,
    };
  }

  if (action === "victory") {
    const jump = Math.sin(progress * Math.PI);
    return {
      ...SETTLED_POSE,
      root: {
        ...SETTLED_POSE.root,
        y: jump * 0.85,
        rotationZ: Math.sin(cycle) * 0.06,
      },
      leftShoulderZ: -2.35,
      rightShoulderZ: 2.35,
      leftElbowZ: -0.2,
      rightElbowZ: 0.2,
      leftHipZ: -jump * 0.2,
      rightHipZ: jump * 0.2,
      kneeBend: jump * 0.42,
      headTiltZ: -0.06,
    };
  }

  return {
    ...SETTLED_POSE,
    root: {
      ...SETTLED_POSE.root,
      y: Math.sin(cycle) * 0.025,
      rotationY: Math.sin(cycle * 0.5) * 0.025,
    },
    headTiltZ: Math.sin(cycle * 0.5) * 0.025,
  };
}
