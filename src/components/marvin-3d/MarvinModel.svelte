<script lang="ts">
  import { T, useTask, useThrelte } from "@threlte/core";
  import { Group, MathUtils, Mesh, Vector3 } from "three";
  import {
    MARVIN_3D_ACTION_DURATION,
    MARVIN_3D_CABLE_ANCHOR,
    MARVIN_3D_GRAPPLE_DURATION,
    MARVIN_3D_IDLE_PERIOD,
    getMarvin3DActionPose,
    getMarvin3DGrapplePose,
    type Marvin3DAction,
    type Marvin3DGrapplePhase,
    type Marvin3DPose,
  } from "../../lib/marvin-3d-motion";
  import {
    createJointSpring,
    snapJointSpring,
    stepJointSpring,
    type JointSpringTier,
  } from "../../lib/marvin-joint-springs";
  import MarvinArm from "./MarvinArm.svelte";
  import MarvinHead from "./MarvinHead.svelte";
  import MarvinLeg from "./MarvinLeg.svelte";
  import MarvinTorso from "./MarvinTorso.svelte";
  import { accentOrangeMaterial, graphiteMaterial, grappleCableMaterial } from "./marvin-materials";

  const cableAnchor = new Vector3(
    MARVIN_3D_CABLE_ANCHOR.x,
    MARVIN_3D_CABLE_ANCHOR.y,
    MARVIN_3D_CABLE_ANCHOR.z,
  );
  const hookPoint = new Vector3();

  // Dev-only pose scrubber: /marvin-lab?pose=1.55 freezes the entrance at
  // that second so choreography frames can be inspected and tuned.
  const frozenEntrance = import.meta.env.DEV
    ? Number(new URLSearchParams(globalThis.location?.search ?? "").get("pose") ?? NaN)
    : NaN;
  const handPosition = new Vector3();
  const cableMiddle = new Vector3();
  const cableDirection = new Vector3();
  const cableCenter = new Vector3();
  const upAxis = new Vector3(0, 1, 0);

  let {
    action,
    actionToken,
    reducedMotion,
    pointerX,
    pointerY,
    viewYaw,
    viewPitch,
    onReady,
    onPhaseChange,
  }: {
    action: Marvin3DAction;
    actionToken: number;
    reducedMotion: boolean;
    pointerX: number;
    pointerY: number;
    viewYaw: number;
    viewPitch: number;
    onReady: () => void;
    onPhaseChange: (phase: Marvin3DGrapplePhase) => void;
  } = $props();

  const { invalidate } = useThrelte();

  let root = $state<Group>();
  let head = $state<Group>();
  let pupil = $state<Group>();
  let blink = $state<Group>();
  let antenna = $state<Group>();
  let chest = $state<Group>();
  let leftShoulder = $state<Group>();
  let rightShoulder = $state<Group>();
  let leftElbow = $state<Group>();
  let rightElbow = $state<Group>();
  let grappleHand = $state<Group>();
  let leftHip = $state<Group>();
  let rightHip = $state<Group>();
  let leftKnee = $state<Group>();
  let rightKnee = $state<Group>();
  let leftFoot = $state<Group>();
  let rightFoot = $state<Group>();
  let cableGroup = $state<Group>();
  let cableUpper = $state<Mesh>();
  let cableLower = $state<Mesh>();
  let hookGroup = $state<Group>();

  // Wall-clock timing keeps the choreography on schedule even when frames
  // stall (page hydration jank, background-tab throttling).
  let time = 0;
  let clockStart: number | null = null;
  let introStart: number | null = null;
  let actionStart: number | null = null;
  // After landing he stands still for a beat, then waves — unless the
  // visitor has already asked for a routine of their own.
  let greetAt: number | null = null;
  let lastActionToken = 0;
  let lastPhase: Marvin3DGrapplePhase | null = null;
  let introComplete = $state(false);
  let activeAction = $state(false);
  let rigReady = $state(false);

  // Secondary motion state: damped gaze, blink scheduling, antenna spring.
  let gazeYaw = 0;
  let gazePitch = 0;
  let blinkStart = -1;
  let nextBlink = 2.2;
  let springPos = 0;
  let springVel = 0;

  // Suspension: every joint channel runs through a damped spring so limbs
  // carry a little lag and settle like shock absorbers. Root position is
  // exempt — the flight path must stay exactly on schedule.
  const JOINT_TIERS = {
    leftShoulderZ: "proximal",
    rightShoulderZ: "proximal",
    leftShoulderX: "proximal",
    rightShoulderX: "proximal",
    leftElbowZ: "distal",
    rightElbowZ: "distal",
    leftHipZ: "proximal",
    rightHipZ: "proximal",
    leftHipX: "proximal",
    rightHipX: "proximal",
    leftKnee: "distal",
    rightKnee: "distal",
    leftAnkle: "distal",
    rightAnkle: "distal",
    torsoYaw: "proximal",
    headTiltZ: "distal",
    rootRotationX: "rootTilt",
    rootRotationZ: "rootTilt",
  } as const satisfies Record<string, JointSpringTier>;

  const jointSprings = Object.fromEntries(
    Object.keys(JOINT_TIERS).map((id) => [id, createJointSpring()]),
  ) as Record<keyof typeof JOINT_TIERS, ReturnType<typeof createJointSpring>>;
  let springsPrimed = false;

  function springTargets(pose: Marvin3DPose): Record<keyof typeof JOINT_TIERS, number> {
    return {
      leftShoulderZ: pose.leftShoulderZ,
      rightShoulderZ: pose.rightShoulderZ,
      leftShoulderX: pose.leftShoulderX,
      rightShoulderX: pose.rightShoulderX,
      leftElbowZ: pose.leftElbowZ,
      rightElbowZ: pose.rightElbowZ,
      leftHipZ: pose.leftHipZ,
      rightHipZ: pose.rightHipZ,
      leftHipX: pose.leftHipX ?? 0,
      rightHipX: pose.rightHipX ?? 0,
      leftKnee: pose.kneeBend + (pose.leftKneeExtra ?? 0),
      rightKnee: pose.kneeBend + (pose.rightKneeExtra ?? 0),
      leftAnkle: pose.leftAnkleX ?? 0,
      rightAnkle: pose.rightAnkleX ?? 0,
      torsoYaw: pose.torsoYaw ?? 0,
      headTiltZ: pose.headTiltZ,
      rootRotationX: pose.root.rotationX ?? 0,
      rootRotationZ: pose.root.rotationZ,
    };
  }

  function applySuspension(pose: Marvin3DPose, delta: number): Marvin3DPose {
    const targets = springTargets(pose);
    if (!springsPrimed) {
      springsPrimed = true;
      for (const id of Object.keys(targets) as (keyof typeof JOINT_TIERS)[]) {
        snapJointSpring(jointSprings[id], targets[id]);
      }
    }
    const sprung = {} as Record<keyof typeof JOINT_TIERS, number>;
    for (const id of Object.keys(targets) as (keyof typeof JOINT_TIERS)[]) {
      sprung[id] = stepJointSpring(jointSprings[id], targets[id], JOINT_TIERS[id], delta);
    }
    return {
      ...pose,
      leftShoulderZ: sprung.leftShoulderZ,
      rightShoulderZ: sprung.rightShoulderZ,
      leftShoulderX: sprung.leftShoulderX,
      rightShoulderX: sprung.rightShoulderX,
      leftElbowZ: sprung.leftElbowZ,
      rightElbowZ: sprung.rightElbowZ,
      leftHipZ: sprung.leftHipZ,
      rightHipZ: sprung.rightHipZ,
      leftHipX: sprung.leftHipX,
      rightHipX: sprung.rightHipX,
      kneeBend: 0,
      leftKneeExtra: sprung.leftKnee,
      rightKneeExtra: sprung.rightKnee,
      leftAnkleX: sprung.leftAnkle,
      rightAnkleX: sprung.rightAnkle,
      torsoYaw: sprung.torsoYaw,
      headTiltZ: sprung.headTiltZ,
      root: { ...pose.root, rotationX: sprung.rootRotationX, rotationZ: sprung.rootRotationZ },
    };
  }

  function announcePhase(phase: Marvin3DGrapplePhase) {
    if (phase === lastPhase) return;
    lastPhase = phase;
    onPhaseChange(phase);
  }

  function alignCableSegment(segment: Mesh, start: Vector3, end: Vector3) {
    cableDirection.copy(end).sub(start);
    const length = cableDirection.length();
    cableCenter.copy(start).add(end).multiplyScalar(0.5);
    segment.position.copy(cableCenter);
    segment.scale.set(1, length, 1);
    segment.quaternion.setFromUnitVectors(upAxis, cableDirection.normalize());
  }

  function updateCable(visible: boolean, tension: number, hookProgress: number) {
    if (!cableGroup || !cableUpper || !cableLower || !hookGroup || !grappleHand || !root) return;
    cableGroup.visible = visible;
    if (!visible) return;

    root.updateWorldMatrix(true, true);
    grappleHand.getWorldPosition(handPosition);

    // While the fired hook is in flight the line spans hand to hook; once it
    // bites, the line hangs from the anchor as usual.
    const farEnd = hookProgress < 1
      ? hookPoint.copy(handPosition).lerp(cableAnchor, hookProgress)
      : cableAnchor;
    hookGroup.visible = hookProgress < 1;
    if (hookProgress < 1) {
      hookGroup.position.copy(farEnd);
      cableDirection.copy(farEnd).sub(handPosition).normalize();
      hookGroup.quaternion.setFromUnitVectors(upAxis, cableDirection);
    }

    cableMiddle.copy(farEnd).lerp(handPosition, 0.52);
    // Slack sag scales with span so the long deep-scene cable still drapes.
    const span = farEnd.distanceTo(handPosition);
    cableMiddle.y -= (0.05 * span + 0.04) * (1 - tension) + 0.04;
    alignCableSegment(cableUpper, farEnd, cableMiddle);
    alignCableSegment(cableLower, cableMiddle, handPosition);
  }

  function applyPose(pose: Marvin3DPose, cableVisible = false, cableTension = 0, cableHook = 1) {
    if (
      !rigReady || !root || !head || !leftShoulder || !rightShoulder || !leftElbow ||
      !rightElbow || !leftHip || !rightHip || !leftKnee || !rightKnee
    ) return;

    root.position.set(pose.root.x, pose.root.y, pose.root.z);
    root.rotation.set(pose.root.rotationX ?? 0, pose.root.rotationY, pose.root.rotationZ);
    leftShoulder.rotation.set(pose.leftShoulderX, 0, pose.leftShoulderZ);
    rightShoulder.rotation.set(pose.rightShoulderX, 0, pose.rightShoulderZ);
    leftElbow.rotation.z = pose.leftElbowZ;
    rightElbow.rotation.z = pose.rightElbowZ;
    leftHip.rotation.set(pose.leftHipX ?? 0, 0, pose.leftHipZ);
    rightHip.rotation.set(pose.rightHipX ?? 0, 0, pose.rightHipZ);
    leftKnee.rotation.x = pose.kneeBend + (pose.leftKneeExtra ?? 0);
    rightKnee.rotation.x = pose.kneeBend + (pose.rightKneeExtra ?? 0);
    if (leftFoot) leftFoot.rotation.x = pose.leftAnkleX ?? 0;
    if (rightFoot) rightFoot.rotation.x = pose.rightAnkleX ?? 0;
    head.rotation.set(gazePitch, gazeYaw, pose.headTiltZ);
    if (chest) chest.rotation.y = (pose.torsoYaw ?? 0) + gazeYaw * 0.22;
    if (pupil) pupil.position.set(gazeYaw * 0.22, 0.2 - gazePitch * 0.35, 0.46);
    updateCable(cableVisible, cableTension, cableHook);
  }

  // Blink, breath scale and antenna lag run on top of whatever pose is active.
  function applySecondary(delta: number, pose: Marvin3DPose) {
    gazeYaw = MathUtils.damp(gazeYaw, pointerX * 0.34 + Math.sin(time * 0.31) * 0.05, 6, delta);
    gazePitch = MathUtils.damp(gazePitch, pointerY * -0.16, 6, delta);

    if (blink) {
      if (blinkStart < 0 && time >= nextBlink) {
        blinkStart = time;
        nextBlink = time + (Math.random() < 0.22 ? 0.34 : 2.4 + Math.random() * 2.6);
      }
      if (blinkStart >= 0) {
        const progress = (time - blinkStart) / 0.2;
        if (progress >= 1) {
          blinkStart = -1;
          blink.scale.y = 1;
        } else {
          blink.scale.y = 1 - Math.sin(progress * Math.PI) * 0.94;
        }
      }
    }

    if (chest) {
      const breath = 1 + Math.sin(time * 1.35) * 0.008;
      chest.scale.set(1, breath, 1);
    }

    if (antenna) {
      const drive = pose.root.x * 0.7 + viewYaw * 1.1 + gazeYaw * 0.5;
      springVel += (drive - springPos) * 36 * delta;
      springVel *= Math.exp(-5 * delta);
      springPos += springVel * delta;
      antenna.rotation.z = MathUtils.clamp((springPos - drive) * 1.5, -0.55, 0.55);
      antenna.rotation.x = Math.sin(time * 1.9) * 0.03;
    }
  }

  $effect(() => {
    if (
      root && head && pupil && blink && antenna && chest && leftShoulder && rightShoulder &&
      leftElbow && rightElbow && grappleHand && leftHip && rightHip && leftKnee && rightKnee &&
      cableGroup && cableUpper && cableLower && !rigReady
    ) {
      rigReady = true;
      const pose = getMarvin3DGrapplePose(reducedMotion ? MARVIN_3D_GRAPPLE_DURATION : 0, reducedMotion);
      applyPose(pose, pose.cableVisible, pose.cableTension, pose.cableHookProgress);
      if (reducedMotion) {
        introComplete = true;
        announcePhase("online");
      }
      onReady();
    }
  });

  $effect(() => {
    if (!rigReady || actionToken === lastActionToken || !introComplete) return;
    lastActionToken = actionToken;
    actionStart = null;
    greetAt = null;
    activeAction = action !== "idle" && !reducedMotion;
    if (reducedMotion) applyPose(getMarvin3DActionPose(action, 1));
  });

  $effect(() => {
    if (!rigReady || !reducedMotion) return;
    introComplete = true;
    activeAction = false;
    announcePhase("online");
    applyPose(getMarvin3DGrapplePose(MARVIN_3D_GRAPPLE_DURATION, true));
  });

  // Reduced motion still honors deliberate pointer movement, without autoplay.
  $effect(() => {
    if (!rigReady || !reducedMotion) return;
    gazeYaw = pointerX * 0.3;
    gazePitch = pointerY * -0.14;
    applyPose(getMarvin3DActionPose("idle", 0));
    invalidate();
  });

  const animationTask = useTask(
    (delta) => {
      if (!rigReady || document.hidden) return;
      const now = performance.now() / 1000;
      clockStart ??= now;
      time = now - clockStart;

      let pose: Marvin3DPose;
      let cableVisible = false;
      let cableTension = 0;
      let cableHook = 1;

      if (!introComplete) {
        introStart ??= now;
        const entranceElapsed = Number.isNaN(frozenEntrance)
          ? Math.min(now - introStart, MARVIN_3D_GRAPPLE_DURATION)
          : Math.min(Math.max(frozenEntrance, 0), MARVIN_3D_GRAPPLE_DURATION - 0.01);
        const grapplePose = getMarvin3DGrapplePose(entranceElapsed, reducedMotion);
        announcePhase(grapplePose.phase);
        if (entranceElapsed >= MARVIN_3D_GRAPPLE_DURATION) {
          introComplete = true;
          greetAt = now + 0.5;
        }
        pose = grapplePose;
        cableVisible = grapplePose.cableVisible;
        cableTension = grapplePose.cableTension;
        cableHook = grapplePose.cableHookProgress;
      } else if (activeAction) {
        actionStart ??= now;
        const actionElapsed = Math.min(now - actionStart, MARVIN_3D_ACTION_DURATION);
        pose = getMarvin3DActionPose(action, actionElapsed / MARVIN_3D_ACTION_DURATION);
        if (actionElapsed >= MARVIN_3D_ACTION_DURATION) activeAction = false;
      } else if (greetAt !== null && now >= greetAt) {
        const greetElapsed = now - greetAt;
        pose = getMarvin3DActionPose("wave", Math.min(greetElapsed / MARVIN_3D_ACTION_DURATION, 1));
        if (greetElapsed >= MARVIN_3D_ACTION_DURATION) greetAt = null;
      } else {
        pose = getMarvin3DActionPose("idle", (time % MARVIN_3D_IDLE_PERIOD) / MARVIN_3D_IDLE_PERIOD);
      }

      applySecondary(delta, pose);
      applyPose(applySuspension(pose, delta), cableVisible, cableTension, cableHook);
    },
    { autoInvalidate: true },
  );

  // Reduced-motion users get static poses from the effects above instead.
  $effect(() => {
    if (reducedMotion) animationTask.stop();
    else animationTask.start();
  });
</script>

<!-- The anchor sits above the frame; the fired hook is visible mid-flight. -->
<T.Group bind:ref={cableGroup} visible={false}>
  <T.Mesh bind:ref={cableUpper} frustumCulled={false} castShadow material={grappleCableMaterial}>
    <T.CylinderGeometry args={[0.028, 0.028, 1, 8]} />
  </T.Mesh>
  <T.Mesh bind:ref={cableLower} frustumCulled={false} castShadow material={grappleCableMaterial}>
    <T.CylinderGeometry args={[0.028, 0.028, 1, 8]} />
  </T.Mesh>
  <T.Group bind:ref={hookGroup} visible={false}>
    <T.Mesh position={[0, 0.1, 0]} material={graphiteMaterial}>
      <T.ConeGeometry args={[0.075, 0.22, 10]} />
    </T.Mesh>
    <T.Mesh position={[0, -0.05, 0]} material={accentOrangeMaterial}>
      <T.CylinderGeometry args={[0.045, 0.045, 0.09, 10]} />
    </T.Mesh>
  </T.Group>
</T.Group>

<!-- Presentation rotation is isolated from the animated root transform. -->
<T.Group rotation={[viewPitch, viewYaw, 0]}>
  <T.Group bind:ref={root}>
    <MarvinTorso bind:chest />
    <MarvinHead bind:head bind:pupil bind:blink bind:antenna />
    <MarvinArm side={-1} hardpoint bind:shoulder={leftShoulder} bind:elbow={leftElbow} bind:hand={grappleHand} />
    <MarvinArm side={1} bind:shoulder={rightShoulder} bind:elbow={rightElbow} />
    <MarvinLeg side={-1} bind:hip={leftHip} bind:knee={leftKnee} bind:foot={leftFoot} />
    <MarvinLeg side={1} bind:hip={rightHip} bind:knee={rightKnee} bind:foot={rightFoot} />
  </T.Group>
</T.Group>
