<script lang="ts">
  import { T } from "@threlte/core";
  import {
    armorLightMaterial,
    armorMaterial,
    cableMaterial,
    graphiteMaterial,
    jointMaterial,
    pistonMaterial,
    safetyMaterial,
    screenInkMaterial,
    screenMaterial,
  } from "./marvin-materials";
</script>

<!-- Pelvis, flexible waist and lower counterweight. -->
<T.Mesh position={[0, 0.08, 0]} scale={[1.08, 0.48, 0.72]} castShadow material={graphiteMaterial}>
  <T.BoxGeometry args={[1, 1, 1]} />
</T.Mesh>
<T.Mesh position={[0, 0.09, 0.49]} scale={[0.72, 0.26, 0.2]} castShadow material={safetyMaterial}>
  <T.BoxGeometry args={[1, 1, 1]} />
</T.Mesh>
<T.Mesh position={[0, 0.62, 0]} castShadow material={jointMaterial}>
  <T.CylinderGeometry args={[0.38, 0.32, 0.78, 18]} />
</T.Mesh>
{#each [-1, 1] as side}
  <T.Mesh position={[side * 0.38, 0.64, 0.08]} rotation={[0, 0, side * 0.11]} material={pistonMaterial}>
    <T.CylinderGeometry args={[0.055, 0.075, 0.74, 10]} />
  </T.Mesh>
{/each}

<!-- Broad chest frame: the display is the robot's primary face. -->
<T.Group position={[0, 1.62, 0]}>
  <T.Mesh position={[0, 0, -0.17]} scale={[1.48, 1.48, 0.76]} castShadow material={graphiteMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>
  <T.Mesh position={[0, 0.03, 0.03]} scale={[1.32, 1.31, 0.68]} castShadow material={armorMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>

  <!-- Layered shoulder rails and safety corners make the silhouette read at distance. -->
  {#each [-1, 1] as side}
    <T.Mesh position={[side * 0.78, 0.19, 0]} rotation={[0, 0, side * 0.08]} scale={[0.25, 1.28, 0.74]} castShadow material={armorLightMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    <T.Mesh position={[side * 0.77, 0.62, 0.43]} rotation={[0, 0, side * 0.08]} scale={[0.21, 0.22, 0.08]} material={safetyMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    <T.Mesh position={[side * 0.79, -0.48, 0.42]} rotation={[Math.PI / 2, 0, 0]} material={pistonMaterial}>
      <T.CylinderGeometry args={[0.07, 0.07, 0.09, 12]} />
    </T.Mesh>
  {/each}

  <!-- Deep bezel and large emotional display. -->
  <T.Mesh position={[0, 0.02, 0.48]} scale={[1.06, 0.96, 0.17]} castShadow material={graphiteMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>
  <T.Mesh position={[0, 0.02, 0.59]} scale={[0.91, 0.79, 0.09]} material={screenMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>
  {#each [-0.24, 0.24] as eyeX}
    <T.Mesh position={[eyeX, 0.18, 0.65]} scale={[0.09, 0.035, 0.012]} material={screenInkMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
  {/each}
  {#each [-0.24, -0.12, 0, 0.12, 0.24] as smileX, index}
    <T.Mesh
      position={[smileX, -0.17 - Math.abs(index - 2) * 0.035, 0.65]}
      rotation={[0, 0, (index - 2) * 0.09]}
      scale={[0.105, 0.026, 0.012]}
      material={screenInkMaterial}
    >
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
  {/each}

  <T.Mesh position={[0, 0.71, 0.04]} scale={[0.78, 0.13, 0.7]} castShadow material={safetyMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>
  <T.Mesh position={[0, -0.71, 0.02]} scale={[0.9, 0.13, 0.71]} castShadow material={jointMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>

  <!-- Rear spine, counterweights and cable routing remain visible in rotation. -->
  <T.Mesh position={[0, 0, -0.69]} scale={[0.42, 1.36, 0.26]} castShadow material={graphiteMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>
  {#each [-1, 1] as side}
    <T.Mesh position={[side * 0.37, 0.08, -0.75]} castShadow material={jointMaterial}>
      <T.CylinderGeometry args={[0.14, 0.16, 1.08, 12]} />
    </T.Mesh>
    <T.Mesh position={[side * 0.56, 0.2, -0.77]} rotation={[0, 0, side * 0.13]} material={cableMaterial}>
      <T.TorusGeometry args={[0.25, 0.035, 8, 18, Math.PI * 1.35]} />
    </T.Mesh>
  {/each}
  {#each [-0.46, -0.16, 0.16, 0.46] as railY}
    <T.Mesh position={[0, railY, -0.86]} scale={[0.62, 0.055, 0.07]} material={pistonMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
  {/each}
</T.Group>
