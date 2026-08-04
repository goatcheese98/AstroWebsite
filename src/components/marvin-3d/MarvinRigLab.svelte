<script lang="ts">
  import { onMount } from "svelte";
  import {
    MARVIN_RIG_CONTROLS,
    MARVIN_RIG_GROUPS,
    clampRigValue,
    createInitialRigPose,
    type MarvinRigPose,
  } from "../../lib/marvin-rig";
  import { rotateMarvinFromDrag, wrapMarvinYaw } from "../../lib/marvin-3d-view";
  import MarvinRigCanvas from "./MarvinRigCanvas.svelte";

  let pose = $state<MarvinRigPose>(createInitialRigPose());
  let mounted = $state(false);
  let webglSupported = $state(true);
  let stageTheme = $state<"light" | "dark">("light");
  let viewYaw = $state(0);
  let viewPitch = $state(0);
  let dragging = $state(false);
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartYaw = 0;
  let dragStartPitch = 0;

  onMount(() => {
    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2") ?? probe.getContext("webgl");
    webglSupported = Boolean(context);
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    mounted = true;
  });

  function setJoint(id: string, rawValue: number) {
    pose[id] = clampRigValue(id, rawValue);
  }

  function resetPose() {
    pose = createInitialRigPose();
    viewYaw = 0;
    viewPitch = 0;
  }

  function degrees(value: number) {
    return `${Math.round((value * 180) / Math.PI)}°`;
  }

  function startRotation(event: PointerEvent) {
    // Buttons inside the stage must keep their clicks — capturing the
    // pointer here would swallow them.
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest("button"))) return;
    const stage = event.currentTarget as HTMLElement;
    dragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragStartYaw = viewYaw;
    dragStartPitch = viewPitch;
    stage.setPointerCapture(event.pointerId);
  }

  function movePointer(event: PointerEvent) {
    if (!dragging) return;
    const rotation = rotateMarvinFromDrag(
      { yaw: dragStartYaw, pitch: dragStartPitch },
      event.clientX - dragStartX,
      event.clientY - dragStartY,
    );
    viewYaw = rotation.yaw;
    viewPitch = rotation.pitch;
  }

  function stopRotation(event: PointerEvent) {
    dragging = false;
    const stage = event.currentTarget as HTMLElement;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  }
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="rig-shell">
  <header class="rig-nav">
    <a href="/marvin-lab">← Back to the lab</a>
    <span><i></i> RIG CONSOLE / 04</span>
  </header>

  <section class="rig-intro">
    <div>
      <span class="kicker">ARTICULATION CONSTRAINTS</span>
      <h1>Marvin, joint by joint.</h1>
    </div>
    <p>
      Every channel of the rig with its authored travel limits. Drag the stage to orbit,
      push each slider to its stops to see how far the body can go.
    </p>
  </section>

  <div class="rig-layout">
    <section
      class="stage stage--{stageTheme}"
      class:stage--dragging={dragging}
      aria-label="Posable three-dimensional Marvin rig"
      onpointerdown={startRotation}
      onpointermove={movePointer}
      onpointerup={stopRotation}
      onpointercancel={stopRotation}
    >
      {#if mounted && webglSupported}
        <MarvinRigCanvas {pose} {viewYaw} {viewPitch} {stageTheme} />
      {:else if mounted}
        <div class="fallback" role="status">
          <span>3D renderer unavailable</span>
          <p>This browser cannot start the WebGL rig console.</p>
        </div>
      {/if}

      <div class="stage-tools">
        <span aria-hidden="true">DRAG TO ORBIT</span>
        <button
          type="button"
          onclick={() => (stageTheme = stageTheme === "light" ? "dark" : "light")}
          aria-label="Toggle stage backdrop between light and dark"
        >
          {stageTheme === "light" ? "◐ LIGHT" : "◑ DARK"}
        </button>
        <button type="button" onclick={resetPose}>RESET RIG</button>
      </div>
    </section>

    <section class="console" aria-label="Marvin joint controls">
      {#each MARVIN_RIG_GROUPS as group}
        <fieldset>
          <legend>{group}</legend>
          {#each MARVIN_RIG_CONTROLS.filter((control) => control.group === group) as control (control.id)}
            <label>
              <span class="console__label">{control.label}</span>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step="0.01"
                value={pose[control.id]}
                oninput={(event) => setJoint(control.id, Number(event.currentTarget.value))}
                aria-label={`${group} ${control.label}`}
              />
              <span class="console__value">{degrees(pose[control.id])}</span>
            </label>
          {/each}
        </fieldset>
      {/each}
    </section>
  </div>

  <footer class="rig-footer">
    <p>SAME RIG AS THE LAB / NO EXTRA GEOMETRY</p>
    <p>Limits here are the limits everywhere.</p>
  </footer>
</main>

<style>
  :global(body) {
    background: #0b0f14;
    color: #f4f0e7;
  }

  :global(body::before) { display: none; }

  .rig-shell {
    --amber: #ffb83d;
    width: min(1500px, 100%);
    min-height: 100dvh;
    margin: 0 auto;
    padding: 0 clamp(16px, 3vw, 48px) 36px;
    font-family: var(--font-body);
  }

  .rig-nav {
    height: 76px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255, 255, 255, 0.13);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.09em;
  }

  .rig-nav a { color: #f4f0e7; }
  .rig-nav span { display: flex; align-items: center; gap: 8px; color: #8d98a5; }
  .rig-nav i { width: 7px; height: 7px; border-radius: 50%; background: var(--amber); box-shadow: 0 0 15px var(--amber); }

  .rig-intro {
    display: grid;
    grid-template-columns: 1.4fr 0.8fr;
    align-items: end;
    gap: 40px;
    padding: clamp(28px, 4vw, 54px) 0 clamp(18px, 3vw, 34px);
  }

  .kicker {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.13em;
    color: var(--amber);
  }

  h1 {
    margin-top: 12px;
    font-size: clamp(2.2rem, 4.6vw, 4.4rem);
    line-height: 0.92;
    letter-spacing: -0.05em;
    font-weight: 650;
  }

  .rig-intro > p {
    max-width: 44ch;
    color: #9aa5b1;
    font-size: clamp(0.88rem, 1.3vw, 1rem);
    line-height: 1.6;
  }

  .rig-layout {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 18px;
    align-items: stretch;
  }

  .stage {
    position: relative;
    min-height: 620px;
    overflow: hidden;
    background:
      linear-gradient(var(--stage-grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--stage-grid) 1px, transparent 1px),
      var(--stage-bg);
    background-size: 48px 48px, 48px 48px, auto;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 8px;
    cursor: grab;
    touch-action: none;
    transition: background-color 200ms ease-out;
  }

  .stage--dragging { cursor: grabbing; }

  .stage--light {
    --stage-bg: #ffffff;
    --stage-grid: rgba(29, 29, 29, 0.05);
  }

  .stage--dark {
    --stage-bg: #101418;
    --stage-grid: rgba(255, 255, 255, 0.045);
  }

  .stage-tools {
    position: absolute;
    z-index: 5;
    left: 50%;
    bottom: 18px;
    display: flex;
    align-items: center;
    gap: 6px;
    transform: translateX(-50%);
    padding: 6px;
    color: #8997a2;
    background: rgba(11, 15, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    font: 0.62rem/1 var(--font-mono);
    letter-spacing: 0.09em;
    backdrop-filter: blur(10px);
  }

  .stage-tools > span { padding: 0 8px; }
  .stage-tools button {
    min-height: 34px;
    padding: 0 12px;
    color: #dce5e8;
    background: #151d24;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 4px;
    cursor: pointer;
    font: inherit;
    letter-spacing: inherit;
  }
  .stage-tools button:hover,
  .stage-tools button:focus-visible { color: #fff; border-color: var(--amber); outline: none; }

  .fallback {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    gap: 10px;
    text-align: center;
    font-family: var(--font-mono);
    color: #5a6570;
  }
  .fallback span { color: var(--amber); font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; }

  .console {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 620px;
    overflow-y: auto;
    padding: 4px 4px 4px 0;
    scrollbar-width: thin;
  }

  fieldset {
    margin: 0;
    padding: 14px 16px 10px;
    background: #10161d;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
  }

  legend {
    padding: 0 8px;
    color: var(--amber);
    font-family: var(--font-mono);
    font-size: 0.64rem;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  label {
    display: grid;
    grid-template-columns: 96px 1fr 44px;
    align-items: center;
    gap: 12px;
    min-height: 34px;
  }

  .console__label {
    color: #aeb9c4;
    font-size: 0.76rem;
  }

  .console__value {
    color: #dce5e8;
    font-family: var(--font-mono);
    font-size: 0.66rem;
    text-align: right;
  }

  input[type="range"] {
    width: 100%;
    height: 26px;
    margin: 0;
    appearance: none;
    background: transparent;
    cursor: pointer;
  }

  input[type="range"]::-webkit-slider-runnable-track {
    height: 3px;
    background: rgba(255, 255, 255, 0.16);
    border-radius: 2px;
  }

  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    margin-top: -5.5px;
    background: #e4eaf1;
    border: 2px solid #10161d;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(255, 184, 61, 0.55);
  }

  input[type="range"]:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; border-radius: 4px; }

  input[type="range"]::-moz-range-track {
    height: 3px;
    background: rgba(255, 255, 255, 0.16);
    border-radius: 2px;
  }

  input[type="range"]::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: #e4eaf1;
    border: 2px solid #10161d;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(255, 184, 61, 0.55);
  }

  .rig-footer {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin-top: 26px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.13);
    color: #68747f;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.13em;
  }

  @media (max-width: 960px) {
    .rig-intro { grid-template-columns: 1fr; gap: 16px; }
    .rig-layout { grid-template-columns: 1fr; }
    .stage { min-height: 480px; }
    .console { max-height: none; }
    .rig-footer { flex-direction: column; }
  }
</style>
