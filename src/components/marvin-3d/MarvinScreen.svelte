<script lang="ts">
  import Screen from "../islands/Screen.svelte";

  let {
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  } = $props();

  let game = $state<"tetris" | "whac" | null>(null);
  let closeButton = $state<HTMLButtonElement>();

  function closeAll() {
    game = null;
    onClose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && isOpen && !game) closeAll();
  }

  $effect(() => {
    if (!isOpen) game = null;
    if (isOpen && !game) queueMicrotask(() => closeButton?.focus());
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && !game}
  <div class="console-backdrop">
    <button class="console-dismiss" type="button" onclick={closeAll} aria-label="Close Marvin console"></button>
    <div class="console" role="dialog" aria-modal="true" aria-labelledby="marvin-console-title">
      <div class="console__header">
        <div>
          <span class="console__eyebrow">MARVIN // FIELD CONSOLE</span>
          <h2 id="marvin-console-title">Choose a field test</h2>
        </div>
        <button bind:this={closeButton} class="console__close" type="button" onclick={closeAll} aria-label="Close Marvin console panel">×</button>
      </div>

      <div class="console__grid">
        <button type="button" onclick={() => (game = "tetris")}>
          <span class="console__number">01</span>
          <strong>Stack calibration</strong>
          <small>Tetris // spatial systems test</small>
        </button>
        <button type="button" onclick={() => (game = "whac")}>
          <span class="console__number">02</span>
          <strong>Reflex diagnostic</strong>
          <small>Whac-a-Mole // response test</small>
        </button>
      </div>
    </div>
  </div>
{/if}

{#if game}
  <Screen isOpen {game} onClose={() => (game = null)} />
{/if}

<style>
  .console-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1400;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(7, 10, 14, 0.72);
    backdrop-filter: blur(10px);
  }

  .console {
    position: relative;
    z-index: 1;
    width: min(680px, 100%);
    color: #f8f3e8;
    background:
      linear-gradient(135deg, rgba(255, 173, 44, 0.08), transparent 45%),
      #111820;
    border: 1px solid rgba(255, 194, 88, 0.55);
    border-radius: 18px;
    padding: clamp(20px, 4vw, 34px);
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45), inset 0 0 0 4px rgba(255, 255, 255, 0.025);
  }

  .console-dismiss {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    background: transparent;
    border: 0;
    cursor: default;
  }

  .console__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }

  .console__eyebrow,
  .console__number,
  small {
    font-family: var(--font-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .console__eyebrow { color: #ffbd4a; font-size: 0.72rem; }
  h2 { margin-top: 5px; font-size: clamp(1.35rem, 4vw, 2rem); }

  .console__close {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    color: inherit;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.6rem;
  }

  .console__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 20px;
  }

  .console__grid button {
    min-height: 150px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 7px;
    padding: 20px;
    color: inherit;
    text-align: left;
    background: rgba(255, 255, 255, 0.045);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 12px;
    cursor: pointer;
    transition: border-color 150ms ease, transform 150ms ease, background 150ms ease;
  }

  .console__grid button:hover,
  .console__grid button:focus-visible {
    border-color: #ffbd4a;
    background: rgba(255, 189, 74, 0.08);
    transform: translateY(-2px);
  }

  .console__number { margin-bottom: auto; color: #66daf3; font-size: 0.7rem; }
  .console__grid strong { font-size: 1.05rem; }
  .console__grid small { color: #9daab7; font-size: 0.65rem; }

  @media (max-width: 560px) {
    .console__grid { grid-template-columns: 1fr; }
    .console__grid button { min-height: 122px; }
  }
</style>
