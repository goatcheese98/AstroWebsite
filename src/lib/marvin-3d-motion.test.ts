import { describe, expect, it } from "vitest";

import {
  MARVIN_3D_ACTION_DURATION,
  MARVIN_3D_GRAPPLE_DURATION,
  getMarvin3DActionPose,
  getMarvin3DGrapplePose,
} from "./marvin-3d-motion";
import { MARVIN_RIG_CONTROLS } from "./marvin-rig";
import { clampMarvinPitch, rotateMarvinFromDrag, wrapMarvinYaw } from "./marvin-3d-view";

describe("Marvin 3D motion", () => {
  it("moves through aim, zip, landing, steps and settles online", () => {
    const aim = getMarvin3DGrapplePose(0.3, false);
    const zip = getMarvin3DGrapplePose(0.82, false);
    const landing = getMarvin3DGrapplePose(1.6, false);
    const steps = getMarvin3DGrapplePose(2.2, false);
    const settled = getMarvin3DGrapplePose(MARVIN_3D_GRAPPLE_DURATION, false);

    expect(aim.phase).toBe("aim");
    expect(zip.phase).toBe("zip");
    expect(landing.phase).toBe("landing");
    expect(steps.phase).toBe("steps");
    expect(settled).toMatchObject({ phase: "online", cableVisible: false });
    expect(settled.root).toEqual({ x: 0, y: 0, z: 0, rotationZ: 0, rotationY: 0 });
  });

  it("keeps the entrance and authored actions brisk", () => {
    expect(MARVIN_3D_GRAPPLE_DURATION).toBeLessThanOrEqual(3.2);
    expect(MARVIN_3D_ACTION_DURATION).toBeLessThanOrEqual(1.4);
  });

  it("returns the settled pose immediately for reduced motion", () => {
    expect(getMarvin3DGrapplePose(0, true)).toMatchObject({
      phase: "online",
      cableVisible: false,
      root: { x: 0, y: 0, z: 0 },
    });
  });

  it("stays offscreen right while the fired hook crosses the frame", () => {
    const hidden = getMarvin3DGrapplePose(0.05, false);
    const firing = getMarvin3DGrapplePose(0.3, false);
    const attached = getMarvin3DGrapplePose(0.42, false);

    // The robot is past the right edge — only the grapple is on stage.
    expect(hidden.root.x).toBeGreaterThan(10);
    expect(hidden.cableVisible).toBe(false);
    expect(firing.root.x).toBeGreaterThan(10);
    // The hook is mid-flight, fired from the raised left arm.
    expect(firing.cableVisible).toBe(true);
    expect(firing.cableHookProgress).toBeGreaterThan(0);
    expect(firing.cableHookProgress).toBeLessThan(1);
    expect(firing.leftShoulderZ).toBeLessThan(-2);
    expect(attached.cableHookProgress).toBe(1);
  });

  it("swings into frame from the right edge on a taut line", () => {
    const swingStart = getMarvin3DGrapplePose(0.5, false);
    const swingEnd = getMarvin3DGrapplePose(1.2, false);

    // Enters from far right and crosses most of the frame before release.
    expect(swingStart.root.x).toBeGreaterThan(8);
    expect(swingEnd.root.x).toBeLessThan(1);
    expect(swingEnd.root.y).toBeGreaterThan(0.5);
    expect(Math.abs(swingStart.root.rotationY)).toBeLessThan(0.6);
    expect(Math.abs(swingEnd.root.rotationY)).toBeLessThan(0.6);
    expect(swingEnd.leftShoulderZ).toBeLessThan(-1.5);
    expect(swingEnd.cableTension).toBe(1);
  });

  it("releases with leftward momentum into the landing zone", () => {
    const release = getMarvin3DGrapplePose(1.3, false);
    const midFlight = getMarvin3DGrapplePose(1.5, false);

    // Airborne past the mark's side of the frame, line already let go.
    expect(release.root.x).toBeLessThan(0.5);
    expect(release.root.y).toBeGreaterThan(0.6);
    expect(release.cableTension).toBe(0);
    // Momentum keeps carrying him left as he falls.
    expect(midFlight.root.x).toBeLessThan(release.root.x);
    expect(midFlight.root.y).toBeLessThan(release.root.y);
  });

  it("lands short of the mark and walks the rest with catch steps", () => {
    const touchdown = getMarvin3DGrapplePose(1.85, false);
    const stepping = getMarvin3DGrapplePose(2.1, false);
    const midWalk = getMarvin3DGrapplePose(2.5, false);
    const settled = getMarvin3DGrapplePose(MARVIN_3D_GRAPPLE_DURATION, false);

    // Deep compression at the back of the zone: the pelvis drops with the
    // folded knees so the feet stay planted, ankles flexing to keep contact.
    expect(touchdown.root.z).toBeLessThan(-1.4);
    expect(touchdown.kneeBend).toBeGreaterThan(0.7);
    expect(touchdown.root.y).toBeLessThan(-0.35);
    expect(touchdown.rightAnkleX ?? 0).toBeLessThan(-0.3);
    expect(touchdown.root.rotationX ?? 0).toBeGreaterThan(0.1);
    expect(touchdown.rightHipX ?? 0).toBeGreaterThan(0.1);
    // Three steps travel a diagonal, facing along the walk direction, with
    // the body still seated on bent stance legs rather than at rest height.
    expect(stepping.leftHipX ?? 0).toBeGreaterThan(0.2);
    expect(stepping.root.y).toBeLessThan(0);
    expect(midWalk.root.z - stepping.root.z).toBeGreaterThan(1);
    expect(midWalk.root.x).toBeGreaterThan(touchdown.root.x);
    expect(midWalk.root.rotationY).toBeGreaterThan(0.15);
    expect(settled.root.z).toBe(0);
    expect(settled.rightHipX ?? 0).toBe(0);
    expect(settled.root.rotationX ?? 0).toBe(0);
  });

  it("keeps grounded phases planted through leg compression", () => {
    // While aiming, the crouch drops the pelvis instead of lifting the feet.
    const braced = getMarvin3DGrapplePose(0.44, false);
    expect(braced.root.y).toBeLessThan(-0.1);
    expect(braced.leftAnkleX ?? 0).toBeLessThan(-0.2);
    // In flight the toes trail; on the ground the ankles flex flat.
    const airborne = getMarvin3DGrapplePose(0.9, false);
    expect(airborne.leftAnkleX ?? 0).toBeGreaterThan(0.2);
  });

  it("authors distinct wave, dance, and victory poses", () => {
    const wave = getMarvin3DActionPose("wave", 0.55);
    const dance = getMarvin3DActionPose("dance", 0.55);
    const victory = getMarvin3DActionPose("victory", 0.55);

    expect(wave.rightShoulderZ).not.toBe(dance.rightShoulderZ);
    expect(dance.root.rotationZ).not.toBe(0);
    expect(dance.torsoYaw ?? 0).not.toBe(0);
    expect(victory.root.y).toBeGreaterThan(0);
    expect(victory.leftShoulderZ).toBeLessThan(-2);
    expect(victory.rightShoulderZ).toBeGreaterThan(2);
  });
});

describe("Marvin rig console limits", () => {
  it("defines well-formed travel limits with in-range defaults", () => {
    for (const control of MARVIN_RIG_CONTROLS) {
      expect(control.min).toBeLessThan(control.max);
      expect(control.initial).toBeGreaterThanOrEqual(control.min);
      expect(control.initial).toBeLessThanOrEqual(control.max);
    }
  });
});

describe("Marvin 3D view controls", () => {
  it("maps drag distance to yaw and a deliberately limited pitch", () => {
    const rotation = rotateMarvinFromDrag({ yaw: 0, pitch: 0 }, 120, -80);
    expect(rotation.yaw).toBeCloseTo(0.72);
    expect(rotation.pitch).toBeCloseTo(-0.36);
  });

  it("wraps full horizontal turns and clamps vertical inspection", () => {
    expect(wrapMarvinYaw(Math.PI * 3)).toBeCloseTo(-Math.PI);
    expect(clampMarvinPitch(2)).toBe(0.55);
    expect(clampMarvinPitch(-2)).toBe(0.55 * -1);
  });
});
