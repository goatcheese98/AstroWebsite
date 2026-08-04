<script lang="ts">
  import { T } from "@threlte/core";
  import type { Group } from "three";
  import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
  import {
    accentOrangeMaterial,
    createMarvinTagMaterial,
    frameMaterial,
    graphiteMaterial,
    indicatorAmberMaterial,
    indicatorBlueMaterial,
    indicatorGreenMaterial,
    inkMaterial,
    jointMaterial,
    screenMaterial,
    shellBrightMaterial,
    shellMaterial,
  } from "./marvin-materials";

  let { chest = $bindable() }: { chest?: Group } = $props();

  const tagMaterial = createMarvinTagMaterial();
</script>

<!-- Pelvis with the orange belt from the 2D suit. -->
<T.Mesh position={[0, 0.02, 0]} castShadow material={shellMaterial}>
  <T is={RoundedBoxGeometry} args={[1.06, 0.5, 0.74, 4, 0.14]} />
</T.Mesh>
<T.Mesh position={[0, 0.26, 0]} castShadow material={accentOrangeMaterial}>
  <T is={RoundedBoxGeometry} args={[1.1, 0.15, 0.78, 3, 0.06]} />
</T.Mesh>
<T.Mesh position={[0, 0.26, 0.41]} material={graphiteMaterial}>
  <T is={RoundedBoxGeometry} args={[0.2, 0.1, 0.05, 2, 0.02]} />
</T.Mesh>

<!-- Flexible waist column. -->
<T.Mesh position={[0, 0.46, 0]} castShadow material={frameMaterial}>
  <T.CylinderGeometry args={[0.3, 0.34, 0.55, 22]} />
</T.Mesh>

<T.Group bind:ref={chest} position={[0, 1.58, 0]}>
  <!-- Two rounded masses make the whole torso: chest and belly. -->
  <T.Mesh position={[0, 0.05, -0.02]} castShadow material={shellMaterial}>
    <T is={RoundedBoxGeometry} args={[1.86, 1.42, 1.08, 5, 0.2]} />
  </T.Mesh>
  <T.Mesh position={[0, -0.72, -0.04]} castShadow material={shellBrightMaterial}>
    <T is={RoundedBoxGeometry} args={[1.34, 0.62, 0.86, 4, 0.18]} />
  </T.Mesh>
  <T.Mesh position={[0, 0.78, 0.08]} material={frameMaterial}>
    <T is={RoundedBoxGeometry} args={[0.76, 0.18, 0.52, 3, 0.06]} />
  </T.Mesh>

  <!-- Chest screen: the play surface, wearing the classic smiley. -->
  <T.Mesh position={[0, 0.08, 0.52]} castShadow material={graphiteMaterial}>
    <T is={RoundedBoxGeometry} args={[1.12, 0.9, 0.14, 3, 0.06]} />
  </T.Mesh>
  <T.Mesh position={[0, 0.08, 0.585]} material={screenMaterial}>
    <T is={RoundedBoxGeometry} args={[0.98, 0.76, 0.05, 3, 0.035]} />
  </T.Mesh>
  {#each [-0.2, 0.2] as eyeX}
    <T.Mesh position={[eyeX, 0.24, 0.625]} material={inkMaterial}>
      <T.CapsuleGeometry args={[0.026, 0.07, 4, 8]} />
    </T.Mesh>
  {/each}
  <T.Mesh position={[0, 0.09, 0.625]} rotation={[0, 0, Math.PI + Math.PI * 0.19]} material={inkMaterial}>
    <T.TorusGeometry args={[0.17, 0.024, 8, 24, Math.PI * 0.62]} />
  </T.Mesh>
  {#each [indicatorGreenMaterial, indicatorBlueMaterial, indicatorAmberMaterial] as dotMaterial, index}
    <T.Mesh position={[0.3 + index * 0.09, -0.35, 0.6]} material={dotMaterial}>
      <T.SphereGeometry args={[0.026, 10, 8]} />
    </T.Mesh>
  {/each}
  {#each [0, 1, 2] as vent}
    <T.Mesh position={[-0.52, -0.28 - vent * 0.06, 0.56]} material={frameMaterial}>
      <T.BoxGeometry args={[0.22, 0.026, 0.04]} />
    </T.Mesh>
  {/each}
  <T.Mesh position={[-0.7, 0.3, 0.545]} material={tagMaterial}>
    <T.PlaneGeometry args={[0.24, 0.24]} />
  </T.Mesh>

  <!-- Back pack, spine rails and the orange cable loop seen in rotation. -->
  <T.Mesh position={[0, 0.08, -0.6]} castShadow material={frameMaterial}>
    <T is={RoundedBoxGeometry} args={[1.28, 1.02, 0.34, 4, 0.1]} />
  </T.Mesh>
  {#each [-1, 1] as side}
    <T.Mesh position={[side * 0.28, 0.06, -0.79]} material={jointMaterial}>
      <T.CylinderGeometry args={[0.05, 0.05, 0.88, 10]} />
    </T.Mesh>
  {/each}
  <T.Mesh position={[0.44, 0.42, -0.72]} rotation={[0, 0, -0.5]} material={accentOrangeMaterial}>
    <T.TorusGeometry args={[0.16, 0.03, 8, 20, Math.PI * 1.2]} />
  </T.Mesh>
</T.Group>
