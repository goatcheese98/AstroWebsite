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
    grapple = false,
    shoulder = $bindable(),
    elbow = $bindable(),
    hand = $bindable(),
  }: {
    side: -1 | 1;
    grapple?: boolean;
    shoulder?: Group;
    elbow?: Group;
    hand?: Group;
  } = $props();
</script>

<T.Group bind:ref={shoulder} position={[side * 1.05, 2.24, 0]}>
  <!-- Ball joint inside an armored shoulder yoke. -->
  <T.Mesh castShadow material={jointMaterial}>
    <T.SphereGeometry args={[0.34, 18, 12]} />
  </T.Mesh>
  <T.Mesh position={[side * 0.21, 0.03, 0]} rotation={[0, 0, Math.PI / 2]} material={pistonMaterial}>
    <T.CylinderGeometry args={[0.2, 0.2, 0.2, 16]} />
  </T.Mesh>
  <T.Mesh position={[side * 0.31, 0.08, 0.02]} rotation={[0, 0, side * -0.12]} scale={[0.37, 0.5, 0.54]} castShadow material={armorMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>
  <T.Mesh position={[side * 0.38, 0.17, 0.04]} rotation={[0, 0, side * -0.12]} scale={[0.24, 0.13, 0.56]} castShadow material={armorLightMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>
  <T.Mesh position={[side * 0.43, -0.1, 0.06]} rotation={[0, 0, side * -0.12]} scale={[0.18, 0.16, 0.52]} material={safetyMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>

  <!-- Exposed upper-arm bone with split plate and piston. -->
  <T.Mesh position={[0, -0.52, 0]} material={jointMaterial}>
    <T.CylinderGeometry args={[0.13, 0.17, 0.94, 12]} />
  </T.Mesh>
  <T.Mesh position={[side * 0.12, -0.53, 0.05]} rotation={[0, 0, side * 0.08]} scale={[0.34, 0.72, 0.32]} castShadow material={armorMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>
  <T.Mesh position={[side * -0.14, -0.53, 0.17]} rotation={[0, 0, side * -0.04]} material={pistonMaterial}>
    <T.CylinderGeometry args={[0.045, 0.06, 0.72, 8]} />
  </T.Mesh>
  <T.Mesh position={[0, -0.5, -0.18]} rotation={[0, 0, side * 0.1]} material={cableMaterial}>
    <T.CylinderGeometry args={[0.028, 0.028, 0.74, 7]} />
  </T.Mesh>

  <T.Group bind:ref={elbow} position={[0, -1.02, 0]}>
    <T.Mesh rotation={[0, 0, Math.PI / 2]} castShadow material={jointMaterial}>
      <T.CylinderGeometry args={[0.24, 0.24, 0.46, 16]} />
    </T.Mesh>
    <T.Mesh position={[0, 0, 0.24]} rotation={[0, 0, Math.PI / 2]} material={safetyMaterial}>
      <T.CylinderGeometry args={[0.12, 0.12, 0.48, 12]} />
    </T.Mesh>

    <!-- Long forearm cage. Right arm adds a mechanical grapple spool. -->
    <T.Mesh position={[0, -0.52, 0]} material={jointMaterial}>
      <T.CylinderGeometry args={[0.12, 0.16, 0.9, 12]} />
    </T.Mesh>
    <T.Mesh position={[side * 0.13, -0.5, 0.06]} scale={[0.34, 0.72, 0.36]} castShadow material={armorLightMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    <T.Mesh position={[side * -0.13, -0.5, 0.18]} material={pistonMaterial}>
      <T.CylinderGeometry args={[0.045, 0.06, 0.7, 8]} />
    </T.Mesh>

    {#if grapple}
      <T.Mesh position={[0.27, -0.42, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow material={graphiteMaterial}>
        <T.TorusGeometry args={[0.21, 0.08, 10, 24]} />
      </T.Mesh>
      <T.Mesh position={[0.27, -0.42, 0]} rotation={[Math.PI / 2, 0, 0]} material={safetyMaterial}>
        <T.CylinderGeometry args={[0.12, 0.12, 0.14, 12]} />
      </T.Mesh>
    {/if}

    <T.Group bind:ref={hand} position={[0, -1.0, 0.08]}>
      <T.Mesh scale={[0.44, 0.34, 0.4]} castShadow material={graphiteMaterial}>
        <T.BoxGeometry args={[1, 1, 1]} />
      </T.Mesh>
      <T.Mesh position={[0, 0.03, 0.23]} scale={[0.34, 0.24, 0.12]} material={armorMaterial}>
        <T.BoxGeometry args={[1, 1, 1]} />
      </T.Mesh>
      {#each [-0.14, 0, 0.14] as fingerX}
        <T.Group position={[fingerX, -0.24, 0.08]} rotation={[0.18, 0, side * fingerX * 0.7]}>
          <T.Mesh position={[0, -0.13, 0]} material={pistonMaterial}>
            <T.CylinderGeometry args={[0.035, 0.045, 0.27, 8]} />
          </T.Mesh>
          <T.Mesh position={[0, -0.28, 0.03]} rotation={[0.18, 0, 0]} material={jointMaterial}>
            <T.CylinderGeometry args={[0.03, 0.04, 0.18, 8]} />
          </T.Mesh>
        </T.Group>
      {/each}
      <T.Mesh position={[side * 0.27, -0.03, 0.08]} rotation={[0, 0, side * 0.62]} material={pistonMaterial}>
        <T.CylinderGeometry args={[0.04, 0.05, 0.3, 8]} />
      </T.Mesh>
      {#if grapple}
        <T.Mesh position={[0, 0.07, 0.34]} rotation={[Math.PI / 2, 0, 0]} material={safetyMaterial}>
          <T.ConeGeometry args={[0.1, 0.3, 10]} />
        </T.Mesh>
      {/if}
    </T.Group>
  </T.Group>
</T.Group>
