<script lang="ts">
  import { T } from "@threlte/core";
  import type { Group } from "three";
  import {
    armorLightMaterial,
    armorMaterial,
    cableMaterial,
    graphiteMaterial,
    jointMaterial,
    opticMaterial,
    pistonMaterial,
    safetyMaterial,
  } from "./marvin-materials";

  let { head = $bindable() }: { head?: Group } = $props();
</script>

<T.Mesh position={[0, 2.53, 0]} material={jointMaterial}>
  <T.CylinderGeometry args={[0.24, 0.3, 0.46, 16]} />
</T.Mesh>
<T.Group bind:ref={head} position={[0, 3.02, 0]}>
  <T.Mesh scale={[0.7, 0.48, 0.58]} castShadow material={graphiteMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>
  <T.Mesh position={[0, 0.03, 0.1]} scale={[0.57, 0.38, 0.57]} castShadow material={armorMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>
  <T.Mesh position={[0, 0, 0.56]} rotation={[Math.PI / 2, 0, 0]} castShadow material={graphiteMaterial}>
    <T.CylinderGeometry args={[0.31, 0.36, 0.22, 20]} />
  </T.Mesh>
  <T.Mesh position={[0, 0, 0.69]} rotation={[Math.PI / 2, 0, 0]} material={pistonMaterial}>
    <T.TorusGeometry args={[0.22, 0.055, 10, 28]} />
  </T.Mesh>
  <T.Mesh position={[0, 0, 0.72]} scale={[0.18, 0.18, 0.11]} material={opticMaterial}>
    <T.SphereGeometry args={[1, 20, 14]} />
  </T.Mesh>

  {#each [-1, 1] as side}
    <T.Mesh position={[side * 0.42, 0.02, 0.02]} rotation={[0, 0, Math.PI / 2]} material={jointMaterial}>
      <T.CylinderGeometry args={[0.12, 0.12, 0.18, 12]} />
    </T.Mesh>
    <T.Mesh position={[side * 0.53, 0.02, 0.02]} rotation={[0, 0, Math.PI / 2]} material={armorLightMaterial}>
      <T.CylinderGeometry args={[0.08, 0.1, 0.08, 12]} />
    </T.Mesh>
  {/each}

  <T.Mesh position={[-0.26, 0.34, 0.12]} rotation={[0, 0, -0.42]} scale={[0.28, 0.09, 0.18]} material={safetyMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>
  <T.Mesh position={[0.25, 0.35, 0.1]} rotation={[0, 0, 0.38]} scale={[0.24, 0.08, 0.17]} material={armorLightMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>
  <T.Mesh position={[0.3, 0.62, -0.03]} rotation={[0, 0, -0.12]} material={pistonMaterial}>
    <T.CylinderGeometry args={[0.03, 0.04, 0.48, 8]} />
  </T.Mesh>
  <T.Mesh position={[0.33, 0.88, -0.03]} material={opticMaterial}>
    <T.SphereGeometry args={[0.065, 10, 8]} />
  </T.Mesh>
  <T.Mesh position={[-0.33, -0.28, -0.25]} rotation={[0, 0, 0.3]} material={cableMaterial}>
    <T.TorusGeometry args={[0.21, 0.025, 8, 16, Math.PI]} />
  </T.Mesh>
</T.Group>
