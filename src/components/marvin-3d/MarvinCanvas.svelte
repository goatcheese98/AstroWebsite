<script lang="ts">
  import { Canvas } from "@threlte/core";
  import { NeutralToneMapping, PCFShadowMap } from "three";
  import type { Marvin3DAction, Marvin3DGrapplePhase } from "../../lib/marvin-3d-motion";
  import MarvinScene from "./MarvinScene.svelte";

  let {
    action,
    actionToken,
    reducedMotion,
    pointerX,
    pointerY,
    viewYaw,
    viewPitch,
    stageTheme,
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
    stageTheme: "light" | "dark";
    onReady: () => void;
    onPhaseChange: (phase: Marvin3DGrapplePhase) => void;
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
  <MarvinScene
    {action}
    {actionToken}
    {reducedMotion}
    {pointerX}
    {pointerY}
    {viewYaw}
    {viewPitch}
    {stageTheme}
    {onReady}
    {onPhaseChange}
  />
</Canvas>
