<script lang="ts">
  import { T } from "@threlte/core";
  import type { Marvin3DAction, Marvin3DGrapplePhase } from "../../lib/marvin-3d-motion";
  import MarvinModel from "./MarvinModel.svelte";

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

<T.PerspectiveCamera makeDefault position={[0, 1.5, 11]} fov={36} near={0.1} far={60} />

<T.HemisphereLight args={[0xfff3d6, 0x17202d, 1.9]} />
<T.DirectionalLight
  position={[-4.5, 8, 6]}
  intensity={4.4}
  color={0xffe1a6}
  castShadow
/>
<T.PointLight position={[4.5, 3.5, 4]} intensity={22} distance={14} color={0x67d8ff} />
<T.PointLight position={[-4, 1.2, -2]} intensity={12} distance={10} color={0xff9f43} />

<MarvinModel
  {action}
  {actionToken}
  {reducedMotion}
  {pointerX}
  {pointerY}
  {onReady}
  {onPhaseChange}
/>

<T.Mesh position={[0, -1.54, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
  <T.CircleGeometry args={[4.8, 64]} />
  <T.MeshStandardMaterial color={0x151b22} roughness={0.82} metalness={0.15} />
</T.Mesh>
