<script lang="ts">
  import { T } from "@threlte/core";
  import type { Group } from "three";
  import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
  import {
    accentOrangeMaterial,
    frameMaterial,
    graphiteMaterial,
    jointMaterial,
    shellBrightMaterial,
    shellMaterial,
  } from "./marvin-materials";

  let {
    side,
    hardpoint = false,
    shoulder = $bindable(),
    elbow = $bindable(),
    hand = $bindable(),
  }: {
    side: -1 | 1;
    hardpoint?: boolean;
    shoulder?: Group;
    elbow?: Group;
    hand?: Group;
  } = $props();
</script>

<T.Group bind:ref={shoulder} position={[side * 1.06, 2.02, 0]}>
  <!-- Soft shoulder cap over a visible ball joint. -->
  <T.Mesh position={[side * 0.08, 0.06, 0]} scale={[1.05, 0.92, 1]} castShadow material={shellMaterial}>
    <T.SphereGeometry args={[0.3, 32, 20]} />
  </T.Mesh>
  <T.Mesh position={[0, -0.08, 0]} material={jointMaterial}>
    <T.SphereGeometry args={[0.19, 20, 14]} />
  </T.Mesh>

  <!-- Slim upper arm, chunky forearm: the Pathfinder proportion. -->
  <T.Mesh position={[0, -0.5, 0]} castShadow material={frameMaterial}>
    <T.CapsuleGeometry args={[0.12, 0.5, 6, 14]} />
  </T.Mesh>

  <T.Group bind:ref={elbow} position={[0, -0.88, 0]}>
    <T.Mesh material={jointMaterial}>
      <T.SphereGeometry args={[0.17, 20, 14]} />
    </T.Mesh>
    <T.Mesh position={[0, -0.42, 0]} castShadow material={shellMaterial}>
      <T.CapsuleGeometry args={[0.2, 0.44, 8, 20]} />
    </T.Mesh>
    <T.Mesh position={[0, -0.76, 0]} material={frameMaterial}>
      <T.CylinderGeometry args={[0.115, 0.13, 0.12, 14]} />
    </T.Mesh>

    {#if hardpoint}
      <!-- Cable hardpoint reads as a slim wristband and a stowage port, not a gadget. -->
      <T.Mesh position={[0, -0.66, 0]} material={accentOrangeMaterial}>
        <T.CylinderGeometry args={[0.205, 0.215, 0.07, 22]} />
      </T.Mesh>
      <T.Mesh position={[side * 0.195, -0.66, 0]} rotation={[0, 0, Math.PI / 2]} material={graphiteMaterial}>
        <T.CylinderGeometry args={[0.035, 0.035, 0.05, 12]} />
      </T.Mesh>
    {/if}

    <T.Group bind:ref={hand} position={[0, -0.95, 0]}>
      <T.Mesh castShadow material={frameMaterial}>
        <T is={RoundedBoxGeometry} args={[0.3, 0.3, 0.32, 3, 0.09]} />
      </T.Mesh>
      <T.Mesh position={[side * 0.02, 0.02, -0.17]} material={shellBrightMaterial}>
        <T is={RoundedBoxGeometry} args={[0.22, 0.2, 0.08, 2, 0.03]} />
      </T.Mesh>
      {#each [-0.09, 0, 0.09] as fingerX}
        <T.Mesh position={[fingerX, -0.21, 0.03]} rotation={[0.3, 0, 0]} material={jointMaterial}>
          <T.CapsuleGeometry args={[0.048, 0.14, 4, 10]} />
        </T.Mesh>
      {/each}
      <T.Mesh
        position={[side * 0.17, -0.08, 0.08]}
        rotation={[0.4, 0, side * 0.9]}
        material={jointMaterial}
      >
        <T.CapsuleGeometry args={[0.045, 0.1, 4, 10]} />
      </T.Mesh>
    </T.Group>
  </T.Group>
</T.Group>
