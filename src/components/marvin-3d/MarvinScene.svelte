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
</script>

<T.PerspectiveCamera makeDefault position={[0, 0.75, 12.4]} fov={35} near={0.1} far={60} />

<T.HemisphereLight args={[0xd8edf1, 0x111920, 2.15]} />
<T.DirectionalLight
  position={[-4.5, 8, 6.5]}
  intensity={4.8}
  color={0xe8f4f2}
  castShadow
/>
<T.PointLight position={[4.5, 3.5, 4]} intensity={24} distance={14} color={0x52c7da} />
<T.PointLight position={[-4, 1.2, -2]} intensity={10} distance={10} color={0xd6a92f} />
<T.PointLight position={[0, 4, -4]} intensity={15} distance={10} color={0x8fa4a8} />

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

<T.Mesh position={[0, -2.58, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
  <T.CircleGeometry args={[4.8, 64]} />
  <T.MeshStandardMaterial color={0x151b22} roughness={0.82} metalness={0.15} />
</T.Mesh>
