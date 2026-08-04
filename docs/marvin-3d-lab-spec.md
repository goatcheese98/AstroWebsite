# Spec: Marvin 3D Lab

## Objective

Build an isolated `/marvin-lab` prototype that proves whether a genuinely three-dimensional,
articulated Marvin can outperform the current SVG mascot. The prototype should preserve the
original character's friendly single-eye and chest-screen identity while introducing convincing
depth, lighting, joint hierarchy, camera parallax, and a grapple entrance whose cable connects to
the robot's moving hand.

The public homepage and existing SVG Marvin remain unchanged until the lab is judged visually and
technically superior.

## Acceptance Criteria

- `/marvin-lab` renders an original articulated 3D robot with recognizable head, lens, chest,
  limbs, joints, grapple hardware, and feet.
- The first entrance uses one coordinated 3D sequence: cable deployment, hand attachment, swing,
  braking, landing, and idle recovery.
- Visitors can trigger at least three authored actions after landing.
- Visitors can inspect the complete model with pointer drag, left/right controls, and a reset control.
- The entrance completes within 2.05 seconds and authored actions within 1.4 seconds.
- The chest is a keyboard-accessible interaction that opens a reusable game interface.
- Reduced-motion visitors see Marvin already landed with continuous motion disabled.
- The experience has a visible loading state and a no-WebGL fallback.
- The route works at 320px, 768px, 1024px, and 1440px without horizontal overflow.
- No production homepage code is replaced by the prototype.

## Tech Stack

- Astro 5 for the isolated route and page shell
- Svelte 5 for state and accessible controls
- Three.js through Threlte 8 for the renderer and scene graph
- Vitest for deterministic motion/state tests
- Stable WebGL rendering; WebGPU is explicitly out of scope for this prototype

## Commands

- Install: `bun install`
- Develop: `bun run dev --host 127.0.0.1`
- Type-check: `bunx tsc --noEmit`
- Test: `bun run test`
- Build: `bun run build`

## Project Structure

```text
src/components/marvin-3d/
  MarvinArm.svelte         Shoulder yoke, arm bones, pistons, hands, and grapple hardware
  MarvinLab.svelte          Route-level interactive experience and accessible controls
  MarvinCanvas.svelte       Threlte Canvas, loading, and renderer boundary
  MarvinHead.svelte         Compact sensor pod, optic, antenna, and neck
  MarvinLeg.svelte          Hip/knee rig, hydraulics, and split stabilizing feet
  MarvinScene.svelte        Camera, lights, environment, and scene orchestration
  MarvinModel.svelte        Motion orchestration and articulated group references
  MarvinScreen.svelte       Reusable chest-screen/game surface
  MarvinTorso.svelte        Chest display, pelvis, rear spine, and cable routing
  marvin-materials.ts       Shared industrial material palette
src/lib/
  marvin-3d-motion.ts       Pure phase, pose, and action-selection logic
  marvin-3d-motion.test.ts  Deterministic behavior tests
  marvin-3d-view.ts         Pure yaw wrapping, pitch clamping, and drag mapping
src/pages/
  marvin-lab.astro          Hidden prototype route
docs/
  marvin-3d-lab-spec.md     This specification
```

## Code Style

Keep time-dependent behavior in pure functions and keep Three.js mutation inside the render task:

```ts
export function getGrapplePose(elapsedSeconds: number, reducedMotion: boolean): MarvinPose {
  if (reducedMotion) return LANDED_POSE;
  return interpolateGrappleTimeline(elapsedSeconds);
}
```

Svelte components compose scene parts around named group references. Materials and geometries are
shared where practical; interaction targets use real HTML buttons over the canvas rather than
unlabelled mesh-only controls.

## Testing Strategy

- Unit-test grapple phases, pose boundaries, action selection, and reduced-motion behavior before
  connecting them to the scene.
- Type-check after each component slice.
- Build after the rendering foundation and after the final interaction slice.
- Verify the real route in a browser at all target breakpoints.
- Check browser console output, horizontal overflow, accessible names, keyboard activation, and
  animation completion.
- Measure the generated route chunk and document its gzip size.

## Performance Boundaries

- Use one canvas and one WebGL context.
- Cap device-pixel ratio at 1.5.
- Render continuously only while entrance/action motion or pointer parallax is active.
- Pause scene work while the document is hidden.
- Avoid post-processing, real-time reflections, physics engines, and high-resolution textures.
- Keep the lab route code-split so the homepage does not download Three.js.
- Target less than 250 KB gzip for the complete lab-only JavaScript payload in this first prototype.

## Reference Translation

The refinement pass uses the official Pathfinder profile and multiple production-model views as
proportion and mechanism references, plus MRVN maintenance-robot references for the utilitarian
spine and exposed hydraulic language. The implementation translates only high-level traits:

- a broad body-mounted emotional display and compact sensor head;
- long actuator-driven limbs with visible joints, pistons, cables, hands, and stabilizing feet;
- a rear service spine that stays legible in side and back views;
- cool blue-grey metal, graphite structure, and restrained safety-yellow markings;
- fast athletic motion with a compressed landing and quick recovery.

No external character mesh, texture, animation, insignia, or game asset is included. Marvin remains
an original procedural model assembled from reusable primitives.

## Boundaries

### Always

- Preserve the production SVG mascot and homepage behavior.
- Provide reduced-motion and renderer-failure fallbacks.
- Keep controls keyboard accessible.
- Run tests, type-checking, build, and browser verification before committing.

### Ask First

- Replacing the homepage mascot.
- Introducing an externally licensed model, texture, sound, or animation asset.
- Deploying or pushing the prototype.
- Moving existing game logic into WebGL textures.

### Never

- Copy a copyrighted Apex Legends character model or game asset.
- Hide essential content inside a canvas without an accessible equivalent.
- Run an unnecessary permanent render loop on the homepage.
- Remove the existing SVG implementation during this experiment.

## Out of Scope

- Replacing the homepage mascot
- A production-ready Blender-authored GLB
- Full rope or rigid-body physics
- WebGPU-specific shaders
- Rebuilding Tetris or Whac-a-Mole
- Audio, multiplayer, or persistent scores

## Success Decision

The lab is eligible to replace the SVG mascot only if it is visibly more convincing in still frames
and motion, preserves the mascot's personality, meets the performance budget, supports accessible
interaction, and does not degrade the homepage's mobile experience.

## Prototype Result

- Production build: passing
- Lab JavaScript: 207.95 KB gzip
- Reused game interface: 8.92 KB gzip
- Lab CSS: 2.70 KB gzip
- Responsive checks: no horizontal overflow at 320px, 768px, 1024px, or 1440px
- Homepage integration: intentionally deferred; the SVG mascot remains unchanged
