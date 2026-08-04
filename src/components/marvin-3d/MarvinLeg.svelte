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
    hip = $bindable(),
    knee = $bindable(),
    foot = $bindable(),
  }: {
    side: -1 | 1;
    hip?: Group;
    knee?: Group;
    foot?: Group;
  } = $props();
</script>

<T.Group bind:ref={hip} position={[side * 0.42, -0.06, 0]}>
  <T.Mesh material={jointMaterial}>
    <T.SphereGeometry args={[0.22, 20, 14]} />
  </T.Mesh>
  <T.Mesh position={[0, -0.52, 0]} castShadow material={shellMaterial}>
    <T.CapsuleGeometry args={[0.165, 0.55, 8, 18]} />
  </T.Mesh>

  <T.Group bind:ref={knee} position={[0, -1.1, 0]}>
    <T.Mesh rotation={[0, 0, Math.PI / 2]} castShadow material={jointMaterial}>
      <T.CylinderGeometry args={[0.18, 0.18, 0.3, 18]} />
    </T.Mesh>
    <T.Mesh position={[0, 0.02, 0.17]} castShadow material={shellBrightMaterial}>
      <T is={RoundedBoxGeometry} args={[0.24, 0.26, 0.14, 3, 0.06]} />
    </T.Mesh>

    <!-- Chunky shin with a rear strut, planted in a big friendly boot. -->
    <T.Mesh position={[0, -0.52, 0.02]} castShadow material={shellMaterial}>
      <T.CapsuleGeometry args={[0.19, 0.5, 8, 20]} />
    </T.Mesh>
    <T.Mesh position={[0, -0.5, -0.17]} material={frameMaterial}>
      <T.CylinderGeometry args={[0.05, 0.06, 0.52, 10]} />
    </T.Mesh>
    <T.Mesh position={[0, -1.02, 0]} material={jointMaterial}>
      <T.SphereGeometry args={[0.13, 16, 12]} />
    </T.Mesh>

    <!-- Ankle pivot: the whole boot rotates so feet can slap flat or point. -->
    <T.Group bind:ref={foot} position={[0, -1.06, 0]}>
      <T.Mesh position={[0, -0.14, 0.12]} castShadow material={graphiteMaterial}>
        <T is={RoundedBoxGeometry} args={[0.46, 0.3, 0.72, 4, 0.1]} />
      </T.Mesh>
      <T.Mesh position={[0, -0.19, 0.48]} castShadow material={shellMaterial}>
        <T is={RoundedBoxGeometry} args={[0.4, 0.22, 0.28, 3, 0.08]} />
      </T.Mesh>
      <T.Mesh position={[0, -0.17, -0.26]} material={frameMaterial}>
        <T is={RoundedBoxGeometry} args={[0.4, 0.24, 0.2, 3, 0.06]} />
      </T.Mesh>
      <T.Mesh position={[side * 0.235, -0.08, 0.22]} material={accentOrangeMaterial}>
        <T is={RoundedBoxGeometry} args={[0.04, 0.05, 0.3, 2, 0.015]} />
      </T.Mesh>
      <T.Mesh position={[0, -0.315, 0.1]} material={graphiteMaterial}>
        <T is={RoundedBoxGeometry} args={[0.48, 0.09, 0.8, 2, 0.03]} />
      </T.Mesh>
    </T.Group>
  </T.Group>
</T.Group>
