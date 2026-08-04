export interface MarvinViewRotation {
  yaw: number;
  pitch: number;
}

const DRAG_YAW_RADIANS_PER_PIXEL = 0.006;
const DRAG_PITCH_RADIANS_PER_PIXEL = 0.0045;
const MAX_PITCH = 0.55;

export function clampMarvinPitch(pitch: number) {
  return Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch));
}

export function wrapMarvinYaw(yaw: number) {
  const turn = Math.PI * 2;
  return ((yaw + Math.PI) % turn + turn) % turn - Math.PI;
}

export function rotateMarvinFromDrag(
  start: MarvinViewRotation,
  deltaX: number,
  deltaY: number,
): MarvinViewRotation {
  return {
    yaw: wrapMarvinYaw(start.yaw + deltaX * DRAG_YAW_RADIANS_PER_PIXEL),
    pitch: clampMarvinPitch(start.pitch + deltaY * DRAG_PITCH_RADIANS_PER_PIXEL),
  };
}
