<script lang="ts">
  import { Canvas } from "@threlte/core";
  import { NeutralToneMapping, PCFShadowMap } from "three";
  import type { MarvinRigPose } from "../../lib/marvin-rig";
  import MarvinRigModel from "./MarvinRigModel.svelte";
  import MarvinStage from "./MarvinStage.svelte";

  let {
    pose,
    viewYaw,
    viewPitch,
    stageTheme,
  }: {
    pose: MarvinRigPose;
    viewYaw: number;
    viewPitch: number;
    stageTheme: "light" | "dark";
  } = $props();

  const dpr = Math.min(globalThis.devicePixelRatio ?? 1.5, 2);
</script>

<Canvas
  {dpr}
  renderMode="on-demand"
  shadows={PCFShadowMap}
  toneMapping={NeutralToneMapping}
  colorManagementEnabled
>
  <MarvinStage {stageTheme}>
    <MarvinRigModel {pose} {viewYaw} {viewPitch} />
  </MarvinStage>
</Canvas>
