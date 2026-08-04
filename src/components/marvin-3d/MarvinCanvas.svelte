<script lang="ts">
  import { Canvas } from "@threlte/core";
  import { PCFShadowMap } from "three";
  import type { Marvin3DAction, Marvin3DGrapplePhase } from "../../lib/marvin-3d-motion";
  import MarvinScene from "./MarvinScene.svelte";

  let {
    action,
    actionToken,
    reducedMotion,
    pointerX,
    pointerY,
    onReady,
    onPhaseChange,
  }: {
    action: Marvin3DAction;
    actionToken: number;
    reducedMotion: boolean;
    pointerX: number;
    pointerY: number;
    onReady: () => void;
    onPhaseChange: (phase: Marvin3DGrapplePhase) => void;
  } = $props();
</script>

<Canvas
  dpr={1.5}
  renderMode="on-demand"
  shadows={PCFShadowMap}
  colorManagementEnabled
>
  <MarvinScene
    {action}
    {actionToken}
    {reducedMotion}
    {pointerX}
    {pointerY}
    {onReady}
    {onPhaseChange}
  />
</Canvas>
