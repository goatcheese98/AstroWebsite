<script lang="ts">
  import { T } from "@threlte/core";
  import type { Group } from "three";
  import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
  import {
    amberRingMaterial,
    antennaTipMaterial,
    frameMaterial,
    glintMaterial,
    graphiteMaterial,
    irisMaterial,
    jointMaterial,
    lensMaterial,
    shellBrightMaterial,
    shellMaterial,
  } from "./marvin-materials";

  let {
    head = $bindable(),
    pupil = $bindable(),
    blink = $bindable(),
    antenna = $bindable(),
  }: {
    head?: Group;
    pupil?: Group;
    blink?: Group;
    antenna?: Group;
  } = $props();
</script>

<!-- Neck and collar stay parented to the torso so head rotation reads as a turn. -->
<T.Mesh position={[0, 2.58, 0]} castShadow material={jointMaterial}>
  <T.CylinderGeometry args={[0.15, 0.18, 0.36, 16]} />
</T.Mesh>
<T.Mesh position={[0, 2.44, 0]} material={frameMaterial}>
  <T.CylinderGeometry args={[0.24, 0.28, 0.12, 18]} />
</T.Mesh>

<T.Group bind:ref={head} position={[0, 2.9, 0]}>
  <!-- One large rounded skull instead of stacked plates: silhouette first. -->
  <T.Mesh position={[0, 0.22, 0]} scale={[1, 0.94, 0.9]} castShadow material={shellBrightMaterial}>
    <T.SphereGeometry args={[0.62, 48, 32]} />
  </T.Mesh>

  <!-- The optic: dark housing, amber dial ring, glass dome, glowing iris. -->
  <T.Mesh position={[0, 0.2, 0.4]} rotation={[Math.PI / 2, 0, 0]} castShadow material={graphiteMaterial}>
    <T.CylinderGeometry args={[0.47, 0.5, 0.2, 40]} />
  </T.Mesh>
  <T.Mesh position={[0, 0.2, 0.51]} material={amberRingMaterial}>
    <T.TorusGeometry args={[0.435, 0.05, 14, 48]} />
  </T.Mesh>
  {#each [0, 1, 2, 3] as tick}
    <T.Mesh
      position={[Math.cos((tick * Math.PI) / 2) * 0.35, 0.2 + Math.sin((tick * Math.PI) / 2) * 0.35, 0.53]}
      rotation={[0, 0, (tick * Math.PI) / 2 + Math.PI / 2]}
      material={amberRingMaterial}
    >
      <T.BoxGeometry args={[0.02, 0.07, 0.015]} />
    </T.Mesh>
  {/each}
  <T.Mesh position={[0, 0.2, 0.4]} scale={[1, 1, 0.38]} material={lensMaterial}>
    <T.SphereGeometry args={[0.41, 40, 24]} />
  </T.Mesh>

  <!-- Pupil group shifts with gaze; blink group squashes vertically. -->
  <T.Group bind:ref={pupil} position={[0, 0.2, 0.46]}>
    <T.Group bind:ref={blink}>
      <T.Mesh position={[0, 0, 0.08]} scale={[1, 1, 0.42]} material={irisMaterial}>
        <T.SphereGeometry args={[0.24, 32, 20]} />
      </T.Mesh>
      <T.Mesh position={[-0.08, 0.09, 0.135]} scale={[1, 1, 0.5]} material={glintMaterial}>
        <T.SphereGeometry args={[0.05, 16, 12]} />
      </T.Mesh>
      <T.Mesh position={[0.07, -0.06, 0.13]} scale={[1, 1, 0.5]} material={glintMaterial}>
        <T.SphereGeometry args={[0.02, 10, 8]} />
      </T.Mesh>
    </T.Group>
  </T.Group>

  <!-- Amber brow dashes carry expression exactly like the SVG. -->
  <T.Mesh position={[-0.27, 0.74, 0.26]} rotation={[-0.55, 0, 0.55]} material={amberRingMaterial}>
    <T.CapsuleGeometry args={[0.024, 0.13, 6, 10]} />
  </T.Mesh>
  <T.Mesh position={[0.27, 0.74, 0.26]} rotation={[-0.55, 0, -0.55]} material={amberRingMaterial}>
    <T.CapsuleGeometry args={[0.024, 0.13, 6, 10]} />
  </T.Mesh>

  <!-- Ear pods. -->
  {#each [-1, 1] as side}
    <T.Mesh position={[side * 0.59, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow material={jointMaterial}>
      <T.CylinderGeometry args={[0.17, 0.17, 0.1, 20]} />
    </T.Mesh>
    <T.Mesh position={[side * 0.655, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} material={shellMaterial}>
      <T.CylinderGeometry args={[0.125, 0.145, 0.06, 20]} />
    </T.Mesh>
    <T.Mesh position={[side * 0.69, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} material={graphiteMaterial}>
      <T.CylinderGeometry args={[0.045, 0.045, 0.02, 12]} />
    </T.Mesh>
  {/each}

  <!-- Antenna pivots at its base so the spring sway reads naturally. -->
  <T.Group bind:ref={antenna} position={[0, 0.76, -0.04]}>
    <T.Mesh position={[0, 0.03, 0]} material={frameMaterial}>
      <T.CylinderGeometry args={[0.06, 0.08, 0.1, 12]} />
    </T.Mesh>
    <T.Mesh position={[0, 0.3, 0]} material={jointMaterial}>
      <T.CapsuleGeometry args={[0.026, 0.4, 6, 10]} />
    </T.Mesh>
    <T.Mesh position={[0, 0.56, 0]} material={antennaTipMaterial}>
      <T.SphereGeometry args={[0.085, 20, 14]} />
    </T.Mesh>
  </T.Group>

  <!-- Rear access panel keeps the back interesting during rotation. -->
  <T.Mesh position={[0, 0.24, -0.44]} material={frameMaterial}>
    <T is={RoundedBoxGeometry} args={[0.42, 0.3, 0.28, 3, 0.08]} />
  </T.Mesh>
</T.Group>
