<script lang="ts">
  import { T, useThrelte } from "@threlte/core";
  import { onMount, type Snippet } from "svelte";
  import { PMREMGenerator } from "three";
  import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
  import { irisMaterial, screenMaterial } from "./marvin-materials";

  let {
    stageTheme,
    children,
  }: {
    stageTheme: "light" | "dark";
    children?: Snippet;
  } = $props();

  const { renderer, scene, invalidate } = useThrelte();
  let dark = $derived(stageTheme === "dark");

  // A neutral studio environment gives the shell its soft gradients — this is
  // what lets a light robot read against a pure white page.
  onMount(() => {
    const pmrem = new PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    invalidate();
    return () => {
      scene.environment = null;
      environment.dispose();
      pmrem.dispose();
    };
  });

  $effect(() => {
    scene.environmentIntensity = dark ? 0.5 : 0.62;
    irisMaterial.emissiveIntensity = dark ? 2.6 : 1.9;
    screenMaterial.emissiveIntensity = dark ? 0.62 : 0.38;
    invalidate();
  });
</script>

<T.PerspectiveCamera makeDefault position={[0, 0.9, 13.4]} fov={36} near={0.1} far={60} />

<T.DirectionalLight
  position={[-4.5, 7.5, 6]}
  intensity={dark ? 2.7 : 2.3}
  color={0xfff6ea}
  castShadow
  shadow.mapSize.width={1024}
  shadow.mapSize.height={1024}
  shadow.camera.left={-6}
  shadow.camera.right={6}
  shadow.camera.top={8}
  shadow.camera.bottom={-5}
  shadow.bias={-0.0004}
  shadow.normalBias={0.02}
/>
<T.DirectionalLight position={[5, 5.5, -5.5]} intensity={dark ? 3.1 : 1.1} color={0xcfe3f8} />
<T.HemisphereLight args={[0xffffff, 0x94a3b8, dark ? 0.35 : 0.55]} />

{@render children?.()}

<!-- Only the shadow renders, so the floor works over any page background. -->
<T.Mesh position={[0, -2.582, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
  <T.CircleGeometry args={[5.2, 48]} />
  <T.ShadowMaterial transparent opacity={dark ? 0.42 : 0.18} />
</T.Mesh>
