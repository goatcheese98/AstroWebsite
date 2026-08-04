<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { onMount } from "svelte";
  import { Group, MathUtils, Mesh, Vector3 } from "three";
  import {
    MARVIN_3D_ACTION_DURATION,
    MARVIN_3D_GRAPPLE_DURATION,
    getMarvin3DActionPose,
    getMarvin3DGrapplePose,
    type Marvin3DAction,
    type Marvin3DGrapplePhase,
    type Marvin3DPose,
  } from "../../lib/marvin-3d-motion";
  import MarvinArm from "./MarvinArm.svelte";
  import MarvinHead from "./MarvinHead.svelte";
  import MarvinLeg from "./MarvinLeg.svelte";
  import MarvinTorso from "./MarvinTorso.svelte";
  import { grappleCableMaterial } from "./marvin-materials";

  const cableAnchor = new Vector3(3.65, 4.6, 0.1);
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

  let root = $state<Group>();
  let head = $state<Group>();
  let leftShoulder = $state<Group>();
  let rightShoulder = $state<Group>();
  let leftElbow = $state<Group>();
  let rightElbow = $state<Group>();
  let rightHand = $state<Group>();
  let leftHip = $state<Group>();
  let rightHip = $state<Group>();
  let leftKnee = $state<Group>();
  let rightKnee = $state<Group>();
  let cableGroup = $state<Group>();
  let cableUpper = $state<Mesh>();
  let cableLower = $state<Mesh>();

  let entranceElapsed = 0;
  let actionElapsed = 0;
  let lastActionToken = 0;
  let lastPhase: Marvin3DGrapplePhase | null = null;
  let introComplete = $state(false);
  let activeAction = $state(false);
  let rigReady = $state(false);
  let pageVisible = $state(true);

  onMount(() => {
    const updateVisibility = () => (pageVisible = !document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  });

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

  function updateCable(visible: boolean, tension: number) {
    if (!cableGroup || !cableUpper || !cableLower || !rightHand || !root) return;
    cableGroup.visible = visible;
    if (!visible) return;

    root.updateWorldMatrix(true, true);
    rightHand.getWorldPosition(handPosition);
    cableMiddle.copy(cableAnchor).lerp(handPosition, 0.52);
    cableMiddle.y -= MathUtils.lerp(0.55, 0.05, tension);
    alignCableSegment(cableUpper, cableAnchor, cableMiddle);
    alignCableSegment(cableLower, cableMiddle, handPosition);
  }

  function applyPose(pose: Marvin3DPose, cableVisible = false, cableTension = 0) {
    if (
      !rigReady || !root || !head || !leftShoulder || !rightShoulder || !leftElbow ||
      !rightElbow || !leftHip || !rightHip || !leftKnee || !rightKnee
    ) return;

    root.position.set(pose.root.x, pose.root.y, pose.root.z);
    root.rotation.set(0, pose.root.rotationY, pose.root.rotationZ);
    leftShoulder.rotation.z = pose.leftShoulderZ;
    rightShoulder.rotation.z = pose.rightShoulderZ;
    leftElbow.rotation.z = pose.leftElbowZ;
    rightElbow.rotation.z = pose.rightElbowZ;
    leftHip.rotation.z = pose.leftHipZ;
    rightHip.rotation.z = pose.rightHipZ;
    leftKnee.rotation.x = pose.kneeBend;
    rightKnee.rotation.x = pose.kneeBend;
    head.rotation.set(pointerY * 0.07, pointerX * 0.18, pose.headTiltZ);
    updateCable(cableVisible, cableTension);
  }

  $effect(() => {
    if (
      root && head && leftShoulder && rightShoulder && leftElbow && rightElbow && rightHand &&
      leftHip && rightHip && leftKnee && rightKnee && cableGroup && cableUpper && cableLower && !rigReady
    ) {
      rigReady = true;
      const pose = getMarvin3DGrapplePose(reducedMotion ? MARVIN_3D_GRAPPLE_DURATION : 0, reducedMotion);
      applyPose(pose, pose.cableVisible, pose.cableTension);
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
    actionElapsed = 0;
    activeAction = action !== "idle" && !reducedMotion;
    if (reducedMotion) applyPose(getMarvin3DActionPose(action, 1));
  });

  $effect(() => {
    if (!rigReady || !reducedMotion) return;
    entranceElapsed = MARVIN_3D_GRAPPLE_DURATION;
    introComplete = true;
    activeAction = false;
    announcePhase("online");
    applyPose(getMarvin3DGrapplePose(MARVIN_3D_GRAPPLE_DURATION, true));
  });

  $effect(() => {
    if (!rigReady || !introComplete || activeAction) return;
    applyPose(getMarvin3DActionPose("idle", 0));
  });

  useTask(
    (delta) => {
      if (!rigReady || document.hidden) return;

      if (!introComplete) {
        entranceElapsed = Math.min(entranceElapsed + delta, MARVIN_3D_GRAPPLE_DURATION);
        const pose = getMarvin3DGrapplePose(entranceElapsed, reducedMotion);
        announcePhase(pose.phase);
        applyPose(pose, pose.cableVisible, pose.cableTension);
        if (pose.phase === "online") introComplete = true;
        return;
      }

      if (activeAction) {
        actionElapsed = Math.min(actionElapsed + delta, MARVIN_3D_ACTION_DURATION);
        applyPose(getMarvin3DActionPose(action, actionElapsed / MARVIN_3D_ACTION_DURATION));
        if (actionElapsed >= MARVIN_3D_ACTION_DURATION) {
          activeAction = false;
          applyPose(getMarvin3DActionPose("idle", 0));
        }
      }
    },
    {
      running: () => pageVisible && !reducedMotion && (!introComplete || activeAction),
      autoInvalidate: true,
    },
  );
</script>

<T.Group bind:ref={cableGroup} renderOrder={12}>
  <T.Mesh bind:ref={cableUpper} frustumCulled={false} material={grappleCableMaterial}>
    <T.CylinderGeometry args={[0.025, 0.025, 1, 8]} />
  </T.Mesh>
  <T.Mesh bind:ref={cableLower} frustumCulled={false} material={grappleCableMaterial}>
    <T.CylinderGeometry args={[0.025, 0.025, 1, 8]} />
  </T.Mesh>
</T.Group>

<!-- Presentation rotation is isolated from the animated root transform. -->
<T.Group rotation={[viewPitch, viewYaw, 0]}>
  <T.Group bind:ref={root}>
    <MarvinTorso />
    <MarvinHead bind:head />
    <MarvinArm side={-1} bind:shoulder={leftShoulder} bind:elbow={leftElbow} />
    <MarvinArm side={1} grapple bind:shoulder={rightShoulder} bind:elbow={rightElbow} bind:hand={rightHand} />
    <MarvinLeg side={-1} bind:hip={leftHip} bind:knee={leftKnee} />
    <MarvinLeg side={1} bind:hip={rightHip} bind:knee={rightKnee} />
  </T.Group>
</T.Group>
