<script lang="ts">
  import { T } from "@threlte/core";
  import type { Group } from "three";
  import {
    armorLightMaterial,
    armorMaterial,
    cableMaterial,
    graphiteMaterial,
    jointMaterial,
    pistonMaterial,
    safetyMaterial,
  } from "./marvin-materials";

  let {
    side,
    hip = $bindable(),
    knee = $bindable(),
  }: {
    side: -1 | 1;
    hip?: Group;
    knee?: Group;
  } = $props();
</script>

<T.Group bind:ref={hip} position={[side * 0.55, 0.02, 0]}>
  <T.Mesh rotation={[0, 0, Math.PI / 2]} castShadow material={jointMaterial}>
    <T.CylinderGeometry args={[0.29, 0.29, 0.45, 16]} />
  </T.Mesh>
  <T.Mesh position={[side * 0.17, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={safetyMaterial}>
    <T.CylinderGeometry args={[0.13, 0.13, 0.18, 12]} />
  </T.Mesh>

  <!-- Tall, open thigh structure with armor on the outside. -->
  <T.Mesh position={[0, -0.62, 0]} material={jointMaterial}>
    <T.CylinderGeometry args={[0.14, 0.18, 1.08, 12]} />
  </T.Mesh>
  <T.Mesh position={[side * 0.14, -0.6, 0.03]} rotation={[0, 0, side * 0.06]} scale={[0.34, 0.82, 0.36]} castShadow material={armorMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>
  <T.Mesh position={[side * -0.16, -0.61, 0.18]} rotation={[0, 0, side * -0.03]} material={pistonMaterial}>
    <T.CylinderGeometry args={[0.05, 0.07, 0.86, 9]} />
  </T.Mesh>
  <T.Mesh position={[0, -0.62, -0.19]} material={cableMaterial}>
    <T.CylinderGeometry args={[0.03, 0.03, 0.84, 7]} />
  </T.Mesh>

  <T.Group bind:ref={knee} position={[0, -1.18, 0]}>
    <T.Mesh rotation={[0, 0, Math.PI / 2]} castShadow material={jointMaterial}>
      <T.CylinderGeometry args={[0.27, 0.27, 0.5, 16]} />
    </T.Mesh>
    <T.Mesh position={[0, 0, 0.25]} scale={[0.3, 0.34, 0.16]} castShadow material={safetyMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>

    <!-- Reverse-taper shin cage and rear hydraulic. -->
    <T.Mesh position={[0, -0.58, 0]} material={jointMaterial}>
      <T.CylinderGeometry args={[0.12, 0.16, 1.02, 12]} />
    </T.Mesh>
    <T.Mesh position={[side * 0.13, -0.54, 0.06]} rotation={[0, 0, side * -0.05]} scale={[0.32, 0.76, 0.34]} castShadow material={armorLightMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    <T.Mesh position={[side * -0.15, -0.55, 0.16]} rotation={[0, 0, side * 0.04]} material={pistonMaterial}>
      <T.CylinderGeometry args={[0.045, 0.065, 0.78, 8]} />
    </T.Mesh>

    <T.Mesh position={[0, -1.08, 0]} rotation={[0, 0, Math.PI / 2]} castShadow material={jointMaterial}>
      <T.CylinderGeometry args={[0.18, 0.18, 0.4, 12]} />
    </T.Mesh>

    <!-- Split toe/heel stabilizer gives a readable mechanical footprint. -->
    <T.Mesh position={[0, -1.28, 0.27]} rotation={[-0.08, 0, 0]} scale={[0.86, 0.22, 0.92]} castShadow material={graphiteMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    <T.Mesh position={[0, -1.24, 0.55]} rotation={[-0.12, 0, 0]} scale={[0.78, 0.2, 0.58]} castShadow material={armorMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    <T.Mesh position={[0, -1.24, -0.34]} rotation={[0.08, 0, 0]} scale={[0.66, 0.24, 0.46]} castShadow material={safetyMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    {#each [-0.2, 0.2] as toeX}
      <T.Mesh position={[toeX * 1.35, -1.4, 0.65]} scale={[0.3, 0.08, 0.24]} material={pistonMaterial}>
        <T.BoxGeometry args={[1, 1, 1]} />
      </T.Mesh>
    {/each}
  </T.Group>
</T.Group>
