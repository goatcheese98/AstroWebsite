<script lang="ts">
  type WhacMode = "menu" | "playing" | "gameover";
  type WhacDifficulty = "easy" | "medium" | "hard";
  type SlotExpression = "calm" | "grit" | "surprised";
  type Slot = { id: number; label: string; x: number; y: number; expression: SlotExpression };

  const SLOTS: Slot[] = [
    { id: 0, label: "1", x: 17, y: 31, expression: "calm" },
    { id: 1, label: "2", x: 50, y: 24, expression: "grit" },
    { id: 2, label: "3", x: 81, y: 34, expression: "surprised" },
    { id: 3, label: "4", x: 26, y: 65, expression: "grit" },
    { id: 4, label: "5", x: 60, y: 59, expression: "calm" },
    { id: 5, label: "6", x: 85, y: 73, expression: "surprised" },
  ];
  const DIFFICULTY_CONFIG: Record<
    WhacDifficulty,
    { label: string; visibleBase: number; visibleVariance: number; gapBase: number; gapVariance: number }
  > = {
    easy: { label: "EASY", visibleBase: 620, visibleVariance: 420, gapBase: 300, gapVariance: 360 },
    medium: { label: "MEDIUM", visibleBase: 470, visibleVariance: 360, gapBase: 220, gapVariance: 300 },
    hard: { label: "HARD", visibleBase: 330, visibleVariance: 300, gapBase: 140, gapVariance: 220 },
  };

  let { onClose }: { onClose: () => void } = $props();

  let mode = $state<WhacMode>("menu");
  let score = $state(0);
  let timeLeft = $state(30);
  let activeSlot = $state<number | null>(null);
  let lastSlot = $state<number | null>(null);
  let difficulty = $state<WhacDifficulty>("medium");
  let countdownTimer: ReturnType<typeof setInterval> | null = null;
  let spawnTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimers() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (spawnTimer) {
      clearTimeout(spawnTimer);
      spawnTimer = null;
    }
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function nextSlot() {
    const options = SLOTS.map((slot) => slot.id).filter((id) => id !== lastSlot);
    const pool = options.length ? options : SLOTS.map((slot) => slot.id);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function scheduleRound() {
    if (mode !== "playing") return;
    const slot = nextSlot();
    lastSlot = slot;
    activeSlot = slot;

    const settings = DIFFICULTY_CONFIG[difficulty];
    const paceScale = Math.max(0.6, timeLeft / 30);
    const visibleMs = settings.visibleBase + Math.floor(Math.random() * settings.visibleVariance * paceScale);
    const nextRoundMs = visibleMs + settings.gapBase + Math.floor(Math.random() * settings.gapVariance);

    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (mode === "playing" && activeSlot === slot) {
        activeSlot = null;
      }
    }, visibleMs);

    if (spawnTimer) clearTimeout(spawnTimer);
    spawnTimer = setTimeout(scheduleRound, nextRoundMs);
  }

  function startGame() {
    clearTimers();
    mode = "playing";
    score = 0;
    timeLeft = 30;
    activeSlot = null;
    lastSlot = null;
    scheduleRound();
    countdownTimer = setInterval(() => {
      if (mode !== "playing") return;
      timeLeft -= 1;
      if (timeLeft <= 0) {
        timeLeft = 0;
        mode = "gameover";
        activeSlot = null;
        clearTimers();
      }
    }, 1000);
  }

  function whack(slotId: number) {
    if (mode !== "playing") return;
    if (activeSlot !== slotId) return;
    score += 1;
    activeSlot = null;
    if (spawnTimer) clearTimeout(spawnTimer);
    spawnTimer = setTimeout(scheduleRound, 90);
  }

  function setDifficulty(level: WhacDifficulty) {
    difficulty = level;
  }

  function handleKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
      return;
    }

    const consume = () => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    if (e.key === "Escape") {
      consume();
      onClose();
      return;
    }

    if (mode === "menu") {
      if (e.key === "Enter" || e.key === " ") {
        consume();
        startGame();
      }
      return;
    }

    if (mode === "gameover") {
      if (e.key === "Enter" || e.key === " ") {
        consume();
        startGame();
      }
      return;
    }

    if (!/^[1-6]$/.test(e.key)) return;
    consume();
    whack(Number(e.key) - 1);
  }

  $effect(() => {
    window.addEventListener("keydown", handleKey, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKey, { capture: true });
      clearTimers();
    };
  });
</script>

<div class="whac">
  <div class="header">
    <span class="title">WHAC-A-MOLE</span>
    <div class="stats">
      <div class="stat">
        <span class="stat-label">TIME</span>
        <span class="stat-value">{timeLeft}</span>
      </div>
      <div class="stat">
        <span class="stat-label">MODE</span>
        <span class="stat-value stat-value--small">{DIFFICULTY_CONFIG[difficulty].label}</span>
      </div>
      <div class="stat">
        <span class="stat-label">SCORE</span>
        <span class="stat-value">{score}</span>
      </div>
    </div>
    <button class="close-btn" onclick={onClose} aria-label="Close">×</button>
  </div>

  <div class="board">
    {#each SLOTS as slot}
      <button
        class="hole"
        style={`--x:${slot.x}%; --y:${slot.y}%;`}
        onclick={() => whack(slot.id)}
        aria-label={`Whack Diglett at hole ${slot.label}`}
      >
        <span class="mound"></span>
        {#if activeSlot === slot.id}
          <span class={`diglett mood-${slot.expression}`}>
            <span class="brow left"></span>
            <span class="brow right"></span>
            <span class="eye left"></span>
            <span class="eye right"></span>
            <span class="nose"></span>
            <span class="mouth"></span>
            <span class="cheek left"></span>
            <span class="cheek right"></span>
          </span>
        {/if}
        <span class="hole-shadow"></span>
        <span class="slot-key">{slot.label}</span>
      </button>
    {/each}

    {#if mode === "menu"}
      <div class="overlay">
        <p class="overlay-title">READY TO WHACK?</p>
        <p class="overlay-hint">Hit moles with click/tap or keys 1-6</p>
        <div class="difficulty-row">
          <button
            class="difficulty-btn"
            class:active={difficulty === "easy"}
            onclick={() => setDifficulty("easy")}
          >
            EASY
          </button>
          <button
            class="difficulty-btn"
            class:active={difficulty === "medium"}
            onclick={() => setDifficulty("medium")}
          >
            MEDIUM
          </button>
          <button
            class="difficulty-btn"
            class:active={difficulty === "hard"}
            onclick={() => setDifficulty("hard")}
          >
            HARD
          </button>
        </div>
        <button class="btn-primary" onclick={startGame}>START GAME</button>
      </div>
    {:else if mode === "gameover"}
      <div class="overlay">
        <p class="overlay-title">GAME OVER</p>
        <p class="overlay-score">Score: {score}</p>
        <button class="btn-primary" onclick={startGame}>PLAY AGAIN</button>
        <button class="btn-secondary" onclick={onClose}>EXIT</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .whac {
    width: 720px;
    max-width: calc(100vw - 120px);
    color: #0f172a;
    font-family: "Fira Mono", monospace;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .title {
    font-size: 22px;
    letter-spacing: 0.08em;
    color: #9a3412;
    font-weight: 700;
  }

  .stats {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 72px;
    padding: 8px 10px;
    border-radius: 10px;
    background: #ffedd5;
    border: 1px solid #fdba74;
  }

  .stat-label {
    font-size: 10px;
    color: #7c2d12;
    letter-spacing: 0.08em;
  }

  .stat-value {
    font-size: 22px;
    font-weight: 700;
    color: #9a3412;
    line-height: 1;
  }

  .stat-value--small {
    font-size: 13px;
    letter-spacing: 0.06em;
    line-height: 1.2;
    margin-top: 2px;
  }

  .close-btn {
    margin-left: 4px;
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 9px;
    background: #1e293b;
    color: #f8fafc;
    font-size: 24px;
    cursor: pointer;
  }

  .board {
    position: relative;
    overflow: hidden;
    padding: 16px;
    border-radius: 14px;
    border: 2px solid #fdba74;
    background:
      radial-gradient(circle at 20% 20%, rgba(255, 247, 237, 0.62) 0 18%, transparent 20%),
      radial-gradient(circle at 80% 72%, rgba(120, 53, 15, 0.2) 0 19%, transparent 22%),
      linear-gradient(180deg, #fcd6a8 0%, #f59e0b 58%, #b45309 100%);
    min-height: 390px;
  }

  .hole {
    position: absolute;
    left: var(--x);
    top: var(--y);
    transform: translate(-50%, -50%);
    width: 112px;
    height: 112px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    cursor: pointer;
  }

  .hole:active {
    margin-top: 1px;
  }

  .mound {
    position: absolute;
    left: 50%;
    bottom: 10px;
    transform: translateX(-50%);
    width: 102%;
    height: 46%;
    border-radius: 999px;
    background: radial-gradient(circle at 36% 32%, #f59e0b 0 20%, #b45309 68%, #78350f 100%);
    box-shadow: inset 0 -3px 0 rgba(120, 53, 15, 0.6);
  }

  .hole-shadow {
    position: absolute;
    left: 50%;
    bottom: 18px;
    transform: translateX(-50%);
    width: 76%;
    height: 31%;
    border-radius: 999px;
    background:
      radial-gradient(circle at 50% 45%, #020617 0 42%, #0f172a 70%, #1e293b 100%);
    border: 2px solid rgba(30, 41, 59, 0.85);
  }

  .slot-key {
    position: absolute;
    right: 6px;
    top: 8px;
    min-width: 18px;
    border-radius: 8px;
    padding: 2px 4px;
    color: #334155;
    font-size: 11px;
    line-height: 1;
    background: rgba(255, 247, 237, 0.82);
    border: 1px solid rgba(120, 53, 15, 0.3);
  }

  .diglett {
    position: absolute;
    left: 50%;
    bottom: 29px;
    transform: translateX(-50%);
    width: 56px;
    height: 65px;
    border-radius: 55% 55% 40% 40%;
    background: radial-gradient(circle at 35% 20%, #fef3c7 0 17%, #c0841a 24%, #854d0e 100%);
    border: 2px solid #78350f;
    box-shadow: inset 0 -4px 0 rgba(120, 53, 15, 0.62);
    animation: pop 120ms ease-out;
    z-index: 2;
  }

  .eye {
    position: absolute;
    top: 24px;
    width: 6px;
    height: 8px;
    border-radius: 6px;
    background: #1f2937;
  }

  .eye.left {
    left: 15px;
  }

  .eye.right {
    right: 15px;
  }

  .brow {
    position: absolute;
    top: 18px;
    width: 11px;
    height: 2px;
    border-radius: 999px;
    background: #78350f;
  }

  .brow.left {
    left: 12px;
    transform: rotate(12deg);
  }

  .brow.right {
    right: 12px;
    transform: rotate(-12deg);
  }

  .nose {
    position: absolute;
    left: 50%;
    top: 34px;
    transform: translateX(-50%);
    width: 16px;
    height: 10px;
    border-radius: 999px;
    background: #fca5a5;
    border: 1px solid #dc2626;
  }

  .mouth {
    position: absolute;
    left: 50%;
    top: 47px;
    transform: translateX(-50%);
    width: 18px;
    height: 8px;
    border-bottom: 2px solid #7f1d1d;
    border-radius: 0 0 999px 999px;
  }

  .cheek {
    position: absolute;
    top: 40px;
    width: 9px;
    height: 6px;
    border-radius: 999px;
    background: rgba(248, 113, 113, 0.35);
  }

  .cheek.left {
    left: 8px;
  }

  .cheek.right {
    right: 8px;
  }

  .mood-grit .mouth {
    width: 16px;
    height: 0;
    top: 50px;
    border-bottom: 0;
    border-top: 2px solid #7f1d1d;
    border-radius: 999px 999px 0 0;
  }

  .mood-grit .brow.left {
    transform: rotate(24deg);
  }

  .mood-grit .brow.right {
    transform: rotate(-24deg);
  }

  .mood-surprised .mouth {
    width: 8px;
    height: 8px;
    border: 2px solid #7f1d1d;
    border-radius: 999px;
  }

  .overlay {
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background: rgba(15, 23, 42, 0.84);
    color: #f8fafc;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    text-align: center;
    padding: 16px;
  }

  .overlay-title {
    font-size: 28px;
    margin: 0;
    color: #fff7ed;
  }

  .overlay-hint,
  .overlay-score {
    margin: 0;
    color: #cbd5e1;
    font-size: 13px;
  }

  .difficulty-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 2px;
  }

  .difficulty-btn {
    border: 1px solid #64748b;
    border-radius: 9px;
    background: #1e293b;
    color: #e2e8f0;
    padding: 7px 12px;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    letter-spacing: 0.04em;
    min-width: 90px;
  }

  .difficulty-btn.active {
    border-color: #fb923c;
    background: #ea580c;
    color: #fff7ed;
  }

  .btn-primary,
  .btn-secondary {
    min-width: 150px;
    border: 0;
    border-radius: 10px;
    padding: 10px 12px;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    letter-spacing: 0.04em;
  }

  .btn-primary {
    background: #ea580c;
    color: #fff7ed;
  }

  .btn-secondary {
    background: #334155;
    color: #e2e8f0;
  }

  @keyframes pop {
    from {
      transform: translateX(-50%) translateY(10px);
      opacity: 0.3;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }

  @media (max-width: 720px) {
    .whac {
      width: min(94vw, 460px);
      max-width: min(94vw, 460px);
    }

    .header {
      flex-wrap: wrap;
      gap: 8px;
    }

    .stats {
      order: 3;
      width: 100%;
      justify-content: space-between;
    }

    .board {
      padding: 10px;
      min-height: 320px;
    }

    .hole {
      width: 84px;
      height: 84px;
    }

    .diglett {
      width: 42px;
      height: 49px;
      bottom: 24px;
    }

    .eye {
      top: 18px;
      width: 5px;
      height: 6px;
    }

    .brow {
      top: 14px;
      width: 8px;
    }

    .nose {
      top: 26px;
      width: 12px;
      height: 8px;
    }

    .mouth {
      top: 35px;
      width: 14px;
      height: 6px;
    }

    .mood-surprised .mouth {
      width: 6px;
      height: 6px;
    }
  }
</style>
