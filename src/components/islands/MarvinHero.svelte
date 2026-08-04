<script lang="ts">
  import { onMount } from "svelte";
  import type { Marvin3DAction, Marvin3DGrapplePhase } from "../../lib/marvin-3d-motion";
  import MarvinCanvas from "../marvin-3d/MarvinCanvas.svelte";
  import MarvinBot from "./MarvinBot.svelte";

  const surprises: Exclude<Marvin3DAction, "idle">[] = ["wave", "dance", "victory"];

  let action = $state<Marvin3DAction>("idle");
  let actionToken = $state(0);
  let phase = $state<Marvin3DGrapplePhase>("aim");
  let ready = $state(false);
  let mounted = $state(false);
  let webglSupported = $state(true);
  let reducedMotion = $state(false);
  let stageTheme = $state<"light" | "dark">("light");
  let pointerX = $state(0);
  let pointerY = $state(0);

  onMount(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion = media.matches;
    phase = reducedMotion ? "online" : "aim";
    const updateMotion = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      if (event.matches) phase = "online";
    };
    media.addEventListener("change", updateMotion);

    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2") ?? probe.getContext("webgl");
    webglSupported = Boolean(context);
    context?.getExtension("WEBGL_lose_context")?.loseContext();

    // The scene lighting follows the site theme toggle live.
    const syncTheme = () => {
      stageTheme =
        document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    mounted = true;
    return () => {
      media.removeEventListener("change", updateMotion);
      observer.disconnect();
    };
  });

  function surprise() {
    action = surprises[Math.floor(Math.random() * surprises.length)];
    actionToken += 1;
  }

  function updatePointer(event: PointerEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }
</script>

<div
  class="marvin-hero"
  onpointermove={updatePointer}
  onpointerleave={() => {
    pointerX = 0;
    pointerY = 0;
  }}
>
  {#if mounted && webglSupported}
    <div class="marvin-hero__canvas" class:marvin-hero__canvas--ready={ready}>
      <MarvinCanvas
        {action}
        {actionToken}
        {reducedMotion}
        {pointerX}
        {pointerY}
        viewYaw={0}
        viewPitch={0}
        {stageTheme}
        onReady={() => (ready = true)}
        onPhaseChange={(nextPhase) => (phase = nextPhase)}
      />
    </div>
    <button
      class="marvin-hero__hitbox"
      type="button"
      aria-label="Marvin, interactive robot mascot. Activate a surprise move."
      disabled={!ready || phase !== "online"}
      onclick={surprise}
    ></button>
  {:else if mounted}
    <!-- No WebGL: the trusty 2D Marvin takes the shift. -->
    <MarvinBot />
  {/if}
</div>

<style>
  .marvin-hero {
    position: relative;
    width: min(470px, 42vw);
    height: 580px;
  }

  .marvin-hero__canvas {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 400ms ease;
  }

  .marvin-hero__canvas--ready {
    opacity: 1;
  }

  .marvin-hero__hitbox {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 240px;
    height: 430px;
    transform: translate(-50%, -52%);
    padding: 0;
    background: transparent;
    border: 0;
    cursor: pointer;
  }

  .marvin-hero__hitbox:disabled {
    cursor: default;
  }

  .marvin-hero__hitbox:focus-visible {
    outline: 2px dashed var(--color-accent);
    outline-offset: 8px;
    border-radius: 20px;
  }

  @media (prefers-reduced-motion: reduce) {
    .marvin-hero__canvas {
      transition: none;
    }
  }
</style>
