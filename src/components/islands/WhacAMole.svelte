<script lang="ts">
  type WhacMode = "menu" | "playing" | "gameover";
  type WhacDifficulty = "easy" | "medium" | "hard";
  type Slot = { id: number; label: string };

  const SLOTS: Slot[] = [
    { id: 0, label: "1" },
    { id: 1, label: "2" },
    { id: 2, label: "3" },
    { id: 3, label: "4" },
    { id: 4, label: "5" },
    { id: 5, label: "6" },
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
      <button class="hole" onclick={() => whack(slot.id)}>
        {#if activeSlot === slot.id}
          <span class="mole">
            <span class="eye left"></span>
            <span class="eye right"></span>
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
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    padding: 16px;
    border-radius: 14px;
    border: 2px solid #fdba74;
    background: linear-gradient(180deg, #fed7aa 0%, #fdba74 100%);
    min-height: 360px;
  }

  .hole {
    position: relative;
    border: 0;
    border-radius: 12px;
    background: rgba(120, 53, 15, 0.2);
    min-height: 96px;
    cursor: pointer;
  }

  .hole:active {
    transform: translateY(1px);
  }

  .hole-shadow {
    position: absolute;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    width: 72%;
    height: 24px;
    border-radius: 999px;
    background: #111827;
    border: 2px solid #334155;
  }

  .slot-key {
    position: absolute;
    left: 50%;
    bottom: 18px;
    transform: translateX(-50%);
    color: #94a3b8;
    font-size: 12px;
  }

  .mole {
    position: absolute;
    left: 50%;
    bottom: 28px;
    transform: translateX(-50%);
    width: 48px;
    height: 48px;
    border-radius: 999px;
    background: radial-gradient(circle at 35% 30%, #fef3c7 0 18%, #92400e 20% 100%);
    border: 2px solid #78350f;
    animation: pop 120ms ease-out;
  }

  .eye {
    position: absolute;
    top: 19px;
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: #1f2937;
  }

  .eye.left {
    left: 14px;
  }

  .eye.right {
    right: 14px;
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
      gap: 10px;
      padding: 10px;
      min-height: 290px;
    }

    .hole {
      min-height: 78px;
    }

    .mole {
      width: 38px;
      height: 38px;
      bottom: 25px;
    }
  }
</style>
