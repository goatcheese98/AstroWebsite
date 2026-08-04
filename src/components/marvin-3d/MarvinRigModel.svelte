<script lang="ts">
  import { T, useThrelte } from "@threlte/core";
  import type { Group } from "three";
  import type { MarvinRigPose } from "../../lib/marvin-rig";
  import MarvinArm from "./MarvinArm.svelte";
  import MarvinHead from "./MarvinHead.svelte";
  import MarvinLeg from "./MarvinLeg.svelte";
  import MarvinTorso from "./MarvinTorso.svelte";

  let {
    pose,
    viewYaw,
    viewPitch,
  }: {
    pose: MarvinRigPose;
    viewYaw: number;
    viewPitch: number;
  } = $props();

  const { invalidate } = useThrelte();

  let root = $state<Group>();
  let head = $state<Group>();
  let chest = $state<Group>();
  let leftShoulder = $state<Group>();
  let rightShoulder = $state<Group>();
  let leftElbow = $state<Group>();
  let rightElbow = $state<Group>();
  let leftHip = $state<Group>();
  let rightHip = $state<Group>();
  let leftKnee = $state<Group>();
  let rightKnee = $state<Group>();
  let leftFoot = $state<Group>();
  let rightFoot = $state<Group>();

  // Direct joint application — the console drives the rig, nothing animates.
  $effect(() => {
    if (
      !root || !head || !chest || !leftShoulder || !rightShoulder || !leftElbow ||
      !rightElbow || !leftHip || !rightHip || !leftKnee || !rightKnee
    ) return;

    root.rotation.y = pose.rootYaw;
    chest.rotation.set(0, pose.torsoYaw, pose.torsoLean);
    head.rotation.set(pose.headPitch, pose.headYaw, pose.headTilt);
    leftShoulder.rotation.set(pose.leftShoulderX, 0, pose.leftShoulderZ);
    rightShoulder.rotation.set(pose.rightShoulderX, 0, pose.rightShoulderZ);
    leftElbow.rotation.z = pose.leftElbowZ;
    rightElbow.rotation.z = pose.rightElbowZ;
    leftHip.rotation.set(pose.leftHipX, 0, pose.leftHipZ);
    rightHip.rotation.set(pose.rightHipX, 0, pose.rightHipZ);
    leftKnee.rotation.x = pose.leftKnee;
    rightKnee.rotation.x = pose.rightKnee;
    if (leftFoot) leftFoot.rotation.x = pose.leftAnkle;
    if (rightFoot) rightFoot.rotation.x = pose.rightAnkle;
    invalidate();
  });
</script>

<T.Group rotation={[viewPitch, viewYaw, 0]}>
  <T.Group bind:ref={root}>
    <MarvinTorso bind:chest />
    <MarvinHead bind:head />
    <MarvinArm side={-1} hardpoint bind:shoulder={leftShoulder} bind:elbow={leftElbow} />
    <MarvinArm side={1} bind:shoulder={rightShoulder} bind:elbow={rightElbow} />
    <MarvinLeg side={-1} bind:hip={leftHip} bind:knee={leftKnee} bind:foot={leftFoot} />
    <MarvinLeg side={1} bind:hip={rightHip} bind:knee={rightKnee} bind:foot={rightFoot} />
  </T.Group>
</T.Group>
