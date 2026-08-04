<script lang="ts">
  import { onMount } from "svelte";
  import type { Marvin3DAction, Marvin3DGrapplePhase } from "../../lib/marvin-3d-motion";
  import { rotateMarvinFromDrag, wrapMarvinYaw } from "../../lib/marvin-3d-view";
  import MarvinCanvas from "./MarvinCanvas.svelte";
  import MarvinScreen from "./MarvinScreen.svelte";

  const actions: { id: Exclude<Marvin3DAction, "idle">; label: string; glyph: string }[] = [
    { id: "wave", label: "Wave", glyph: "↗" },
    { id: "dance", label: "Freestyle", glyph: "≈" },
    { id: "victory", label: "Victory", glyph: "↑" },
  ];

  let action = $state<Marvin3DAction>("idle");
  let actionToken = $state(0);
  let phase = $state<Marvin3DGrapplePhase>("launch");
  let ready = $state(false);
  let mounted = $state(false);
  let webglSupported = $state(true);
  let reducedMotion = $state(false);
  let pointerX = $state(0);
  let pointerY = $state(0);
  let viewYaw = $state(0);
  let viewPitch = $state(0);
  let dragging = $state(false);
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartYaw = 0;
  let dragStartPitch = 0;
  let consoleOpen = $state(false);
  let chestButton = $state<HTMLButtonElement>();
  let chestFacingViewer = $derived(Math.abs(viewYaw) < 0.7 && Math.abs(viewPitch) < 0.45);

  onMount(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion = media.matches;
    phase = reducedMotion ? "online" : "launch";

    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2") ?? probe.getContext("webgl");
    webglSupported = Boolean(context);
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    mounted = true;

    const updateMotion = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      if (event.matches) phase = "online";
    };
    media.addEventListener("change", updateMotion);
    return () => media.removeEventListener("change", updateMotion);
  });

  function selectAction(nextAction: Exclude<Marvin3DAction, "idle">) {
    action = nextAction;
    actionToken += 1;
  }

  function updatePointerLook(event: PointerEvent) {
    const rect = event.currentTarget instanceof HTMLElement ? event.currentTarget.getBoundingClientRect() : null;
    if (!rect) return;
    pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function startRotation(event: PointerEvent) {
    if (event.button !== 0 || event.target instanceof Element && event.target.closest("button, a")) return;
    const stage = event.currentTarget as HTMLElement;
    dragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragStartYaw = viewYaw;
    dragStartPitch = viewPitch;
    stage.setPointerCapture(event.pointerId);
  }

  function movePointer(event: PointerEvent) {
    updatePointerLook(event);
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

  function rotateView(delta: number) {
    viewYaw = wrapMarvinYaw(viewYaw + delta);
  }

  function resetView() {
    viewYaw = 0;
    viewPitch = 0;
  }

  function closeConsole() {
    consoleOpen = false;
    queueMicrotask(() => chestButton?.focus());
  }
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="lab-shell">
  <header class="lab-nav">
    <a href="/" aria-label="Return to Rohan Jasani's homepage">← Back to portfolio</a>
    <span><i></i> PRIVATE PROTOTYPE / 03</span>
  </header>

  <section class="lab-intro" aria-labelledby="marvin-lab-title">
    <div>
      <span class="kicker">ARTICULATED SYSTEMS STUDY</span>
      <h1 id="marvin-lab-title">Meet Marvin,<br /><em>off the page.</em></h1>
    </div>
    <p>
      A real-time character study built from joints, light, motion, and a little operational
      mischief. No sprite sheet. No borrowed model.
    </p>
  </section>

  <section
    class="stage"
    class:stage--dragging={dragging}
    aria-label="Interactive three-dimensional Marvin demonstration"
    onpointerdown={startRotation}
    onpointermove={movePointer}
    onpointerup={stopRotation}
    onpointercancel={stopRotation}
    onpointerleave={() => { if (!dragging) { pointerX = 0; pointerY = 0; } }}
  >
    <div class="stage__meta stage__meta--left" aria-hidden="true">
      <span>MODEL</span><strong>MRVN-RJ/01</strong>
    </div>
    <div class="stage__meta stage__meta--right" aria-live="polite">
      <span>STATUS</span><strong>{ready ? phase.toUpperCase() : "INITIALIZING"}</strong>
    </div>

    {#if mounted && webglSupported}
      <div class:stage__canvas--ready={ready} class="stage__canvas">
        <MarvinCanvas
          {action}
          {actionToken}
          {reducedMotion}
          {pointerX}
          {pointerY}
          {viewYaw}
          {viewPitch}
          onReady={() => (ready = true)}
          onPhaseChange={(nextPhase) => (phase = nextPhase)}
        />
      </div>
    {:else if mounted}
      <div class="fallback" role="status">
        <span>3D renderer unavailable</span>
        <strong>Marvin is still online.</strong>
        <p>This browser cannot start the WebGL lab. The production mascot remains available on the homepage.</p>
      </div>
    {/if}

    {#if !ready && webglSupported}
      <div class="loading" role="status"><i></i><span>ASSEMBLING MARVIN</span></div>
    {/if}

    {#if ready && chestFacingViewer}
      <button bind:this={chestButton} class="chest-target" type="button" onclick={() => (consoleOpen = true)}>
        <span>Open field console</span>
      </button>
    {/if}

    {#if ready}
      <div class="view-controls" aria-label="3D model view controls">
        <span aria-hidden="true">DRAG MODEL</span>
        <button type="button" onclick={() => rotateView(-Math.PI / 6)} aria-label="Rotate Marvin left">←</button>
        <button type="button" onclick={resetView}>RESET VIEW</button>
        <button type="button" onclick={() => rotateView(Math.PI / 6)} aria-label="Rotate Marvin right">→</button>
      </div>
    {/if}

    <div class="stage__scanline" aria-hidden="true"></div>
  </section>

  <section class="control-deck" aria-label="Marvin action controls">
    <div class="control-deck__copy">
      <span>DIRECTIVE PANEL</span>
      <p>Three authored routines, one articulated rig.</p>
    </div>
    <div class="control-deck__actions">
      {#each actions as item, index}
        <button type="button" onclick={() => selectAction(item.id)} disabled={!ready || phase !== "online"}>
          <span>0{index + 1}</span><strong>{item.label}</strong><i>{item.glyph}</i>
        </button>
      {/each}
    </div>
  </section>

  <footer class="lab-footer">
    <p>THREE.JS + THRELTE / PROCEDURAL GEOMETRY / ONE WEBGL CONTEXT</p>
    <p>Built as an experiment, not shipped to the homepage.</p>
  </footer>
</main>

<MarvinScreen isOpen={consoleOpen} onClose={closeConsole} />

<style>
  :global(body) {
    background: #0b0f14;
    color: #f4f0e7;
  }

  :global(body::before) { display: none; }

  .lab-shell {
    --amber: #ffb83d;
    --cyan: #75ddf3;
    width: min(1500px, 100%);
    min-height: 100dvh;
    margin: 0 auto;
    padding: 0 clamp(16px, 3vw, 48px) 36px;
    overflow: hidden;
    font-family: var(--font-body);
  }

  .lab-nav,
  .lab-intro,
  .control-deck,
  .lab-footer {
    position: relative;
    z-index: 2;
  }

  .lab-nav {
    height: 76px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255, 255, 255, 0.13);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.09em;
  }

  .lab-nav a { color: #f4f0e7; }
  .lab-nav span { display: flex; align-items: center; gap: 8px; color: #8d98a5; }
  .lab-nav i { width: 7px; height: 7px; border-radius: 50%; background: var(--amber); box-shadow: 0 0 15px var(--amber); }

  .lab-intro {
    display: grid;
    grid-template-columns: 1.5fr 0.7fr;
    align-items: end;
    gap: 40px;
    padding: clamp(36px, 6vw, 82px) 0 clamp(22px, 4vw, 48px);
  }

  .kicker,
  .stage__meta span,
  .control-deck__copy span,
  .lab-footer {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.13em;
    color: var(--amber);
  }

  h1 {
    margin-top: 12px;
    font-size: clamp(3rem, 7vw, 7.6rem);
    line-height: 0.86;
    letter-spacing: -0.065em;
    font-weight: 650;
  }

  h1 em { color: #8e9ba7; font-family: Georgia, serif; font-weight: 400; }

  .lab-intro > p {
    max-width: 42ch;
    color: #9aa5b1;
    font-size: clamp(0.9rem, 1.4vw, 1.05rem);
    line-height: 1.6;
  }

  .stage {
    position: relative;
    height: min(68vw, 720px);
    min-height: 560px;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 54%, rgba(54, 117, 139, 0.22), transparent 32%),
      linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      #0e141b;
    background-size: auto, 48px 48px, 48px 48px, auto;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 8px;
    box-shadow: inset 0 0 90px rgba(0, 0, 0, 0.45);
    cursor: grab;
    touch-action: pan-y;
  }

  .stage--dragging { cursor: grabbing; }

  .stage::before,
  .stage::after {
    content: "";
    position: absolute;
    z-index: 3;
    pointer-events: none;
    border-color: var(--amber);
    border-style: solid;
    width: 38px;
    height: 38px;
  }

  .stage::before { top: 14px; left: 14px; border-width: 1px 0 0 1px; }
  .stage::after { right: 14px; bottom: 14px; border-width: 0 1px 1px 0; }

  .stage__canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 300ms ease; }
  .stage__canvas--ready { opacity: 1; }

  .stage__meta {
    position: absolute;
    z-index: 4;
    top: 28px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    pointer-events: none;
    font-family: var(--font-mono);
  }

  .stage__meta--left { left: 34px; }
  .stage__meta--right { right: 34px; text-align: right; }
  .stage__meta strong { font-size: 0.72rem; letter-spacing: 0.08em; color: #d7dee5; }

  .stage__scanline {
    position: absolute;
    z-index: 2;
    inset: 0;
    pointer-events: none;
    opacity: 0.16;
    background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(255, 255, 255, 0.04) 4px);
  }

  .view-controls {
    position: absolute;
    z-index: 8;
    left: 50%;
    bottom: 22px;
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

  .view-controls > span { padding: 0 8px; }
  .view-controls button {
    min-width: 38px;
    min-height: 34px;
    padding: 0 10px;
    color: #dce5e8;
    background: #151d24;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 4px;
    cursor: pointer;
    font: inherit;
    letter-spacing: inherit;
  }
  .view-controls button:hover,
  .view-controls button:focus-visible { color: #fff; border-color: var(--amber); outline: none; }

  .loading,
  .fallback {
    position: absolute;
    z-index: 5;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 14px;
    text-align: center;
    font-family: var(--font-mono);
  }

  .loading { color: #b8c2cc; font-size: 0.72rem; letter-spacing: 0.13em; }
  .loading i { width: 38px; height: 38px; border: 2px solid rgba(255,255,255,.14); border-top-color: var(--amber); border-radius: 50%; animation: spin 800ms linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .fallback { max-width: 520px; margin: auto; padding: 28px; }
  .fallback span { color: var(--amber); font-size: 0.72rem; letter-spacing: .12em; text-transform: uppercase; }
  .fallback strong { font-family: var(--font-ui); font-size: 2rem; }
  .fallback p { color: #93a0ad; }

  .chest-target {
    position: absolute;
    z-index: 6;
    left: 50%;
    top: 48%;
    width: 120px;
    height: 104px;
    transform: translate(-50%, -50%);
    color: transparent;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 16px;
    cursor: pointer;
  }

  .chest-target span {
    position: absolute;
    left: 50%;
    top: calc(100% + 10px);
    width: max-content;
    transform: translateX(-50%);
    padding: 6px 9px;
    color: #f8f3e8;
    background: rgba(11, 15, 20, 0.88);
    border: 1px solid rgba(117, 221, 243, .5);
    border-radius: 5px;
    font: 0.66rem/1 var(--font-mono);
    letter-spacing: .06em;
    opacity: 0;
    transition: opacity 150ms ease, transform 150ms ease;
  }

  .chest-target:hover span,
  .chest-target:focus-visible span { opacity: 1; transform: translate(-50%, 2px); }
  .chest-target:focus-visible { outline: 2px solid var(--cyan); outline-offset: 4px; }

  .control-deck {
    display: grid;
    grid-template-columns: 0.8fr 2fr;
    gap: 28px;
    padding: 22px 0 40px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.13);
  }

  .control-deck__copy p { margin-top: 5px; color: #7f8a96; font-size: 0.82rem; }
  .control-deck__actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .control-deck__actions button {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    min-height: 64px;
    padding: 12px 16px;
    color: #eef2f5;
    background: #121920;
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 5px;
    cursor: pointer;
    text-align: left;
    transition: border-color 150ms ease, background 150ms ease;
  }
  .control-deck__actions button:hover:not(:disabled),
  .control-deck__actions button:focus-visible { background: #18212a; border-color: var(--amber); }
  .control-deck__actions button:disabled { opacity: .38; cursor: wait; }
  .control-deck__actions span { color: #7f8b96; font: .62rem var(--font-mono); }
  .control-deck__actions strong { font-size: .84rem; }
  .control-deck__actions i { color: var(--amber); font-style: normal; font-size: 1.3rem; }

  .lab-footer { display: flex; justify-content: space-between; gap: 20px; padding-top: 22px; color: #68747f; }

  @media (max-width: 720px) {
    .lab-nav span { display: none; }
    .lab-intro { grid-template-columns: 1fr; gap: 20px; }
    .lab-intro > p { max-width: 52ch; }
    .stage { min-height: 500px; height: 72vh; max-height: 650px; }
    .stage__meta { top: 22px; }
    .stage__meta--left { left: 24px; }
    .stage__meta--right { right: 24px; }
    .control-deck { grid-template-columns: 1fr; }
    .control-deck__actions { grid-template-columns: 1fr; }
    .lab-footer { flex-direction: column; }
    .view-controls > span { display: none; }
  }

  @media (max-width: 380px) {
    .lab-shell { padding-inline: 10px; }
    .stage { min-height: 470px; }
    .stage__meta--right { display: none; }
    .chest-target { top: 48%; width: 94px; height: 82px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .loading i { animation: none; }
    .stage__canvas { transition: none; }
  }
</style>
