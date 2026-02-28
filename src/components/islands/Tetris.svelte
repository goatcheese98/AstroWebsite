<script lang="ts">
  type TetrisMode = "menu" | "playing" | "paused" | "gameover";
  const PIECES = ["I", "O", "T", "S", "Z", "J", "L"] as const;
  type PieceType = (typeof PIECES)[number];
  type Piece = { type: PieceType; rotation: number; x: number; y: number };
  type Cell = [number, number];

  const COLS = 8;
  const ROWS = 11;

  const COLOR_BY_ID = [
    "transparent",
    "#22d3ee",
    "#eab308",
    "#a855f7",
    "#22c55e",
    "#ef4444",
    "#3b82f6",
    "#f97316",
  ];

  const ID_BY_PIECE: Record<PieceType, number> = { I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7 };

  const SHAPES: Record<PieceType, Cell[][]> = {
    I: [[[0,1],[1,1],[2,1],[3,1]], [[2,0],[2,1],[2,2],[2,3]], [[0,2],[1,2],[2,2],[3,2]], [[1,0],[1,1],[1,2],[1,3]]],
    O: [[[1,0],[2,0],[1,1],[2,1]]],
    T: [[[1,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[2,1],[1,2]], [[1,0],[0,1],[1,1],[1,2]]],
    S: [[[1,0],[2,0],[0,1],[1,1]], [[1,0],[1,1],[2,1],[2,2]], [[1,1],[2,1],[0,2],[1,2]], [[0,0],[0,1],[1,1],[1,2]]],
    Z: [[[0,0],[1,0],[1,1],[2,1]], [[2,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[1,2],[2,2]], [[1,0],[0,1],[1,1],[0,2]]],
    J: [[[0,0],[0,1],[1,1],[2,1]], [[1,0],[2,0],[1,1],[1,2]], [[0,1],[1,1],[2,1],[2,2]], [[1,0],[1,1],[0,2],[1,2]]],
    L: [[[2,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[1,2],[2,2]], [[0,1],[1,1],[2,1],[0,2]], [[0,0],[1,0],[1,1],[1,2]]],
  };

  let { onClose }: { onClose: () => void } = $props();

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  function randomPiece(): PieceType {
    return PIECES[Math.floor(Math.random() * PIECES.length)];
  }

  function newPiece(type: PieceType): Piece {
    return { type, rotation: 0, x: Math.floor(COLS / 2) - 2, y: -1 };
  }

  function getCells(p: Piece, rotation = p.rotation, x = p.x, y = p.y) {
    const shape = SHAPES[p.type][rotation % SHAPES[p.type].length];
    return shape.map(([dx, dy]) => ({ x: x + dx, y: y + dy }));
  }

  let mode = $state<TetrisMode>("menu");
  let board = $state<number[][]>(emptyBoard());
  let piece = $state<Piece | null>(null);
  let nextPiece = $state<PieceType>(randomPiece());
  let score = $state(0);
  let lines = $state(0);
  let dropTimer: ReturnType<typeof setInterval> | null = null;

  const level = $derived(Math.floor(lines / 8) + 1);

  const renderGrid = $derived.by(() => {
    const merged = board.map((r) => r.slice());
    if (piece) {
      for (const cell of getCells(piece)) {
        if (cell.x >= 0 && cell.x < COLS && cell.y >= 0 && cell.y < ROWS) {
          merged[cell.y][cell.x] = ID_BY_PIECE[piece.type];
        }
      }
    }
    return merged;
  });

  const nextPreview = $derived.by(() => {
    const shape = SHAPES[nextPiece][0];
    const xs = shape.map(([x]) => x);
    const ys = shape.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const cs = 18;
    const aW = 4 * cs;
    const aH = 3 * cs;
    const pW = (maxX - minX + 1) * cs;
    const pH = (maxY - minY + 1) * cs;
    return shape.map(([x, y]) => ({
      left: (aW - pW) / 2 + (x - minX) * cs,
      top: (aH - pH) / 2 + (y - minY) * cs,
      size: cs - 2,
    }));
  });

  function hasCollision(p: Piece, rotation = p.rotation, x = p.x, y = p.y) {
    for (const cell of getCells(p, rotation, x, y)) {
      if (cell.x < 0 || cell.x >= COLS || cell.y >= ROWS) return true;
      if (cell.y >= 0 && board[cell.y][cell.x] !== 0) return true;
    }
    return false;
  }

  function clearLines(b: number[][]) {
    const kept = b.filter((row) => row.some((c) => c === 0));
    const cleared = ROWS - kept.length;
    while (kept.length < ROWS) kept.unshift(Array(COLS).fill(0));
    return { board: kept, cleared };
  }

  function spawnNext() {
    const spawned = newPiece(nextPiece);
    nextPiece = randomPiece();
    if (hasCollision(spawned)) {
      mode = "gameover";
      piece = null;
      return;
    }
    piece = spawned;
  }

  function startGame() {
    board = emptyBoard();
    score = 0;
    lines = 0;
    mode = "playing";
    const first = newPiece(nextPiece);
    nextPiece = randomPiece();
    if (hasCollision(first)) {
      mode = "gameover";
      piece = null;
      return;
    }
    piece = first;
  }

  function togglePause() {
    if (mode === "playing") mode = "paused";
    else if (mode === "paused") mode = "playing";
  }

  function lockPiece() {
    if (!piece) return;
    const nb = board.map((r) => r.slice());
    for (const cell of getCells(piece)) {
      if (cell.y < 0) { mode = "gameover"; piece = null; return; }
      nb[cell.y][cell.x] = ID_BY_PIECE[piece.type];
    }
    const { board: b, cleared } = clearLines(nb);
    board = b;
    if (cleared > 0) {
      const pts = [0, 100, 300, 500, 800];
      score += (pts[cleared] || 0) * level;
      lines += cleared;
    }
    spawnNext();
  }

  function moveLeft() {
    if (!piece || mode !== "playing") return;
    if (!hasCollision(piece, piece.rotation, piece.x - 1, piece.y)) {
      piece = { ...piece, x: piece.x - 1 };
    }
  }

  function moveRight() {
    if (!piece || mode !== "playing") return;
    if (!hasCollision(piece, piece.rotation, piece.x + 1, piece.y)) {
      piece = { ...piece, x: piece.x + 1 };
    }
  }

  function rotatePiece() {
    if (!piece || mode !== "playing") return;
    const nextRot = (piece.rotation + 1) % SHAPES[piece.type].length;
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!hasCollision(piece, nextRot, piece.x + kick, piece.y)) {
        piece = { ...piece, rotation: nextRot, x: piece.x + kick };
        return;
      }
    }
  }

  function stepDown() {
    if (!piece || mode !== "playing") return;
    if (!hasCollision(piece, piece.rotation, piece.x, piece.y + 1)) {
      piece = { ...piece, y: piece.y + 1 };
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    if (!piece || mode !== "playing") return;
    let ny = piece.y;
    while (!hasCollision(piece, piece.rotation, piece.x, ny + 1)) ny++;
    piece = { ...piece, y: ny };
    lockPiece();
  }

  function dropDelay() {
    return Math.max(220, 980 - (level - 1) * 75);
  }

  function handleKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

    const consume = () => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    if (e.key === "Escape") { consume(); onClose(); return; }

    if (mode === "menu") {
      if (e.key === "Enter" || e.key === " ") { consume(); startGame(); }
      return;
    }
    if (mode === "gameover") {
      if (e.key === "Enter" || e.key === " ") { consume(); startGame(); }
      return;
    }
    if (mode === "paused") {
      if (e.key.toLowerCase() === "p") { consume(); togglePause(); }
      return;
    }
    if (mode !== "playing") return;

    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) consume();
    switch (e.key) {
      case "ArrowLeft": moveLeft(); break;
      case "ArrowRight": moveRight(); break;
      case "ArrowUp": rotatePiece(); break;
      case "ArrowDown": stepDown(); break;
      case " ": hardDrop(); break;
      case "p": case "P": consume(); togglePause(); break;
    }
  }

  $effect(() => {
    window.addEventListener("keydown", handleKey, { capture: true });
    return () => window.removeEventListener("keydown", handleKey, { capture: true });
  });

  $effect(() => {
    if (dropTimer) { clearInterval(dropTimer); dropTimer = null; }
    if (mode === "playing") {
      dropTimer = setInterval(stepDown, dropDelay());
    }
    return () => { if (dropTimer) { clearInterval(dropTimer); dropTimer = null; } };
  });
</script>

<div class="tetris">
  <div class="header">
    <span class="title">TETRIS</span>
    <div class="stats">
      <div class="stat">
        <span class="stat-label">LEVEL</span>
        <span class="stat-value">{level}</span>
      </div>
      <div class="stat">
        <span class="stat-label">SCORE</span>
        <span class="stat-value">{score}</span>
      </div>
      <div class="stat">
        <span class="stat-label">LINES</span>
        <span class="stat-value">{lines}</span>
      </div>
    </div>
    <button class="close-btn" onclick={onClose} aria-label="Close">×</button>
  </div>

  <div class="game-area">
    <div class="board-wrapper">
      <div class="board">
        {#each renderGrid as row}
          {#each row as cell}
            <div
              class="cell"
              class:filled={cell !== 0}
              style={cell !== 0 ? `background: ${COLOR_BY_ID[cell]};` : ""}
            ></div>
          {/each}
        {/each}
      </div>

      {#if mode === "menu"}
        <div class="board-overlay">
          <p class="overlay-title">READY?</p>
          <p class="overlay-hint">Arrow keys to move · P to pause · ESC to close</p>
          <button class="btn-primary" onclick={startGame}>START GAME</button>
        </div>
      {:else if mode === "paused"}
        <div class="board-overlay">
          <p class="overlay-title">PAUSED</p>
          <button class="btn-primary" onclick={togglePause}>RESUME</button>
          <button class="btn-secondary" onclick={onClose}>EXIT</button>
        </div>
      {:else if mode === "gameover"}
        <div class="board-overlay">
          <p class="overlay-title">GAME OVER</p>
          <p class="overlay-score">Score: {score}</p>
          <button class="btn-primary" onclick={startGame}>PLAY AGAIN</button>
          <button class="btn-secondary" onclick={onClose}>EXIT</button>
        </div>
      {:else if mode === "playing"}
        <div class="pause-btn-wrap">
          <button class="ctrl-btn" onclick={togglePause} title="Pause (P)">⏸</button>
        </div>
      {/if}
    </div>

    <div class="sidebar">
      <div class="next-box">
        <span class="sidebar-label">NEXT</span>
        <div class="next-preview">
          {#each nextPreview as cell}
            <div
              class="preview-cell"
              style="left: {cell.left}px; top: {cell.top}px; width: {cell.size}px; height: {cell.size}px; background: {COLOR_BY_ID[ID_BY_PIECE[nextPiece]]};"
            ></div>
          {/each}
        </div>
      </div>

      <div class="control-pad">
        <span class="sidebar-label">CONTROLS</span>
        <button class="ctrl-btn" onclick={rotatePiece} title="Rotate (↑)">↑</button>
        <div class="ctrl-row">
          <button class="ctrl-btn" onclick={moveLeft} title="Left (←)">←</button>
          <button class="ctrl-btn" onclick={stepDown} title="Soft drop (↓)">↓</button>
          <button class="ctrl-btn" onclick={moveRight} title="Right (→)">→</button>
        </div>
        <button class="ctrl-btn drop-btn" onclick={hardDrop} title="Hard drop (Space)">DROP</button>
      </div>
    </div>
  </div>
</div>

<style>
  .tetris {
    font-family: "Courier New", monospace;
    user-select: none;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(180, 120, 20, 0.2);
  }

  .title {
    font-size: 18px;
    font-weight: bold;
    color: #d97706;
    letter-spacing: 4px;
    flex-shrink: 0;
  }

  .stats {
    display: flex;
    gap: 16px;
    flex: 1;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-label {
    font-size: 9px;
    color: #94a3b8;
    letter-spacing: 1px;
  }

  .stat-value {
    font-size: 16px;
    font-weight: bold;
    color: #475569;
    min-width: 40px;
    text-align: center;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 22px;
    cursor: pointer;
    color: #94a3b8;
    padding: 2px 8px;
    line-height: 1;
    border-radius: 6px;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
  }

  .close-btn:hover {
    background: rgba(148, 163, 184, 0.2);
    color: #64748b;
  }

  .game-area {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .board-wrapper {
    position: relative;
    flex-shrink: 0;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(8, 28px);
    grid-template-rows: repeat(11, 28px);
    gap: 1px;
    background: rgba(180, 120, 20, 0.18);
    border: 2px solid rgba(180, 120, 20, 0.3);
    border-radius: 8px;
    padding: 2px;
  }

  .cell {
    width: 28px;
    height: 28px;
    border-radius: 3px;
    background: rgba(254, 243, 199, 0.6);
    transition: background 0.05s;
  }

  .cell.filled {
    box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 0 rgba(0, 0, 0, 0.2);
  }

  .board-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: rgba(254, 251, 235, 0.92);
    border-radius: 8px;
    backdrop-filter: blur(2px);
  }

  .overlay-title {
    font-size: 20px;
    font-weight: bold;
    color: #d97706;
    letter-spacing: 3px;
    margin: 0;
  }

  .overlay-hint {
    font-size: 9px;
    color: #94a3b8;
    text-align: center;
    max-width: 180px;
    margin: 0;
    line-height: 1.5;
  }

  .overlay-score {
    font-size: 13px;
    color: #64748b;
    margin: 0;
  }

  .btn-primary {
    background: #d97706;
    color: white;
    border: none;
    padding: 8px 22px;
    border-radius: 8px;
    font-family: inherit;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    letter-spacing: 1px;
    transition: background 0.15s, transform 0.1s;
  }

  .btn-primary:hover { background: #b45309; }
  .btn-primary:active { transform: translateY(1px); }

  .btn-secondary {
    background: transparent;
    color: #94a3b8;
    border: 1px solid #e2e8f0;
    padding: 6px 18px;
    border-radius: 8px;
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-secondary:hover { background: rgba(148, 163, 184, 0.1); border-color: #cbd5e1; }

  .pause-btn-wrap {
    position: absolute;
    top: 6px;
    right: 6px;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding-top: 2px;
  }

  .sidebar-label {
    display: block;
    font-size: 9px;
    font-weight: bold;
    color: #94a3b8;
    letter-spacing: 2px;
    text-align: center;
    margin-bottom: 8px;
  }

  .next-box {
    display: flex;
    flex-direction: column;
  }

  .next-preview {
    position: relative;
    width: 72px;
    height: 54px;
    background: rgba(180, 120, 20, 0.08);
    border: 1px solid rgba(180, 120, 20, 0.22);
    border-radius: 6px;
  }

  .preview-cell {
    position: absolute;
    border-radius: 3px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }

  .control-pad {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .ctrl-row {
    display: flex;
    gap: 4px;
  }

  .ctrl-btn {
    width: 32px;
    height: 32px;
    background: rgba(254, 243, 199, 0.8);
    border: 1px solid rgba(180, 120, 20, 0.3);
    border-radius: 7px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.1s;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  }

  .ctrl-btn:hover {
    background: rgba(254, 235, 175, 0.9);
    border-color: rgba(180, 120, 20, 0.45);
  }

  .ctrl-btn:active {
    transform: translateY(1px);
    box-shadow: 0 0 1px rgba(0, 0, 0, 0.1);
    background: rgba(254, 220, 130, 0.9);
  }

  .drop-btn {
    width: auto;
    height: 28px;
    padding: 0 12px;
    font-size: 9px;
    font-weight: bold;
    letter-spacing: 1px;
  }
</style>
