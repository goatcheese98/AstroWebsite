// Joint channels and their travel limits for the Marvin rig console. These
// are the authored constraints of the character — poses outside these ranges
// intersect the shell or read as broken.

export interface MarvinRigControl {
  id: string;
  label: string;
  group: string;
  min: number;
  max: number;
  initial: number;
}

export const MARVIN_RIG_CONTROLS: MarvinRigControl[] = [
  { id: "rootYaw", label: "Facing", group: "Body", min: -Math.PI, max: Math.PI, initial: 0 },
  { id: "torsoYaw", label: "Torso twist", group: "Body", min: -0.6, max: 0.6, initial: 0 },
  { id: "torsoLean", label: "Torso lean", group: "Body", min: -0.25, max: 0.25, initial: 0 },

  { id: "headYaw", label: "Turn", group: "Head", min: -0.7, max: 0.7, initial: 0 },
  { id: "headPitch", label: "Nod", group: "Head", min: -0.4, max: 0.4, initial: 0 },
  { id: "headTilt", label: "Tilt", group: "Head", min: -0.5, max: 0.5, initial: 0 },

  { id: "leftShoulderZ", label: "Shoulder raise", group: "Left arm", min: -2.6, max: 0.35, initial: -0.07 },
  { id: "leftShoulderX", label: "Shoulder swing", group: "Left arm", min: -1.1, max: 1.1, initial: 0 },
  { id: "leftElbowZ", label: "Elbow", group: "Left arm", min: -1.7, max: 0.1, initial: -0.14 },

  { id: "rightShoulderZ", label: "Shoulder raise", group: "Right arm", min: -0.35, max: 2.6, initial: 0.07 },
  { id: "rightShoulderX", label: "Shoulder swing", group: "Right arm", min: -1.1, max: 1.1, initial: 0 },
  { id: "rightElbowZ", label: "Elbow", group: "Right arm", min: -0.1, max: 1.7, initial: 0.14 },

  { id: "leftHipX", label: "Hip swing", group: "Left leg", min: -0.9, max: 0.9, initial: 0 },
  { id: "leftHipZ", label: "Hip splay", group: "Left leg", min: -0.6, max: 0.3, initial: 0 },
  { id: "leftKnee", label: "Knee", group: "Left leg", min: 0, max: 1.5, initial: 0 },
  { id: "leftAnkle", label: "Ankle", group: "Left leg", min: -0.7, max: 0.6, initial: 0 },

  { id: "rightHipX", label: "Hip swing", group: "Right leg", min: -0.9, max: 0.9, initial: 0 },
  { id: "rightHipZ", label: "Hip splay", group: "Right leg", min: -0.3, max: 0.6, initial: 0 },
  { id: "rightKnee", label: "Knee", group: "Right leg", min: 0, max: 1.5, initial: 0 },
  { id: "rightAnkle", label: "Ankle", group: "Right leg", min: -0.7, max: 0.6, initial: 0 },
];

export const MARVIN_RIG_GROUPS = [...new Set(MARVIN_RIG_CONTROLS.map((control) => control.group))];

export type MarvinRigPose = Record<string, number>;

export function createInitialRigPose(): MarvinRigPose {
  return Object.fromEntries(MARVIN_RIG_CONTROLS.map((control) => [control.id, control.initial]));
}

export function clampRigValue(id: string, value: number): number {
  const control = MARVIN_RIG_CONTROLS.find((entry) => entry.id === id);
  if (!control || Number.isNaN(value)) return 0;
  return Math.max(control.min, Math.min(control.max, value));
}
