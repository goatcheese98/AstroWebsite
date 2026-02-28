<script lang="ts">
  import Tetris from "./Tetris.svelte";

  let { isOpen, onClose }: { isOpen: boolean; onClose: () => void } = $props();
</script>

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="overlay"
    onclick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div class="panel">
      <div class="screw screw-tl"></div>
      <div class="screw screw-tr"></div>
      <div class="screw screw-bl"></div>
      <div class="screw screw-br"></div>
      <div class="panel-inner">
        <Tetris {onClose} />
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(254, 248, 230, 0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    animation: overlay-in 0.2s ease;
  }

  @keyframes overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .panel {
    position: relative;
    background: linear-gradient(150deg, #fffbeb 0%, #fef3c7 60%, #fde68a 100%);
    border: 2.5px solid #d97706;
    border-radius: 20px;
    padding: 24px;
    box-shadow:
      0 0 0 1px rgba(217, 119, 6, 0.12),
      0 8px 32px rgba(120, 80, 10, 0.18),
      0 24px 64px rgba(120, 80, 10, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.75);
    animation: panel-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    min-width: 360px;
  }

  @keyframes panel-in {
    from { transform: scale(0.88) translateY(16px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }

  /* Corner screws for robot aesthetic */
  .screw {
    position: absolute;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #92400e, #78350f);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 1px 2px rgba(0, 0, 0, 0.25);
  }

  .screw::after {
    content: "";
    position: absolute;
    inset: 2px;
    border-radius: 50%;
    border-top: 1.5px solid rgba(255, 255, 255, 0.15);
    border-right: 1.5px solid transparent;
    transform: rotate(45deg);
  }

  .screw-tl { top: 10px; left: 10px; }
  .screw-tr { top: 10px; right: 10px; }
  .screw-bl { bottom: 10px; left: 10px; }
  .screw-br { bottom: 10px; right: 10px; }

  .panel-inner {
    position: relative;
    z-index: 1;
  }
</style>
