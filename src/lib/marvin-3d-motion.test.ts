import { describe, expect, it } from "vitest";

import {
  MARVIN_3D_ACTION_DURATION,
  MARVIN_3D_GRAPPLE_DURATION,
  getMarvin3DActionPose,
  getMarvin3DGrapplePose,
} from "./marvin-3d-motion";
import { clampMarvinPitch, rotateMarvinFromDrag, wrapMarvinYaw } from "./marvin-3d-view";

describe("Marvin 3D motion", () => {
  it("moves through a connected grapple, landing, and settled sequence", () => {
    const launch = getMarvin3DGrapplePose(0, false);
    const swing = getMarvin3DGrapplePose(0.82, false);
    const landing = getMarvin3DGrapplePose(1.42, false);
    const settled = getMarvin3DGrapplePose(MARVIN_3D_GRAPPLE_DURATION, false);

    expect(launch.phase).toBe("launch");
    expect(launch.cableVisible).toBe(true);
    expect(launch.root.y).toBeGreaterThan(swing.root.y);
    expect(swing.phase).toBe("swing");
    expect(swing.root.y).toBeLessThan(2.6);
    expect(Math.abs(swing.root.x)).toBeLessThan(2.5);
    expect(landing.phase).toBe("landing");
    expect(settled).toMatchObject({ phase: "online", cableVisible: false });
    expect(settled.root).toEqual({ x: 0, y: 0, z: 0, rotationZ: 0, rotationY: 0 });
  });

  it("keeps the entrance and authored actions brisk", () => {
    expect(MARVIN_3D_GRAPPLE_DURATION).toBeLessThanOrEqual(2.05);
    expect(MARVIN_3D_ACTION_DURATION).toBeLessThanOrEqual(1.4);
  });

  it("returns the settled pose immediately for reduced motion", () => {
    expect(getMarvin3DGrapplePose(0, true)).toMatchObject({
      phase: "online",
      cableVisible: false,
      root: { x: 0, y: 0, z: 0 },
    });
  });

  it("authors distinct wave, dance, and victory poses", () => {
    const wave = getMarvin3DActionPose("wave", 0.55);
    const dance = getMarvin3DActionPose("dance", 0.55);
    const victory = getMarvin3DActionPose("victory", 0.55);

    expect(wave.rightShoulderZ).not.toBe(dance.rightShoulderZ);
    expect(dance.root.rotationZ).not.toBe(0);
    expect(victory.root.y).toBeGreaterThan(0);
    expect(victory.leftShoulderZ).toBeLessThan(-2);
    expect(victory.rightShoulderZ).toBeGreaterThan(2);
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
    expect(clampMarvinPitch(-2)).toBe(-0.55);
  });
});
