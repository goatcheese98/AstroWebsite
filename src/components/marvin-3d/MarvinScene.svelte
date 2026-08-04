<script lang="ts">
  import type { Marvin3DAction, Marvin3DGrapplePhase } from "../../lib/marvin-3d-motion";
  import MarvinModel from "./MarvinModel.svelte";
  import MarvinStage from "./MarvinStage.svelte";

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
</script>

<MarvinStage {stageTheme}>
  <MarvinModel
    {action}
    {actionToken}
    {reducedMotion}
    {pointerX}
    {pointerY}
    {viewYaw}
    {viewPitch}
    {onReady}
    {onPhaseChange}
  />
</MarvinStage>
