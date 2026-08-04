<script lang="ts">
  import Screen from "./Screen.svelte";
  import {
    createMarvinIntroPlan,
    pickMarvinMove,
    type MarvinIntroPhase,
    type MarvinMove,
  } from "../../lib/marvin-motion";

  type RobotState = "idle" | "waving" | "happy" | "excited" | "love" | "sleeping";
  type ScreenMessage = "smile" | "hi" | "stars" | "zzz" | "games";
  type TetrisMode = "closed" | "menu" | "playing" | "paused" | "gameover";
  type TetrisAction = "left" | "right" | "down" | "rotate" | "drop" | "pause";
  type WhacMode = "closed" | "menu" | "playing" | "gameover";
  type WhacDifficulty = "easy" | "medium" | "hard";
  type GameView = "list" | "tetris" | "whac";
  const TETRIS_PIECES = ["I", "O", "T", "S", "Z", "J", "L"] as const;
  type TetrisPieceType = (typeof TETRIS_PIECES)[number];
  type TetrisPiece = { type: TetrisPieceType; rotation: number; x: number; y: number };
  type TetrisCell = [number, number];

  const MESSAGES: ScreenMessage[] = ["smile", "hi", "stars"];
  const COLORS = {
    body: "#e2e8f0",
    bodyLight: "#f1f5f9",
    bodyStroke: "#475569",
    eyeRing: "#d97706",
    eye: "#f59e0b",
    screen: "#fef3c7",
    screenActive: "#fde68a",
    accent: "#3b82f6",
    joint: "#94a3b8",
    jointDark: "#64748b",
    beltAccent: "#f97316",
    indicatorGreen: "#22c55e",
    indicatorRed: "#ef4444",
    indicatorBlue: "#3b82f6",
    scanGreen: "#22c55e",
    ekgBlue: "#38bdf8",
  };
  const TETRIS_COLS = 8;
  const TETRIS_ROWS = 11;
  const TETRIS_CELL_SIZE = 7;
  const TETRIS_BOARD_X = 104;
  const TETRIS_BOARD_Y = 182;
  const TETRIS_COLOR_BY_ID = [
    "transparent",
    "#22d3ee",
    "#eab308",
    "#a855f7",
    "#22c55e",
    "#ef4444",
    "#3b82f6",
    "#f97316",
  ];
  const TETRIS_ID_BY_PIECE: Record<TetrisPieceType, number> = {
    I: 1,
    O: 2,
    T: 3,
    S: 4,
    Z: 5,
    J: 6,
    L: 7,
  };
  const TETRIS_SHAPES: Record<TetrisPieceType, TetrisCell[][]> = {
    I: [
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
      ],
      [
        [2, 0],
        [2, 1],
        [2, 2],
        [2, 3],
      ],
      [
        [0, 2],
        [1, 2],
        [2, 2],
        [3, 2],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 2],
        [1, 3],
      ],
    ],
    O: [
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
    ],
    T: [
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, 2],
      ],
    ],
    S: [
      [
        [1, 0],
        [2, 0],
        [0, 1],
        [1, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [2, 1],
        [2, 2],
      ],
      [
        [1, 1],
        [2, 1],
        [0, 2],
        [1, 2],
      ],
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 2],
      ],
    ],
    Z: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 1],
      ],
      [
        [2, 0],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
      [
        [0, 1],
        [1, 1],
        [1, 2],
        [2, 2],
      ],
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [0, 2],
      ],
    ],
    J: [
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [1, 2],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [2, 2],
      ],
      [
        [1, 0],
        [1, 1],
        [0, 2],
        [1, 2],
      ],
    ],
    L: [
      [
        [2, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 2],
        [2, 2],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [0, 2],
      ],
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [1, 2],
      ],
    ],
  };
  const WHAC_SLOTS = [
    { id: 0, x: 119, y: 208, expression: "calm" },
    { id: 1, x: 147, y: 205, expression: "grit" },
    { id: 2, x: 176, y: 212, expression: "surprised" },
    { id: 3, x: 128, y: 231, expression: "grit" },
    { id: 4, x: 157, y: 226, expression: "calm" },
    { id: 5, x: 181, y: 238, expression: "surprised" },
  ] as const;
  const WHAC_DIFFICULTY_CONFIG: Record<
    WhacDifficulty,
    { label: string; visibleBase: number; visibleVariance: number; gapBase: number; gapVariance: number }
  > = {
    easy: { label: "EASY", visibleBase: 620, visibleVariance: 420, gapBase: 300, gapVariance: 360 },
    medium: { label: "MED", visibleBase: 470, visibleVariance: 360, gapBase: 220, gapVariance: 300 },
    hard: { label: "HARD", visibleBase: 330, visibleVariance: 300, gapBase: 140, gapVariance: 220 },
  };

  // State
  let robotState = $state<RobotState>("idle");
  let screenMessage = $state<ScreenMessage>("smile");
  let isHovering = $state(false);
  let mouseOffset = $state({ x: 0, y: 0 });
  let containerRef: HTMLDivElement;
  let clickAnimation = $state<MarvinMove | null>(null);
  let breathPhase = $state(0);
  let idleTime = $state(0);
  let gameView = $state<GameView>("list");
  let expandedGameOpen = $state(false);
  let tetrisMode = $state<TetrisMode>("closed");
  let tetrisBoard = $state<number[][]>(createEmptyTetrisBoard());
  let tetrisPiece = $state<TetrisPiece | null>(null);
  let tetrisNextPiece = $state<TetrisPieceType>(randomTetrisPiece());
  let tetrisScore = $state(0);
  let tetrisLines = $state(0);
  let whacMode = $state<WhacMode>("closed");
  let whacScore = $state(0);
  let whacTimeLeft = $state(30);
  let whacActiveSlot = $state<number | null>(null);
  let lastWhacSlot = $state<number | null>(null);
  let whacDifficulty = $state<WhacDifficulty>("medium");
  let introPhase = $state<MarvinIntroPhase>("grappling");

  // Refs for timers
  let waveTimeout: ReturnType<typeof setTimeout> | null = null;
  let messageInterval: ReturnType<typeof setInterval> | null = null;
  let clickAnimationTimeout: ReturnType<typeof setTimeout> | null = null;
  let breathInterval: ReturnType<typeof setInterval> | null = null;
  let idleTimer: ReturnType<typeof setInterval> | null = null;
  let tetrisDropTimer: ReturnType<typeof setInterval> | null = null;
  let whacCountdownTimer: ReturnType<typeof setInterval> | null = null;
  let whacSpawnTimer: ReturnType<typeof setTimeout> | null = null;
  let whacHideTimer: ReturnType<typeof setTimeout> | null = null;
  let introTimers: ReturnType<typeof setTimeout>[] = [];
  const tetrisKeyListenerOptions: AddEventListenerOptions = { capture: true };

  function createEmptyTetrisBoard() {
    return Array.from({ length: TETRIS_ROWS }, () => Array(TETRIS_COLS).fill(0));
  }

  function randomTetrisPiece(): TetrisPieceType {
    return TETRIS_PIECES[Math.floor(Math.random() * TETRIS_PIECES.length)];
  }

  function createTetrisPiece(type: TetrisPieceType): TetrisPiece {
    return {
      type,
      rotation: 0,
      x: Math.floor(TETRIS_COLS / 2) - 2,
      y: -1,
    };
  }

  function getTetrisCells(
    piece: TetrisPiece,
    rotation = piece.rotation,
    x = piece.x,
    y = piece.y,
  ) {
    const shapeStates = TETRIS_SHAPES[piece.type];
    const shape = shapeStates[rotation % shapeStates.length];
    return shape.map(([dx, dy]) => ({ x: x + dx, y: y + dy }));
  }

  function getTetrisNextPreviewCells(type: TetrisPieceType) {
    const previewArea = { x: 167, y: 208, width: 23, height: 21, cell: 4.5 };
    const baseShape = TETRIS_SHAPES[type][0];
    const xs = baseShape.map(([x]) => x);
    const ys = baseShape.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pieceW = (maxX - minX + 1) * previewArea.cell;
    const pieceH = (maxY - minY + 1) * previewArea.cell;
    const startX = previewArea.x + (previewArea.width - pieceW) / 2;
    const startY = previewArea.y + (previewArea.height - pieceH) / 2;

    return baseShape.map(([x, y]) => ({
      x: startX + (x - minX) * previewArea.cell,
      y: startY + (y - minY) * previewArea.cell,
      size: previewArea.cell - 0.5,
    }));
  }

  function hasTetrisCollision(
    piece: TetrisPiece,
    rotation = piece.rotation,
    x = piece.x,
    y = piece.y,
  ) {
    for (const cell of getTetrisCells(piece, rotation, x, y)) {
      if (cell.x < 0 || cell.x >= TETRIS_COLS || cell.y >= TETRIS_ROWS) {
        return true;
      }
      if (cell.y >= 0 && tetrisBoard[cell.y][cell.x] !== 0) {
        return true;
      }
    }
    return false;
  }

  function clearTetrisLines(board: number[][]) {
    const keptRows = board.filter((row) => row.some((cell) => cell === 0));
    const clearedCount = TETRIS_ROWS - keptRows.length;
    while (keptRows.length < TETRIS_ROWS) {
      keptRows.unshift(Array(TETRIS_COLS).fill(0));
    }
    return { board: keptRows, clearedCount };
  }

  function stopEvent(event?: Event) {
    if (!event) return;
    event.stopPropagation();
    event.preventDefault();
  }

  function resetTetrisState() {
    tetrisMode = "closed";
    tetrisBoard = createEmptyTetrisBoard();
    tetrisPiece = null;
    tetrisScore = 0;
    tetrisLines = 0;
    tetrisNextPiece = randomTetrisPiece();
  }

  function clearWhacTimers() {
    if (whacCountdownTimer) {
      clearInterval(whacCountdownTimer);
      whacCountdownTimer = null;
    }
    if (whacSpawnTimer) {
      clearTimeout(whacSpawnTimer);
      whacSpawnTimer = null;
    }
    if (whacHideTimer) {
      clearTimeout(whacHideTimer);
      whacHideTimer = null;
    }
  }

  function resetWhacState() {
    clearWhacTimers();
    whacMode = "closed";
    whacScore = 0;
    whacTimeLeft = 30;
    whacActiveSlot = null;
    lastWhacSlot = null;
  }

  function openGamesMenu(event?: Event) {
    stopEvent(event);
    idleTime = 0;
    if (robotState === "sleeping") {
      robotState = "idle";
    }
    robotState = "happy";
    screenMessage = "games";
    gameView = "list";
    resetTetrisState();
    resetWhacState();
  }

  function closeGames(event?: Event) {
    stopEvent(event);
    expandedGameOpen = false;
    gameView = "list";
    resetTetrisState();
    resetWhacState();
    robotState = "idle";
    screenMessage = "smile";
  }

  function closeExpandedGame() {
    expandedGameOpen = false;
  }

  function openExpandedGame(event?: Event) {
    stopEvent(event);
    idleTime = 0;
    if (screenMessage !== "games") {
      openGamesMenu();
    }
    if (gameView === "list") {
      gameView = "tetris";
      if (tetrisMode === "closed") {
        tetrisMode = "menu";
      }
    }
    expandedGameOpen = true;
  }

  function openTetrisGame(event?: Event) {
    stopEvent(event);
    idleTime = 0;
    if (robotState === "sleeping") {
      robotState = "idle";
    }
    robotState = "happy";
    screenMessage = "games";
    gameView = "tetris";
    resetWhacState();
    if (tetrisMode === "closed") {
      tetrisMode = "menu";
    }
  }

  function openWhacGame(event?: Event) {
    stopEvent(event);
    idleTime = 0;
    if (robotState === "sleeping") {
      robotState = "idle";
    }
    robotState = "happy";
    screenMessage = "games";
    gameView = "whac";
    resetTetrisState();
    if (whacMode === "closed") {
      whacMode = "menu";
    }
  }

  function backToGameList(event?: Event) {
    stopEvent(event);
    idleTime = 0;
    screenMessage = "games";
    gameView = "list";
    resetTetrisState();
    resetWhacState();
  }

  function spawnNextTetrisPiece() {
    const spawned = createTetrisPiece(tetrisNextPiece);
    tetrisNextPiece = randomTetrisPiece();
    if (hasTetrisCollision(spawned)) {
      tetrisMode = "gameover";
      tetrisPiece = null;
      return;
    }
    tetrisPiece = spawned;
  }

  function startTetris(event?: Event) {
    stopEvent(event);
    idleTime = 0;
    robotState = "happy";
    screenMessage = "games";
    gameView = "tetris";
    resetWhacState();
    tetrisBoard = createEmptyTetrisBoard();
    tetrisScore = 0;
    tetrisLines = 0;
    tetrisMode = "playing";
    const first = createTetrisPiece(tetrisNextPiece);
    tetrisNextPiece = randomTetrisPiece();
    if (hasTetrisCollision(first)) {
      tetrisMode = "gameover";
      tetrisPiece = null;
      return;
    }
    tetrisPiece = first;
  }

  function pickNextWhacSlot() {
    const candidates = WHAC_SLOTS.map((slot) => slot.id).filter((id) => id !== lastWhacSlot);
    const fromPool = candidates.length ? candidates : WHAC_SLOTS.map((slot) => slot.id);
    return fromPool[Math.floor(Math.random() * fromPool.length)];
  }

  function scheduleWhacRound() {
    if (whacMode !== "playing") return;
    const nextSlot = pickNextWhacSlot();
    lastWhacSlot = nextSlot;
    whacActiveSlot = nextSlot;
    const settings = WHAC_DIFFICULTY_CONFIG[whacDifficulty];
    const paceScale = Math.max(0.6, whacTimeLeft / 30);
    const visibleMs =
      settings.visibleBase + Math.floor(Math.random() * settings.visibleVariance * paceScale);
    const nextRoundMs = visibleMs + settings.gapBase + Math.floor(Math.random() * settings.gapVariance);

    if (whacHideTimer) clearTimeout(whacHideTimer);
    whacHideTimer = setTimeout(() => {
      if (whacMode === "playing" && whacActiveSlot === nextSlot) {
        whacActiveSlot = null;
      }
    }, visibleMs);

    if (whacSpawnTimer) clearTimeout(whacSpawnTimer);
    whacSpawnTimer = setTimeout(scheduleWhacRound, nextRoundMs);
  }

  function setWhacDifficulty(level: WhacDifficulty, event?: Event) {
    stopEvent(event);
    whacDifficulty = level;
  }

  function startWhac(event?: Event) {
    stopEvent(event);
    idleTime = 0;
    robotState = "happy";
    screenMessage = "games";
    gameView = "whac";
    resetTetrisState();
    clearWhacTimers();
    whacScore = 0;
    whacTimeLeft = 30;
    whacActiveSlot = null;
    whacMode = "playing";
    scheduleWhacRound();
    whacCountdownTimer = setInterval(() => {
      if (whacMode !== "playing") return;
      whacTimeLeft -= 1;
      if (whacTimeLeft <= 0) {
        whacTimeLeft = 0;
        whacMode = "gameover";
        whacActiveSlot = null;
        clearWhacTimers();
      }
    }, 1000);
  }

  function whackMole(slotId: number, event?: Event) {
    stopEvent(event);
    if (whacMode !== "playing") return;
    if (whacActiveSlot === slotId) {
      whacScore += 1;
      whacActiveSlot = null;
      if (whacSpawnTimer) clearTimeout(whacSpawnTimer);
      whacSpawnTimer = setTimeout(scheduleWhacRound, 90);
    }
  }

  function togglePauseTetris(event?: Event) {
    stopEvent(event);
    if (tetrisMode === "playing") {
      tetrisMode = "paused";
    } else if (tetrisMode === "paused") {
      tetrisMode = "playing";
    }
  }

  function lockTetrisPiece() {
    if (!tetrisPiece) return;
    const boardWithPiece = tetrisBoard.map((row) => row.slice());
    for (const cell of getTetrisCells(tetrisPiece)) {
      if (cell.y < 0) {
        tetrisMode = "gameover";
        tetrisPiece = null;
        return;
      }
      boardWithPiece[cell.y][cell.x] = TETRIS_ID_BY_PIECE[tetrisPiece.type];
    }
    const { board, clearedCount } = clearTetrisLines(boardWithPiece);
    tetrisBoard = board;
    if (clearedCount > 0) {
      const levelNow = Math.floor(tetrisLines / 8) + 1;
      const points = [0, 100, 300, 500, 800];
      tetrisScore += (points[clearedCount] || 0) * levelNow;
      tetrisLines += clearedCount;
    }
    spawnNextTetrisPiece();
  }

  function moveTetrisHorizontally(deltaX: number) {
    if (!tetrisPiece || tetrisMode !== "playing") return;
    if (!hasTetrisCollision(tetrisPiece, tetrisPiece.rotation, tetrisPiece.x + deltaX, tetrisPiece.y)) {
      tetrisPiece = { ...tetrisPiece, x: tetrisPiece.x + deltaX };
    }
  }

  function rotateTetrisPiece() {
    if (!tetrisPiece || tetrisMode !== "playing") return;
    const shapeStates = TETRIS_SHAPES[tetrisPiece.type];
    const nextRotation = (tetrisPiece.rotation + 1) % shapeStates.length;
    const kickOffsets = [0, -1, 1, -2, 2];
    for (const kickX of kickOffsets) {
      if (!hasTetrisCollision(tetrisPiece, nextRotation, tetrisPiece.x + kickX, tetrisPiece.y)) {
        tetrisPiece = { ...tetrisPiece, rotation: nextRotation, x: tetrisPiece.x + kickX };
        return;
      }
    }
  }

  function stepTetrisDown() {
    if (!tetrisPiece || tetrisMode !== "playing") return;
    if (!hasTetrisCollision(tetrisPiece, tetrisPiece.rotation, tetrisPiece.x, tetrisPiece.y + 1)) {
      tetrisPiece = { ...tetrisPiece, y: tetrisPiece.y + 1 };
      return;
    }
    lockTetrisPiece();
  }

  function hardDropTetris() {
    if (!tetrisPiece || tetrisMode !== "playing") return;
    let nextY = tetrisPiece.y;
    while (!hasTetrisCollision(tetrisPiece, tetrisPiece.rotation, tetrisPiece.x, nextY + 1)) {
      nextY++;
    }
    tetrisPiece = { ...tetrisPiece, y: nextY };
    lockTetrisPiece();
  }

  function handleTetrisAction(action: TetrisAction, event?: Event) {
    stopEvent(event);
    if (tetrisMode !== "playing" && action !== "pause") return;
    switch (action) {
      case "left":
        moveTetrisHorizontally(-1);
        break;
      case "right":
        moveTetrisHorizontally(1);
        break;
      case "down":
        stepTetrisDown();
        break;
      case "rotate":
        rotateTetrisPiece();
        break;
      case "drop":
        hardDropTetris();
        break;
      case "pause":
        togglePauseTetris();
        break;
    }
  }

  function consumeTetrisKeyboardEvent(event: KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function handleTetrisKeydown(event: KeyboardEvent) {
    if (expandedGameOpen || screenMessage !== "games") {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable)
    ) {
      return;
    }

    if (gameView === "whac") {
      const whacControlKeys = ["1", "2", "3", "4", "5", "6", "Enter", " ", "Escape"];
      if (whacMode !== "closed" && whacControlKeys.includes(event.key)) {
        consumeTetrisKeyboardEvent(event);
      }

      if (whacMode === "menu") {
        if (event.key === "Enter" || event.key === " ") {
          startWhac(event);
        } else if (event.key === "Escape") {
          backToGameList(event);
        }
        return;
      }

      if (whacMode === "gameover") {
        if (event.key === "Enter" || event.key === " ") {
          startWhac(event);
        } else if (event.key === "Escape") {
          backToGameList(event);
        }
        return;
      }

      if (whacMode !== "playing") return;

      if (event.key === "Escape") {
        backToGameList(event);
        return;
      }

      if (/^[1-6]$/.test(event.key)) {
        whackMole(Number(event.key) - 1);
      }
      return;
    }

    if (gameView !== "tetris") return;

    if (
      tetrisMode !== "closed" &&
      (event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === " ")
    ) {
      consumeTetrisKeyboardEvent(event);
    }

    if (tetrisMode === "menu") {
      if (event.key === "Enter" || event.key === " ") {
        consumeTetrisKeyboardEvent(event);
        startTetris(event);
      } else if (event.key === "Escape") {
        consumeTetrisKeyboardEvent(event);
        backToGameList(event);
      }
      return;
    }

    if (tetrisMode === "gameover") {
      if (event.key === "Enter" || event.key === " ") {
        consumeTetrisKeyboardEvent(event);
        startTetris(event);
      } else if (event.key === "Escape") {
        consumeTetrisKeyboardEvent(event);
        backToGameList(event);
      }
      return;
    }

    if (tetrisMode === "paused") {
      if (event.key.toLowerCase() === "p") {
        consumeTetrisKeyboardEvent(event);
        togglePauseTetris(event);
      } else if (event.key === "Escape") {
        consumeTetrisKeyboardEvent(event);
        backToGameList(event);
      }
      return;
    }

    if (tetrisMode !== "playing") return;

    switch (event.key) {
      case "ArrowLeft":
        handleTetrisAction("left");
        break;
      case "ArrowRight":
        handleTetrisAction("right");
        break;
      case "ArrowUp":
        handleTetrisAction("rotate");
        break;
      case "ArrowDown":
        handleTetrisAction("down");
        break;
      case " ":
        handleTetrisAction("drop");
        break;
      case "p":
      case "P":
        consumeTetrisKeyboardEvent(event);
        handleTetrisAction("pause");
        break;
      case "Escape":
        consumeTetrisKeyboardEvent(event);
        backToGameList();
        break;
    }
  }

  function getTetrisDropDelay() {
    const level = Math.floor(tetrisLines / 8) + 1;
    return Math.max(220, 980 - (level - 1) * 75);
  }

  function handleGlobalMouseMove(e: MouseEvent) {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const offsetX = (e.clientX - centerX) / (rect.width / 2);
    const offsetY = (e.clientY - centerY) / (rect.height / 2);
    mouseOffset = {
      x: Math.max(-1, Math.min(1, offsetX)) * 8,
      y: Math.max(-1, Math.min(1, offsetY)) * 5,
    };
    idleTime = 0;
    if (robotState === "sleeping") {
      robotState = "idle";
      if (screenMessage !== "games") {
        screenMessage = "smile";
      }
    }
  }

  function scheduleWave() {
    const delay = 4000 + Math.random() * 3000;
    waveTimeout = setTimeout(() => {
      if (robotState === "idle" && screenMessage !== "games") {
        robotState = "waving";
        screenMessage = "hi";
        setTimeout(() => {
          robotState = "idle";
          if (screenMessage !== "games") screenMessage = "smile";
        }, 2000);
      }
      scheduleWave();
    }, delay);
  }

  function clearIntroTimers() {
    for (const timer of introTimers) clearTimeout(timer);
    introTimers = [];
  }

  function runIntro(reducedMotion: boolean) {
    clearIntroTimers();
    for (const step of createMarvinIntroPlan(reducedMotion)) {
      if (step.at === 0) {
        introPhase = step.phase;
        continue;
      }

      introTimers.push(setTimeout(() => {
        introPhase = step.phase;
      }, step.at));
    }
  }

  $effect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionPreference = () => runIntro(motionPreference.matches);
    handleMotionPreference();
    motionPreference.addEventListener("change", handleMotionPreference);

    return () => {
      motionPreference.removeEventListener("change", handleMotionPreference);
      clearIntroTimers();
    };
  });

  $effect(() => {
    window.addEventListener("mousemove", handleGlobalMouseMove, { passive: true });
    window.addEventListener("keydown", handleTetrisKeydown, tetrisKeyListenerOptions);
    scheduleWave();

    breathInterval = setInterval(() => {
      breathPhase = (breathPhase + 1) % 360;
    }, 50);

    idleTimer = setInterval(() => {
      idleTime++;
      if (idleTime > 300 && robotState === "idle" && screenMessage !== "games") {
        robotState = "sleeping";
        screenMessage = "zzz";
      }
    }, 50);

    messageInterval = setInterval(() => {
      if (robotState === "idle" && screenMessage !== "games") {
        const nextMsg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
        screenMessage = nextMsg;
        if (nextMsg !== "smile") {
          setTimeout(() => {
            if (robotState === "idle" && screenMessage !== "games") screenMessage = "smile";
          }, 2500);
        }
      }
    }, 6000);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("keydown", handleTetrisKeydown, tetrisKeyListenerOptions);
      if (waveTimeout) clearTimeout(waveTimeout);
      if (messageInterval) clearInterval(messageInterval);
      if (clickAnimationTimeout) clearTimeout(clickAnimationTimeout);
      if (breathInterval) clearInterval(breathInterval);
      if (idleTimer) clearInterval(idleTimer);
      if (tetrisDropTimer) clearInterval(tetrisDropTimer);
      clearWhacTimers();
    };
  });

  $effect(() => {
    if (tetrisDropTimer) {
      clearInterval(tetrisDropTimer);
      tetrisDropTimer = null;
    }
    if (tetrisMode === "playing" && !expandedGameOpen) {
      tetrisDropTimer = setInterval(stepTetrisDown, getTetrisDropDelay());
    }
    return () => {
      if (tetrisDropTimer) {
        clearInterval(tetrisDropTimer);
        tetrisDropTimer = null;
      }
    };
  });

  function handleClick() {
    if (screenMessage === "games" || introPhase !== "online") return;
    const randomAnim = pickMarvinMove();
    clickAnimation = randomAnim;
    idleTime = 0;
    robotState = "excited";
    screenMessage = "hi";
    setTimeout(() => (robotState = "love"), 300);
    setTimeout(() => { robotState = "happy"; }, 1200);
    setTimeout(() => {
      robotState = "idle";
      if (screenMessage !== "games") screenMessage = "smile";
    }, 6000);
    if (clickAnimationTimeout) clearTimeout(clickAnimationTimeout);
    const animationDuration = randomAnim === "grapple" ? 2600 : 2200;
    clickAnimationTimeout = setTimeout(() => { clickAnimation = null; }, animationDuration);
  }

  function handleBotKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleClick();
  }

  function handleMouseEnter() {
    isHovering = true;
    idleTime = 0;
    if (screenMessage !== "games") {
      robotState = "happy";
      screenMessage = "hi";
    }
  }

  function handleMouseLeave() {
    isHovering = false;
    if (screenMessage !== "games") {
      robotState = "idle";
      screenMessage = "smile";
    }
  }

  // Derived values
  const headTranslateX = $derived(mouseOffset.x);
  const headTranslateY = $derived(mouseOffset.y);
  const headRotate = $derived(mouseOffset.x * 0.5);
  const breathOffset = $derived(Math.sin(breathPhase * 0.05) * 2);
  const antennaSwing = $derived(Math.sin(breathPhase * 0.03) * 3 + mouseOffset.x * 0.3);

  const isWaving = $derived(robotState === "waving");
  const isExcited = $derived(robotState === "excited");
  const isLove = $derived(robotState === "love");
  const isSleeping = $derived(robotState === "sleeping");
  const isHappy = $derived(robotState === "happy" || isHovering);
  const isActive = $derived(isHappy || isExcited || isLove);
  const isGamesOpen = $derived(screenMessage === "games");
  const tetrisLevel = $derived(Math.floor(tetrisLines / 8) + 1);
  const tetrisRenderGrid = $derived.by(() => {
    const merged = tetrisBoard.map((row) => row.slice());
    if (tetrisPiece) {
      for (const cell of getTetrisCells(tetrisPiece)) {
        if (
          cell.x >= 0 &&
          cell.x < TETRIS_COLS &&
          cell.y >= 0 &&
          cell.y < TETRIS_ROWS
        ) {
          merged[cell.y][cell.x] = TETRIS_ID_BY_PIECE[tetrisPiece.type];
        }
      }
    }
    return merged;
  });
  const nextPiecePreviewCells = $derived.by(() => getTetrisNextPreviewCells(tetrisNextPiece));

  const eyeGlow = $derived(
    isExcited || isLove ? "#fbbf24" : isHappy ? "#f59e0b" : isSleeping ? "#92400e" : "#d97706",
  );
  const screenBg = $derived(
    isGamesOpen
      ? "#fef3c7"
      : isExcited || isLove
      ? "#fca5a5"
      : isHappy
        ? COLORS.screenActive
        : isSleeping
          ? "#e8dcc8"
          : COLORS.screen,
  );
  const eyeSize = $derived(isSleeping ? 20 : isExcited ? 30 : 28);
  const antennaColor = $derived(
    isActive ? COLORS.screenActive : isSleeping ? COLORS.joint : COLORS.bodyStroke,
  );
</script>

<div bind:this={containerRef} class="container">
  <svg
    class="grapple-rig"
    class:grapple-rig--active={introPhase !== "online" || clickAnimation === "grapple"}
    width="360"
    height="504"
    viewBox="0 -40 300 420"
    aria-hidden="true"
  >
    <defs>
      <filter id="cableGlow" x="-80%" y="-40%" width="260%" height="180%">
        <feGaussianBlur stdDeviation="1.8" result="cable-blur" />
        <feMerge>
          <feMergeNode in="cable-blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <path class="grapple-cable-shadow" d="M 292 -28 C 277 18 269 67 238 125 C 226 147 214 163 202 181" />
    <path class="grapple-cable" d="M 292 -28 C 277 18 269 67 238 125 C 226 147 214 163 202 181" />
    <g class="grapple-anchor" transform="translate(291 -27) rotate(20)">
      <path d="M -9 -7 L 9 -7 L 6 2 L 2 7 L -2 7 L -6 2 Z" fill="#334155" stroke="#0f172a" stroke-width="1.5" />
      <path d="M -5 -4 L 5 -4" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" />
      <circle cx="0" cy="2" r="2.2" fill="#94a3b8" />
    </g>
    <g class="landing-fx">
      <ellipse class="impact-ring impact-ring--one" cx="150" cy="369" rx="25" ry="5" />
      <ellipse class="impact-ring impact-ring--two" cx="150" cy="369" rx="25" ry="5" />
      <circle class="dust dust--one" cx="112" cy="361" r="5" />
      <circle class="dust dust--two" cx="188" cy="361" r="5" />
      <circle class="dust dust--three" cx="128" cy="365" r="3" />
      <circle class="dust dust--four" cx="172" cy="365" r="3" />
    </g>
  </svg>

  <div
    role="button"
    tabindex="0"
    aria-label="Marvin, interactive AI robot mascot. Activate for a surprise move."
    aria-disabled={introPhase !== "online"}
    data-intro-phase={introPhase}
    onclick={handleClick}
    onkeydown={handleBotKeydown}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    class="bot"
    class:intro-sequence={introPhase !== "online"}
    class:hovering={isHovering}
    class:sleeping={isSleeping}
    class:state-waving={isWaving}
    class:state-happy={isHappy}
    class:state-excited={isExcited}
    class:state-love={isLove}
    class:anim-right-arm={clickAnimation === "right-arm"}
    class:anim-left-arm={clickAnimation === "left-arm"}
    class:anim-left-leg={clickAnimation === "left-leg"}
    class:anim-right-leg={clickAnimation === "right-leg"}
    class:anim-head-bang={clickAnimation === "head-bang"}
    class:anim-dance={clickAnimation === "dance"}
    class:anim-jump={clickAnimation === "jump"}
    class:anim-floss={clickAnimation === "floss"}
    class:anim-orange-justice={clickAnimation === "orange-justice"}
    class:anim-hype={clickAnimation === "hype"}
    class:anim-sprinkler={clickAnimation === "sprinkler"}
    class:anim-shuffle={clickAnimation === "shuffle"}
    class:anim-grapple={clickAnimation === "grapple"}
    class:anim-moonwalk={clickAnimation === "moonwalk"}
    class:anim-victory={clickAnimation === "victory"}
  >
    <svg width="360" height="504" viewBox="0 -40 300 420" style="overflow: visible;">
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color={COLORS.bodyLight} />
          <stop offset="100%" stop-color={COLORS.body} />
        </linearGradient>
        <linearGradient id="headGrad" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color={COLORS.body} />
        </linearGradient>
        <linearGradient id="legGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color={COLORS.body} />
          <stop offset="100%" stop-color="#cbd5e1" />
        </linearGradient>
        <linearGradient id="panelDepthGrad" x1="0" y1="0" x2="1" y2="0.7">
          <stop offset="0%" stop-color="#334155" />
          <stop offset="55%" stop-color="#1e293b" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
        <radialGradient id="lensCoreGrad" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stop-color="#fde68a" />
          <stop offset="28%" stop-color="#f59e0b" />
          <stop offset="72%" stop-color="#b45309" />
          <stop offset="100%" stop-color="#78350f" />
        </radialGradient>
        <pattern id="carbonWeave" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#1e293b" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#475569" stroke-width="2" opacity="0.35" />
        </pattern>
        <filter id="eyeGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="antennaGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="greenGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="4" y2="0" stroke="rgba(0,0,0,0.04)" stroke-width="1" />
        </pattern>
        <clipPath id="screenClip">
          <rect x="97" y="176" width="106" height="91" rx="7" />
        </clipPath>
        <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.15" />
        </filter>
        <filter id="innerShadow" x="-5%" y="-5%" width="110%" height="110%">
          <feOffset dx="0" dy="2" />
          <feGaussianBlur stdDeviation="2" result="offset-blur" />
          <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
          <feFlood flood-color="#000" flood-opacity="0.1" result="color" />
          <feComposite operator="in" in="color" in2="inverse" result="shadow" />
          <feComposite operator="over" in="shadow" in2="SourceGraphic" />
        </filter>
      </defs>

      <!-- Ground shadow -->
      <ellipse
        cx="150"
        cy="370"
        rx="80"
        ry="12"
        fill="rgba(0,0,0,0.1)"
        class="ground-shadow"
        style="transform: scaleX({clickAnimation === 'jump' ? 0.6 : 1}); transform-origin: 150px 370px; transition: transform 0.3s ease;"
      />

      <!-- === MAIN BODY GROUP with breathing === -->
      <g
        class="body-group"
        style="transform: translateY({breathOffset}px); transition: transform 0.1s ease;"
      >
        <!-- ===== LEGS ===== -->

        <!-- Left Leg -->
        <g class="left-leg-group">
          <circle cx="100" cy="284" r="12" fill={COLORS.joint} stroke={COLORS.jointDark} stroke-width="2" />
          <circle cx="100" cy="284" r="5" fill={COLORS.jointDark} />
          <circle cx="100" cy="284" r="2" fill={COLORS.joint} />
          <rect x="85" y="284" width="30" height="35" rx="8" fill="url(#legGrad)" stroke={COLORS.bodyStroke} stroke-width="2.5" />
          <line x1="88" y1="295" x2="112" y2="295" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.2" />
          <circle cx="100" cy="317" r="9" fill={COLORS.joint} stroke={COLORS.jointDark} stroke-width="2" />
          <circle cx="100" cy="317" r="4" fill={COLORS.jointDark} />
          <circle cx="100" cy="317" r="1.5" fill={COLORS.joint} />
          <g class="left-shin-group">
            <rect x="87" y="320" width="26" height="30" rx="6" fill="url(#legGrad)" stroke={COLORS.bodyStroke} stroke-width="2" />
            <rect x="91" y="326" width="18" height="10" rx="3" fill={COLORS.bodyStroke} opacity="0.1" />
            <circle cx="100" cy="348" r="6" fill={COLORS.joint} stroke={COLORS.jointDark} stroke-width="1.5" />
            <circle cx="100" cy="348" r="2.5" fill={COLORS.jointDark} />
            <rect x="78" y="348" width="44" height="22" rx="7" fill={COLORS.bodyStroke} />
            <path d="M 78 358 L 86 348 L 114 348 L 122 358 L 116 363 L 84 363 Z" fill="url(#carbonWeave)" opacity="0.7" />
            <path d="M 82 351 L 94 351" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" opacity="0.85" />
            <rect x="80" y="364" width="40" height="5" rx="3" fill={COLORS.jointDark} opacity="0.4" />
            <line x1="86" y1="357" x2="114" y2="357" stroke={COLORS.joint} stroke-width="1.5" stroke-linecap="round" opacity="0.5" />
            <line x1="88" y1="352" x2="112" y2="352" stroke={COLORS.joint} stroke-width="1" stroke-linecap="round" opacity="0.4" />
            <circle cx="100" cy="354" r="3" fill={COLORS.indicatorGreen} opacity="0.9">
              <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        </g>

        <!-- Right Leg -->
        <g class="right-leg-group">
          <circle cx="200" cy="284" r="12" fill={COLORS.joint} stroke={COLORS.jointDark} stroke-width="2" />
          <circle cx="200" cy="284" r="5" fill={COLORS.jointDark} />
          <circle cx="200" cy="284" r="2" fill={COLORS.joint} />
          <rect x="185" y="284" width="30" height="35" rx="8" fill="url(#legGrad)" stroke={COLORS.bodyStroke} stroke-width="2.5" />
          <line x1="188" y1="295" x2="212" y2="295" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.2" />
          <circle cx="200" cy="317" r="9" fill={COLORS.joint} stroke={COLORS.jointDark} stroke-width="2" />
          <circle cx="200" cy="317" r="4" fill={COLORS.jointDark} />
          <circle cx="200" cy="317" r="1.5" fill={COLORS.joint} />
          <g class="right-shin-group">
            <rect x="187" y="320" width="26" height="30" rx="6" fill="url(#legGrad)" stroke={COLORS.bodyStroke} stroke-width="2" />
            <rect x="191" y="326" width="18" height="10" rx="3" fill={COLORS.bodyStroke} opacity="0.1" />
            <circle cx="200" cy="348" r="6" fill={COLORS.joint} stroke={COLORS.jointDark} stroke-width="1.5" />
            <circle cx="200" cy="348" r="2.5" fill={COLORS.jointDark} />
            <rect x="178" y="348" width="44" height="22" rx="7" fill={COLORS.bodyStroke} />
            <path d="M 178 358 L 186 348 L 214 348 L 222 358 L 216 363 L 184 363 Z" fill="url(#carbonWeave)" opacity="0.7" />
            <path d="M 206 351 L 218 351" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" opacity="0.85" />
            <rect x="180" y="364" width="40" height="5" rx="3" fill={COLORS.jointDark} opacity="0.4" />
            <line x1="186" y1="357" x2="214" y2="357" stroke={COLORS.joint} stroke-width="1.5" stroke-linecap="round" opacity="0.5" />
            <line x1="188" y1="352" x2="212" y2="352" stroke={COLORS.joint} stroke-width="1" stroke-linecap="round" opacity="0.4" />
            <circle cx="200" cy="354" r="3" fill={COLORS.indicatorGreen} opacity="0.9">
              <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite" begin="0.5s" />
            </circle>
          </g>
        </g>

        <!-- ===== BODY ===== -->

        <!-- offset rear shell creates a subtle side plane -->
        <path
          d="M 96 154 L 213 164 Q 222 166 223 177 L 223 276 Q 223 286 214 294 L 99 288 Z"
          fill="url(#panelDepthGrad)"
          opacity="0.48"
        />

        <rect
          x="85"
          y="160"
          width="130"
          height="130"
          rx="16"
          fill="url(#bodyGrad)"
          stroke={COLORS.bodyStroke}
          stroke-width="2.5"
          filter="url(#dropShadow)"
          style="transform: {isExcited ? 'translateY(-5px)' : 'translateY(0)'}; transition: transform 0.2s ease;"
        />

        <rect x="90" y="165" width="120" height="3" rx="2" fill="white" opacity="0.4" />

        <!-- segmented armor and orange load-bearing rails -->
        <path d="M 87 181 L 95 174 L 95 267 L 87 259 Z" fill="#1e293b" opacity="0.75" />
        <path d="M 213 181 L 205 174 L 205 267 L 213 259 Z" fill="#1e293b" opacity="0.75" />
        <path d="M 92 180 L 101 171" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
        <path d="M 208 180 L 199 171" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
        <path d="M 92 258 L 101 269" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
        <path d="M 208 258 L 199 269" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
        <path d="M 105 160 L 195 160" stroke="#64748b" stroke-width="1.5" stroke-dasharray="5 3" opacity="0.55" />

        <line x1="85" y1="195" x2="97" y2="195" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.25" />
        <line x1="203" y1="195" x2="215" y2="195" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.25" />
        <line x1="85" y1="245" x2="97" y2="245" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.25" />
        <line x1="203" y1="245" x2="215" y2="245" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.25" />

        <!-- Left ventilation grill -->
        <rect x="86" y="210" width="10" height="30" rx="3" fill={COLORS.bodyStroke} opacity="0.12" />
        <line x1="87" y1="216" x2="95" y2="216" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.3" />
        <line x1="87" y1="220" x2="95" y2="220" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.3" />
        <line x1="87" y1="224" x2="95" y2="224" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.3" />
        <line x1="87" y1="228" x2="95" y2="228" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.3" />
        <line x1="87" y1="232" x2="95" y2="232" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.3" />

        <!-- Right ventilation grill -->
        <rect x="204" y="210" width="10" height="30" rx="3" fill={COLORS.bodyStroke} opacity="0.12" />
        <line x1="205" y1="216" x2="213" y2="216" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.3" />
        <line x1="205" y1="220" x2="213" y2="220" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.3" />
        <line x1="205" y1="224" x2="213" y2="224" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.3" />
        <line x1="205" y1="228" x2="213" y2="228" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.3" />
        <line x1="205" y1="232" x2="213" y2="232" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.3" />

        <!-- Chest Screen Frame -->
        <rect x="92" y="168" width="116" height="104" rx="12" fill="#f8fafc" stroke={COLORS.eyeRing} stroke-width="2.5" />
        <rect x="97" y="173" width="106" height="94" rx="8" fill={screenBg} style="transition: fill 0.4s ease;" />
        <rect x="97" y="173" width="106" height="94" rx="8" fill="url(#scanlines)" opacity="0.6" />

        <!-- ===== SCREEN CONTENT ===== -->
        <g clip-path="url(#screenClip)" style="transform-origin: 150px 220px;">
          {#if screenMessage === "hi"}
            <circle cx="135" cy="210" r="5" fill={COLORS.bodyStroke} />
            <circle cx="165" cy="210" r="5" fill={COLORS.bodyStroke} />
            <circle cx="133" cy="208" r="2" fill="white" opacity="0.6" />
            <circle cx="163" cy="208" r="2" fill="white" opacity="0.6" />
            <circle cx="124" cy="220" r="7" fill="#fda4af" opacity="0.35" />
            <circle cx="176" cy="220" r="7" fill="#fda4af" opacity="0.35" />
            <path d="M 132 228 Q 150 242 168 228" fill="none" stroke={COLORS.bodyStroke} stroke-width="3" stroke-linecap="round" />
            <text x="150" y="254" text-anchor="middle" fill={COLORS.bodyStroke} font-size="10" font-weight="bold" font-family="monospace" opacity="0.7">HELLO!</text>

          {:else if screenMessage === "stars"}
            <polygon points="135,213 137,207 139,213 133,209 141,209" fill="#f59e0b" />
            <circle cx="137" cy="210" r="3" fill="#fef3c7" opacity="0.5" />
            <polygon points="163,213 165,207 167,213 161,209 169,209" fill="#f59e0b" />
            <circle cx="165" cy="210" r="3" fill="#fef3c7" opacity="0.5" />
            <ellipse cx="150" cy="232" rx="10" ry="8" fill={COLORS.bodyStroke} />
            <ellipse cx="150" cy="232" rx="7" ry="5" fill="#1e293b" />
            <text x="115" y="200" fill="#f59e0b" font-size="8" opacity="0.8" class="twinkle">✦</text>
            <text x="182" y="205" fill="#f59e0b" font-size="6" opacity="0.6" class="twinkle-delay">✦</text>
            <text x="175" y="248" fill="#f59e0b" font-size="7" opacity="0.7" class="twinkle-delay2">✦</text>
            <text x="150" y="254" text-anchor="middle" fill="#f59e0b" font-size="9" font-weight="bold" font-family="monospace" opacity="0.8">AMAZING!</text>

          {:else if screenMessage === "games"}
            {#if gameView === "list"}
              <text x="150" y="189" text-anchor="middle" fill="#c4b5fd" font-size="7" font-family="monospace">
                GAMES
              </text>
              <text x="150" y="197" text-anchor="middle" fill="#94a3b8" font-size="4.8" font-family="monospace">
                SELECT A TITLE
              </text>

              <g class="tetris-ui-button" onclick={(event) => openTetrisGame(event)}>
                <rect x="112" y="201" width="76" height="15" rx="4" fill="#1d4ed8" />
                <text x="150" y="210.8" text-anchor="middle" fill="#eff6ff" font-size="6.2" font-family="monospace">
                  TETRIS
                </text>
              </g>

              <g class="tetris-ui-button" onclick={(event) => openWhacGame(event)}>
                <rect x="112" y="219" width="76" height="15" rx="4" fill="#ea580c" />
                <text x="150" y="228.8" text-anchor="middle" fill="#fff7ed" font-size="5.8" font-family="monospace">
                  WHAC-A-MOLE
                </text>
              </g>

              <g class="tetris-ui-button tetris-ui-secondary" onclick={(event) => openExpandedGame(event)}>
                <rect x="111" y="233" width="37" height="10" rx="3" fill="#334155" />
                <text x="129.5" y="239.8" text-anchor="middle" fill="#e2e8f0" font-size="4.6" font-family="monospace">
                  EXPAND
                </text>
              </g>
              <g class="tetris-ui-button tetris-ui-secondary" onclick={(event) => closeGames(event)}>
                <rect x="152" y="233" width="37" height="10" rx="3" fill="#334155" />
                <text x="170.5" y="239.8" text-anchor="middle" fill="#e2e8f0" font-size="4.8" font-family="monospace">
                  EXIT
                </text>
              </g>
            {:else if gameView === "tetris"}
              <text x="107" y="190.5" fill="#a78bfa" font-size="6" font-family="monospace">TETRIS</text>
              <text x="196" y="190.5" text-anchor="end" fill="#c4b5fd" font-size="6" font-family="monospace">
                {tetrisScore}
              </text>
              <text x="160" y="190.5" fill="#94a3b8" font-size="5" font-family="monospace">
                LV{tetrisLevel}
              </text>

              <rect
                x={TETRIS_BOARD_X - 1}
                y={TETRIS_BOARD_Y - 1}
                width={TETRIS_COLS * TETRIS_CELL_SIZE + 2}
                height={TETRIS_ROWS * TETRIS_CELL_SIZE + 2}
                rx="2"
                fill="#fef3c7"
                stroke="#d97706"
                stroke-width="0.8"
              />

              <g class="tetris-control-button" onclick={(event) => backToGameList(event)}>
                <rect x="166" y="194" width="10" height="8" rx="2" fill="#334155" />
                <line x1="168.5" y1="196.2" x2="173.5" y2="196.2" stroke="#e2e8f0" stroke-width="0.9" stroke-linecap="round" />
                <line x1="168.5" y1="198" x2="173.5" y2="198" stroke="#e2e8f0" stroke-width="0.9" stroke-linecap="round" />
                <line x1="168.5" y1="199.8" x2="173.5" y2="199.8" stroke="#e2e8f0" stroke-width="0.9" stroke-linecap="round" />
              </g>
              <g class="tetris-control-button" onclick={(event) => openExpandedGame(event)}>
                <rect x="178" y="194" width="10" height="8" rx="2" fill="#334155" />
                <path d="M 180.7 200.1 L 180.7 198.2 L 182.1 198.2" fill="none" stroke="#e2e8f0" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M 185.3 195.9 L 185.3 197.8 L 183.9 197.8" fill="none" stroke="#e2e8f0" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" />
                <line x1="181.1" y1="199.7" x2="184.9" y2="196.3" stroke="#e2e8f0" stroke-width="0.8" stroke-linecap="round" />
              </g>
              <g class="tetris-control-button" onclick={(event) => closeGames(event)}>
                <rect x="190" y="194" width="10" height="8" rx="2" fill="#334155" />
                <line x1="192.3" y1="196.1" x2="197.7" y2="199.9" stroke="#e2e8f0" stroke-width="0.9" stroke-linecap="round" />
                <line x1="197.7" y1="196.1" x2="192.3" y2="199.9" stroke="#e2e8f0" stroke-width="0.9" stroke-linecap="round" />
              </g>

              {#if tetrisMode === "menu"}
                <text x="150" y="206" text-anchor="middle" fill="#e2e8f0" font-size="7.2" font-family="monospace">
                  READY TO PLAY?
                </text>
                <text x="150" y="216" text-anchor="middle" fill="#cbd5e1" font-size="5" font-family="monospace">
                  ARROWS move, UP rotate
                </text>
                <text x="150" y="223" text-anchor="middle" fill="#cbd5e1" font-size="5" font-family="monospace">
                  P pause, SPACE drop
                </text>
                <g class="tetris-ui-button" onclick={(event) => startTetris(event)}>
                  <rect x="117" y="232" width="66" height="12" rx="3.5" fill="#1d4ed8" />
                  <text x="150" y="240" text-anchor="middle" fill="#eff6ff" font-size="6" font-family="monospace">
                    START GAME
                  </text>
                </g>
                <g class="tetris-ui-button tetris-ui-secondary" onclick={(event) => backToGameList(event)}>
                  <rect x="117" y="246" width="66" height="9" rx="3" fill="#334155" />
                  <text x="150" y="252.5" text-anchor="middle" fill="#e2e8f0" font-size="5" font-family="monospace">
                    BACK TO GAMES
                  </text>
                </g>
              {:else}
                {#each tetrisRenderGrid as row, rowIndex}
                  {#each row as cell, colIndex}
                    <rect
                      x={TETRIS_BOARD_X + colIndex * TETRIS_CELL_SIZE}
                      y={TETRIS_BOARD_Y + rowIndex * TETRIS_CELL_SIZE}
                      width={TETRIS_CELL_SIZE - 0.8}
                      height={TETRIS_CELL_SIZE - 0.8}
                      rx="0.8"
                      fill={cell === 0 ? "rgba(120, 53, 15, 0.14)" : TETRIS_COLOR_BY_ID[cell]}
                    />
                  {/each}
                {/each}

                <text x="178" y="207" text-anchor="middle" fill="#a5b4fc" font-size="5" font-family="monospace">
                  NEXT
                </text>
                <rect x="167" y="208" width="23" height="21" rx="2.5" fill="#ffedd5" stroke="#d97706" stroke-width="0.7" />
                {#each nextPiecePreviewCells as previewCell}
                  <rect
                    x={previewCell.x}
                    y={previewCell.y}
                    width={previewCell.size}
                    height={previewCell.size}
                    rx="0.8"
                    fill={TETRIS_COLOR_BY_ID[TETRIS_ID_BY_PIECE[tetrisNextPiece]]}
                  />
                {/each}

                {#if tetrisMode === "paused"}
                  <rect x="110" y="216" width="42" height="17" rx="3" fill="rgba(15,23,42,0.92)" />
                  <text x="131" y="224" text-anchor="middle" fill="#f8fafc" font-size="6" font-family="monospace">
                    PAUSED
                  </text>
                  <text x="131" y="230" text-anchor="middle" fill="#cbd5e1" font-size="4.6" font-family="monospace">
                    Press P
                  </text>
                  <g class="tetris-ui-button" onclick={(event) => togglePauseTetris(event)}>
                    <rect x="166" y="236" width="25" height="9" rx="2.5" fill="#2563eb" />
                    <text x="178.5" y="242.2" text-anchor="middle" fill="#eff6ff" font-size="4.8" font-family="monospace">
                      RESUME
                    </text>
                  </g>
                  <g class="tetris-ui-button tetris-ui-secondary" onclick={(event) => backToGameList(event)}>
                    <rect x="166" y="247" width="25" height="8" rx="2.5" fill="#334155" />
                    <text x="178.5" y="252.8" text-anchor="middle" fill="#e2e8f0" font-size="4.6" font-family="monospace">
                      MENU
                    </text>
                  </g>
                {:else if tetrisMode === "gameover"}
                  <rect x="109" y="214" width="44" height="21" rx="3" fill="rgba(15,23,42,0.95)" />
                  <text x="131" y="223.5" text-anchor="middle" fill="#f8fafc" font-size="6" font-family="monospace">
                    GAME OVER
                  </text>
                  <text x="131" y="230" text-anchor="middle" fill="#fca5a5" font-size="4.6" font-family="monospace">
                    Score {tetrisScore}
                  </text>
                  <g class="tetris-ui-button" onclick={(event) => startTetris(event)}>
                    <rect x="166" y="236" width="25" height="9" rx="2.5" fill="#2563eb" />
                    <text x="178.5" y="242.2" text-anchor="middle" fill="#eff6ff" font-size="4.8" font-family="monospace">
                      RETRY
                    </text>
                  </g>
                  <g class="tetris-ui-button tetris-ui-secondary" onclick={(event) => backToGameList(event)}>
                    <rect x="166" y="247" width="25" height="8" rx="2.5" fill="#334155" />
                    <text x="178.5" y="252.8" text-anchor="middle" fill="#e2e8f0" font-size="4.6" font-family="monospace">
                      MENU
                    </text>
                  </g>
                {:else}
                  <g class="tetris-control-button" onclick={(event) => handleTetrisAction("pause", event)}>
                    <rect x="165" y="234" width="12" height="9" rx="2" fill="#1e293b" />
                    <text x="171" y="240" text-anchor="middle" fill="#e2e8f0" font-size="5.5" font-family="monospace">
                      P
                    </text>
                  </g>
                  <g class="tetris-control-button" onclick={(event) => handleTetrisAction("rotate", event)}>
                    <rect x="179" y="234" width="12" height="9" rx="2" fill="#1e293b" />
                    <text x="185" y="240" text-anchor="middle" fill="#e2e8f0" font-size="5.5" font-family="monospace">
                      ^
                    </text>
                  </g>
                  <g class="tetris-control-button" onclick={(event) => handleTetrisAction("left", event)}>
                    <rect x="165" y="245" width="12" height="9" rx="2" fill="#1e293b" />
                    <text x="171" y="251" text-anchor="middle" fill="#e2e8f0" font-size="5.5" font-family="monospace">
                      &lt;
                    </text>
                  </g>
                  <g class="tetris-control-button" onclick={(event) => handleTetrisAction("right", event)}>
                    <rect x="179" y="245" width="12" height="9" rx="2" fill="#1e293b" />
                    <text x="185" y="251" text-anchor="middle" fill="#e2e8f0" font-size="5.5" font-family="monospace">
                      &gt;
                    </text>
                  </g>
                  <g class="tetris-control-button" onclick={(event) => handleTetrisAction("down", event)}>
                    <rect x="172" y="256" width="12" height="9" rx="2" fill="#1e293b" />
                    <text x="178" y="262" text-anchor="middle" fill="#e2e8f0" font-size="5.5" font-family="monospace">
                      v
                    </text>
                  </g>
                {/if}
              {/if}
            {:else if gameView === "whac"}
              <text x="106" y="190.5" fill="#fb923c" font-size="5.4" font-family="monospace">WHAC-A-MOLE</text>
              <text x="196" y="190.5" text-anchor="end" fill="#fdba74" font-size="6" font-family="monospace">
                {whacScore}
              </text>
              <text x="160" y="190.5" fill="#fbbf24" font-size="4.7" font-family="monospace">
                {whacTimeLeft}s
              </text>
              <text x="151" y="197.4" text-anchor="middle" fill="#fde68a" font-size="4" font-family="monospace">
                {WHAC_DIFFICULTY_CONFIG[whacDifficulty].label}
              </text>

              <defs>
                <linearGradient id="whac-board-grad" x1="0" y1="0" x2="0.6" y2="1">
                  <stop offset="0%" stop-color="#fef9d4" />
                  <stop offset="45%" stop-color="#fde68a" />
                  <stop offset="80%" stop-color="#fbbf24" />
                  <stop offset="100%" stop-color="#d97706" />
                </linearGradient>
              </defs>
              <rect x="106" y="199" width="88" height="64" rx="4" fill="url(#whac-board-grad)" stroke="#d97706" stroke-width="0.9" />

              <g class="tetris-control-button" onclick={(event) => backToGameList(event)}>
                <rect x="166" y="194" width="10" height="8" rx="2" fill="#92400e" />
                <line x1="168.5" y1="196.2" x2="173.5" y2="196.2" stroke="#fef3c7" stroke-width="0.9" stroke-linecap="round" />
                <line x1="168.5" y1="198" x2="173.5" y2="198" stroke="#fef3c7" stroke-width="0.9" stroke-linecap="round" />
                <line x1="168.5" y1="199.8" x2="173.5" y2="199.8" stroke="#fef3c7" stroke-width="0.9" stroke-linecap="round" />
              </g>
              <g class="tetris-control-button" onclick={(event) => openExpandedGame(event)}>
                <rect x="178" y="194" width="10" height="8" rx="2" fill="#92400e" />
                <path d="M 180.7 200.1 L 180.7 198.2 L 182.1 198.2" fill="none" stroke="#fef3c7" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M 185.3 195.9 L 185.3 197.8 L 183.9 197.8" fill="none" stroke="#fef3c7" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" />
                <line x1="181.1" y1="199.7" x2="184.9" y2="196.3" stroke="#fef3c7" stroke-width="0.8" stroke-linecap="round" />
              </g>
              <g class="tetris-control-button" onclick={(event) => closeGames(event)}>
                <rect x="190" y="194" width="10" height="8" rx="2" fill="#92400e" />
                <line x1="192.3" y1="196.1" x2="197.7" y2="199.9" stroke="#fef3c7" stroke-width="0.9" stroke-linecap="round" />
                <line x1="197.7" y1="196.1" x2="192.3" y2="199.9" stroke="#fef3c7" stroke-width="0.9" stroke-linecap="round" />
              </g>

              {#if whacMode === "menu"}
                <text x="150" y="211" text-anchor="middle" fill="#fff7ed" font-size="6.6" font-family="monospace">
                  WHACK 1-6
                </text>
                <text x="150" y="219" text-anchor="middle" fill="#cbd5e1" font-size="4.6" font-family="monospace">
                  Click mole or press key
                </text>
                <text x="150" y="225.5" text-anchor="middle" fill="#cbd5e1" font-size="4.3" font-family="monospace">
                  30 second round
                </text>
                <g class="tetris-ui-button" onclick={(event) => setWhacDifficulty("easy", event)}>
                  <rect x="111" y="228" width="23" height="8" rx="2.2" fill={whacDifficulty === "easy" ? "#16a34a" : "#334155"} />
                  <text x="122.5" y="233.5" text-anchor="middle" fill="#f8fafc" font-size="4.2" font-family="monospace">
                    EASY
                  </text>
                </g>
                <g class="tetris-ui-button" onclick={(event) => setWhacDifficulty("medium", event)}>
                  <rect x="138" y="228" width="24" height="8" rx="2.2" fill={whacDifficulty === "medium" ? "#ea580c" : "#334155"} />
                  <text x="150" y="233.5" text-anchor="middle" fill="#f8fafc" font-size="4.2" font-family="monospace">
                    MED
                  </text>
                </g>
                <g class="tetris-ui-button" onclick={(event) => setWhacDifficulty("hard", event)}>
                  <rect x="166" y="228" width="23" height="8" rx="2.2" fill={whacDifficulty === "hard" ? "#dc2626" : "#334155"} />
                  <text x="177.5" y="233.5" text-anchor="middle" fill="#f8fafc" font-size="4.2" font-family="monospace">
                    HARD
                  </text>
                </g>
                <g class="tetris-ui-button" onclick={(event) => startWhac(event)}>
                  <rect x="117" y="238" width="66" height="10" rx="3.2" fill="#ea580c" />
                  <text x="150" y="244.8" text-anchor="middle" fill="#fff7ed" font-size="5.6" font-family="monospace">
                    START GAME
                  </text>
                </g>
                <g class="tetris-ui-button tetris-ui-secondary" onclick={(event) => backToGameList(event)}>
                  <rect x="117" y="250" width="66" height="7" rx="2.6" fill="#334155" />
                  <text x="150" y="255.1" text-anchor="middle" fill="#e2e8f0" font-size="4.5" font-family="monospace">
                    BACK TO GAMES
                  </text>
                </g>
              {:else}
                {#each WHAC_SLOTS as slot}
                  <g class="tetris-control-button" onclick={(event) => whackMole(slot.id, event)}>
                    <ellipse cx={slot.x} cy={slot.y + 5} rx="12" ry="6.8" fill="#a16207" />
                    <ellipse cx={slot.x - 1} cy={slot.y + 3.2} rx="6.5" ry="2.6" fill="#ca8a04" opacity="0.55" />
                    <ellipse cx={slot.x} cy={slot.y + 8} rx="9.4" ry="5.8" fill="#1e293b" />
                    <ellipse cx={slot.x} cy={slot.y + 8} rx="9.4" ry="5.8" fill="none" stroke="#0f172a" stroke-width="0.9" />
                    <text x={slot.x} y={slot.y + 10.6} text-anchor="middle" fill="#fde68a" font-size="4.1" font-family="monospace">
                      {slot.id + 1}
                    </text>
                    {#if whacActiveSlot === slot.id}
                      <path
                        d={`M ${slot.x - 7.1} ${slot.y + 6.2} Q ${slot.x - 7.3} ${slot.y - 5.8} ${slot.x} ${slot.y - 6.8} Q ${slot.x + 7.3} ${slot.y - 5.8} ${slot.x + 7.1} ${slot.y + 6.2} Z`}
                        fill="#a16207"
                        stroke="#78350f"
                        stroke-width="0.9"
                      />
                      <ellipse cx={slot.x - 2.4} cy={slot.y - 3} rx="1" ry="1.3" fill="#1f2937" />
                      <ellipse cx={slot.x + 2.4} cy={slot.y - 3} rx="1" ry="1.3" fill="#1f2937" />
                      <ellipse cx={slot.x} cy={slot.y} rx="1.9" ry="1.3" fill="#fda4af" stroke="#dc2626" stroke-width="0.35" />
                      {#if slot.expression === "calm"}
                        <path d={`M ${slot.x - 2.2} ${slot.y + 2.6} Q ${slot.x} ${slot.y + 4.4} ${slot.x + 2.2} ${slot.y + 2.6}`} fill="none" stroke="#7f1d1d" stroke-width="0.8" stroke-linecap="round" />
                      {:else if slot.expression === "grit"}
                        <path d={`M ${slot.x - 2.4} ${slot.y + 3.3} L ${slot.x + 2.4} ${slot.y + 3.3}`} fill="none" stroke="#7f1d1d" stroke-width="0.8" stroke-linecap="round" />
                        <path d={`M ${slot.x - 4.1} ${slot.y - 4.4} L ${slot.x - 1.1} ${slot.y - 5.1}`} fill="none" stroke="#78350f" stroke-width="0.75" stroke-linecap="round" />
                        <path d={`M ${slot.x + 1.1} ${slot.y - 5.1} L ${slot.x + 4.1} ${slot.y - 4.4}`} fill="none" stroke="#78350f" stroke-width="0.75" stroke-linecap="round" />
                      {:else}
                        <circle cx={slot.x} cy={slot.y + 3.2} r="1.35" fill="none" stroke="#7f1d1d" stroke-width="0.75" />
                      {/if}
                      <ellipse cx={slot.x - 1.9} cy={slot.y - 4.9} rx="1.7" ry="1.1" fill="#fef3c7" opacity="0.55" />
                    {/if}
                  </g>
                {/each}

                {#if whacMode === "gameover"}
                  <rect x="116" y="214" width="67" height="19" rx="3" fill="rgba(124,45,18,0.88)" />
                  <text x="150" y="222" text-anchor="middle" fill="#fff7ed" font-size="6" font-family="monospace">
                    GAME OVER
                  </text>
                  <text x="150" y="228.2" text-anchor="middle" fill="#fdba74" font-size="4.8" font-family="monospace">
                    SCORE {whacScore}
                  </text>
                  <g class="tetris-ui-button" onclick={(event) => startWhac(event)}>
                    <rect x="117" y="236" width="31" height="10" rx="2.8" fill="#ea580c" />
                    <text x="132.5" y="242.6" text-anchor="middle" fill="#fff7ed" font-size="4.8" font-family="monospace">
                      RETRY
                    </text>
                  </g>
                  <g class="tetris-ui-button tetris-ui-secondary" onclick={(event) => backToGameList(event)}>
                    <rect x="152" y="236" width="31" height="10" rx="2.8" fill="#334155" />
                    <text x="167.5" y="242.6" text-anchor="middle" fill="#e2e8f0" font-size="4.8" font-family="monospace">
                      MENU
                    </text>
                  </g>
                {/if}
              {/if}
            {/if}

          {:else if screenMessage === "zzz"}
            <line x1="133" y1="215" x2="143" y2="215" stroke={COLORS.bodyStroke} stroke-width="2.5" stroke-linecap="round" />
            <line x1="157" y1="215" x2="167" y2="215" stroke={COLORS.bodyStroke} stroke-width="2.5" stroke-linecap="round" />
            <path d="M 143 230 Q 150 236 157 230" fill="none" stroke={COLORS.bodyStroke} stroke-width="2" stroke-linecap="round" />
            <text x="168" y="202" fill={COLORS.bodyStroke} font-size="12" font-weight="bold" opacity="0.7" class="zzz-float">Z</text>
            <text x="177" y="194" fill={COLORS.bodyStroke} font-size="9" font-weight="bold" opacity="0.45" class="zzz-float-delay">z</text>
            <text x="183" y="187" fill={COLORS.bodyStroke} font-size="7" font-weight="bold" opacity="0.25" class="zzz-float-delay2">z</text>

          {:else}
            <!-- smile - default face -->
            <circle cx="150" cy="219" r="26" fill={screenBg} style="transition: fill 0.3s ease;" />
            <rect x="140" y="210" width="6" height="9" rx="2" fill={COLORS.bodyStroke} />
            <rect x="154" y="210" width="6" height="9" rx="2" fill={COLORS.bodyStroke} />
            <circle cx="141" cy="211" r="1.5" fill="white" opacity="0.5" />
            <circle cx="155" cy="211" r="1.5" fill="white" opacity="0.5" />
            <circle cx="131" cy="224" r="6" fill="#fda4af" opacity="0.3" />
            <circle cx="169" cy="224" r="6" fill="#fda4af" opacity="0.3" />
            <path
              d={isExcited ? "M 137 228 Q 150 242 163 228" : "M 138 226 Q 150 233 162 226"}
              fill="none"
              stroke={COLORS.bodyStroke}
              stroke-width="3"
              stroke-linecap="round"
              style="transition: d 0.2s ease;"
            />
            {#if isHappy || isExcited || isLove}
              <animate attributeName="opacity" values="1;0.85;1" dur="0.4s" repeatCount="indefinite" />
            {/if}
          {/if}

          {#if screenMessage !== "games"}
            <g
              class="play-games-btn"
              onclick={(event) => openGamesMenu(event)}
              role="button"
              tabindex="0"
            >
              <rect x="116" y="243" width="68" height="12" rx="3.5" fill="#0f172a" opacity="0.86" />
              <text x="150" y="251" text-anchor="middle" fill="#c4b5fd" font-size="5.5" font-family="monospace">
                PLAY GAMES
              </text>
            </g>
          {/if}
        </g>

        <!-- Screen corner screws -->
        <circle cx="96" cy="172" r="3" fill={COLORS.jointDark} />
        <circle cx="96" cy="172" r="1" fill={COLORS.joint} />
        <circle cx="204" cy="172" r="3" fill={COLORS.jointDark} />
        <circle cx="204" cy="172" r="1" fill={COLORS.joint} />
        <circle cx="96" cy="270" r="3" fill={COLORS.jointDark} />
        <circle cx="96" cy="270" r="1" fill={COLORS.joint} />
        <circle cx="204" cy="270" r="3" fill={COLORS.jointDark} />
        <circle cx="204" cy="270" r="1" fill={COLORS.joint} />

        <!-- Body Corner Bolts -->
        <circle cx="96" cy="170" r="5" fill={COLORS.bodyStroke} opacity="0.5" />
        <circle cx="96" cy="170" r="2" fill={COLORS.body} />
        <circle cx="204" cy="170" r="5" fill={COLORS.bodyStroke} opacity="0.5" />
        <circle cx="204" cy="170" r="2" fill={COLORS.body} />
        <circle cx="96" cy="282" r="5" fill={COLORS.bodyStroke} opacity="0.5" />
        <circle cx="96" cy="282" r="2" fill={COLORS.body} />
        <circle cx="204" cy="282" r="5" fill={COLORS.bodyStroke} opacity="0.5" />
        <circle cx="204" cy="282" r="2" fill={COLORS.body} />

        <!-- Belt/Waist detail -->
        <rect x="85" y="272" width="130" height="16" rx="4" fill={COLORS.bodyStroke} opacity="0.25" />
        <rect x="127" y="274" width="46" height="12" rx="3" fill={COLORS.beltAccent} opacity="0.55" />
        <circle cx="138" cy="280" r="2.5" fill="white" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <circle cx="150" cy="280" r="2.5" fill="white" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1.8s" repeatCount="indefinite" begin="0.6s" />
        </circle>
        <circle cx="162" cy="280" r="2.5" fill="white" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1.8s" repeatCount="indefinite" begin="1.2s" />
        </circle>
        <rect x="107" y="275" width="16" height="8" rx="2" fill="url(#carbonWeave)" stroke="#64748b" stroke-width="0.8" />
        <text x="115" y="281" text-anchor="middle" fill="#cbd5e1" font-size="3.8" font-family="monospace">MRVN</text>
        <path d="M 181 276 L 194 276 L 194 284 L 181 284 Z" fill="#334155" stroke="#64748b" stroke-width="0.8" />
        <path d="M 184 280 L 191 280" stroke="#22c55e" stroke-width="1.3" stroke-linecap="round" />

        <!-- ===== LEFT ARM ===== -->
        <g class="left-arm-group">
          <circle cx="80" cy="178" r="13" fill={COLORS.joint} stroke={COLORS.jointDark} stroke-width="2" />
          <circle cx="80" cy="178" r="6" fill={COLORS.jointDark} />
          <circle cx="80" cy="178" r="2.5" fill={COLORS.joint} />
          <line x1="68" y1="175" x2="75" y2="175" stroke={COLORS.jointDark} stroke-width="1.5" stroke-linecap="round" opacity="0.5" />
          <line x1="67" y1="179" x2="74" y2="179" stroke={COLORS.jointDark} stroke-width="1.5" stroke-linecap="round" opacity="0.4" />
          <line x1="68" y1="183" x2="75" y2="183" stroke={COLORS.jointDark} stroke-width="1.5" stroke-linecap="round" opacity="0.3" />
          <rect x="60" y="184" width="25" height="42" rx="10" fill="url(#bodyGrad)" stroke={COLORS.bodyStroke} stroke-width="2.5" />
          <rect x="63" y="192" width="19" height="16" rx="4" fill={COLORS.bodyStroke} opacity="0.08" />
          <line x1="65" y1="189" x2="80" y2="219" stroke="#64748b" stroke-width="2.4" stroke-linecap="round" />
          <line x1="67" y1="190" x2="81" y2="218" stroke="#cbd5e1" stroke-width="0.8" stroke-linecap="round" />
          <circle cx="72" cy="226" r="9" fill={COLORS.joint} stroke={COLORS.jointDark} stroke-width="2" />
          <circle cx="72" cy="226" r="4" fill={COLORS.jointDark} />
          <circle cx="72" cy="226" r="1.5" fill={COLORS.joint} />
          <g class="left-forearm-group">
            <rect x="62" y="229" width="22" height="34" rx="9" fill="url(#bodyGrad)" stroke={COLORS.bodyStroke} stroke-width="2" />
            <circle cx="73" cy="261" r="7" fill={COLORS.joint} stroke={COLORS.jointDark} stroke-width="1.5" />
            <circle cx="73" cy="261" r="3" fill={COLORS.jointDark} />
            <rect x="57" y="257" width="32" height="24" rx="7" fill={COLORS.bodyStroke} />
            <rect x="59" y="257" width="28" height="4" rx="2" fill={COLORS.jointDark} opacity="0.3" />
            <rect x="58" y="279" width="8" height="15" rx="4" fill={COLORS.body} stroke={COLORS.bodyStroke} stroke-width="1.5" />
            <rect x="69" y="281" width="8" height="13" rx="4" fill={COLORS.body} stroke={COLORS.bodyStroke} stroke-width="1.5" />
            <rect x="80" y="279" width="8" height="15" rx="4" fill={COLORS.body} stroke={COLORS.bodyStroke} stroke-width="1.5" />
          </g>
        </g>

        <!-- ===== RIGHT ARM ===== -->
        <g class="right-arm-group">
          <circle cx="220" cy="178" r="13" fill={COLORS.joint} stroke={COLORS.jointDark} stroke-width="2" />
          <circle cx="220" cy="178" r="6" fill={COLORS.jointDark} />
          <circle cx="220" cy="178" r="2.5" fill={COLORS.joint} />
          <line x1="225" y1="175" x2="232" y2="175" stroke={COLORS.jointDark} stroke-width="1.5" stroke-linecap="round" opacity="0.5" />
          <line x1="226" y1="179" x2="233" y2="179" stroke={COLORS.jointDark} stroke-width="1.5" stroke-linecap="round" opacity="0.4" />
          <line x1="225" y1="183" x2="232" y2="183" stroke={COLORS.jointDark} stroke-width="1.5" stroke-linecap="round" opacity="0.3" />
          <rect x="215" y="184" width="25" height="42" rx="10" fill="url(#bodyGrad)" stroke={COLORS.bodyStroke} stroke-width="2.5" />
          <rect x="218" y="192" width="19" height="16" rx="4" fill={COLORS.bodyStroke} opacity="0.08" />
          <line x1="235" y1="189" x2="220" y2="219" stroke="#64748b" stroke-width="2.4" stroke-linecap="round" />
          <line x1="233" y1="190" x2="219" y2="218" stroke="#cbd5e1" stroke-width="0.8" stroke-linecap="round" />
          <circle cx="228" cy="226" r="9" fill={COLORS.joint} stroke={COLORS.jointDark} stroke-width="2" />
          <circle cx="228" cy="226" r="4" fill={COLORS.jointDark} />
          <circle cx="228" cy="226" r="1.5" fill={COLORS.joint} />
          <g class="right-forearm-group">
            <rect x="217" y="229" width="22" height="34" rx="9" fill="url(#bodyGrad)" stroke={COLORS.bodyStroke} stroke-width="2" />
            <g class="grapple-winch">
              <circle cx="241" cy="242" r="10" fill="url(#panelDepthGrad)" stroke="#0f172a" stroke-width="1.5" />
              <circle cx="241" cy="242" r="6.5" fill="none" stroke="#f59e0b" stroke-width="2" />
              <circle cx="241" cy="242" r="2.5" fill="#94a3b8" />
              <path d="M 247 235 L 254 229 L 258 233 L 251 240" fill="#334155" stroke="#0f172a" stroke-width="1" />
              <path d="M 252 230 L 257 235" stroke="#fbbf24" stroke-width="1.4" />
            </g>
            <circle cx="228" cy="261" r="7" fill={COLORS.joint} stroke={COLORS.jointDark} stroke-width="1.5" />
            <circle cx="228" cy="261" r="3" fill={COLORS.jointDark} />
            <rect x="211" y="257" width="32" height="24" rx="7" fill={COLORS.bodyStroke} />
            <rect x="213" y="257" width="28" height="4" rx="2" fill={COLORS.jointDark} opacity="0.3" />
            <rect x="212" y="279" width="8" height="15" rx="4" fill={COLORS.body} stroke={COLORS.bodyStroke} stroke-width="1.5" />
            <rect x="223" y="281" width="8" height="13" rx="4" fill={COLORS.body} stroke={COLORS.bodyStroke} stroke-width="1.5" />
            <rect x="234" y="279" width="8" height="15" rx="4" fill={COLORS.body} stroke={COLORS.bodyStroke} stroke-width="1.5" />
          </g>
        </g>

        <!-- Neck -->
        <rect x="132" y="147" width="36" height="18" fill={COLORS.bodyStroke} opacity="0.6" rx="2" />
        <line x1="132" y1="152" x2="168" y2="152" stroke={COLORS.joint} stroke-width="1" opacity="0.5" />
        <line x1="132" y1="157" x2="168" y2="157" stroke={COLORS.joint} stroke-width="1" opacity="0.5" />
        <line x1="132" y1="162" x2="168" y2="162" stroke={COLORS.joint} stroke-width="1" opacity="0.5" />
        <rect x="126" y="152" width="48" height="10" rx="4" fill={COLORS.body} stroke={COLORS.bodyStroke} stroke-width="2" />

        <!-- ===== HEAD ===== -->
        <g
          class="head-group"
          style="transform-origin: 150px 100px; transform: translate({headTranslateX}px, {headTranslateY}px) rotate({headRotate}deg) scale(0.93); transition: transform 0.1s ease-out;"
        >
          <g class="head-motion-group">
            <path d="M 99 60 Q 113 32 145 27 L 145 149 Q 111 146 95 116 Z" fill="#cbd5e1" opacity="0.48" />
            <path d="M 155 27 Q 188 33 202 60 L 207 112 Q 193 143 155 149 Z" fill="url(#panelDepthGrad)" opacity="0.42" />
            <circle
              cx="150"
              cy="88"
              r="58"
              fill="url(#headGrad)"
              stroke={COLORS.bodyStroke}
              stroke-width="2.5"
              filter="url(#dropShadow)"
            />
            <path d="M 106 68 Q 150 35 194 68" fill="none" stroke="white" stroke-width="2" opacity="0.2" />
            <path d="M 100 74 Q 110 62 128 60" fill="none" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.15" />
            <path d="M 200 74 Q 190 62 172 60" fill="none" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.15" />
            <path d="M 100 110 Q 150 116 200 110" fill="none" stroke={COLORS.bodyStroke} stroke-width="1" opacity="0.1" />
            <path d="M 112 47 L 124 39 L 133 42" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" />
            <path d="M 188 47 L 176 39 L 167 42" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" />
            <path d="M 104 122 L 119 136" stroke="#64748b" stroke-width="2" stroke-linecap="round" />
            <path d="M 196 122 L 181 136" stroke="#64748b" stroke-width="2" stroke-linecap="round" />

            <!-- Ear panels -->
            <g class="left-ear">
              <rect x="88" y="70" width="16" height="36" rx="5" fill={COLORS.bodyStroke} opacity="0.45" />
              <rect x="90" y="72" width="12" height="8" rx="2" fill={COLORS.jointDark} opacity="0.5" />
              <rect x="91" y="99" width="10" height="4" rx="2" fill={COLORS.joint} opacity="0.6" />
            </g>
            <g class="right-ear">
              <rect x="196" y="70" width="16" height="36" rx="5" fill={COLORS.bodyStroke} opacity="0.45" />
              <rect x="198" y="72" width="12" height="8" rx="2" fill={COLORS.jointDark} opacity="0.5" />
              <rect x="199" y="99" width="10" height="4" rx="2" fill={COLORS.joint} opacity="0.6" />
            </g>

            <!-- Orange eye ring -->
            <circle
              cx="150"
              cy="88"
              r="47"
              fill="none"
              stroke={COLORS.eyeRing}
              stroke-width="4"
              class="eye-ring"
              class:pulsing={isHovering}
              style="transform-origin: 150px 88px;"
            />
            <circle cx="150" cy="88" r="45" fill="none" stroke="#fbbf24" stroke-width="1.6" stroke-dasharray="2 8" opacity="0.8" />
            <circle cx="150" cy="88" r="42" fill="none" stroke={COLORS.eyeRing} stroke-width="1" opacity="0.25" />
            <circle cx="150" cy="88" r="40" fill={COLORS.bodyStroke} />
            <circle cx="150" cy="88" r="35" fill="none" stroke="#334155" stroke-width="1" opacity="0.4" />
            <path d="M 150 49 L 150 57 M 150 119 L 150 127 M 111 88 L 119 88 M 181 88 L 189 88" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" />

            {#if isSleeping}
              <circle cx="150" cy="88" r="39" fill="#3d4f62" />
              <path d="M 122 88 Q 150 78 178 88" fill="none" stroke="#e2e8f0" stroke-width="5" stroke-linecap="round" />
              <path d="M 122 90 Q 150 82 178 90" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" opacity="0.4" />
            {:else}
              <circle
                cx="150"
                cy="88"
                r={eyeSize}
                fill="url(#lensCoreGrad)"
                filter="url(#eyeGlow)"
                style="transition: all 0.3s ease;"
              >
                {#if isActive}
                  <animate attributeName="opacity" values="1;0.85;1" dur="0.4s" repeatCount="indefinite" />
                {/if}
              </circle>
              <circle cx="150" cy="88" r={eyeSize - 5} fill="none" stroke={eyeGlow} stroke-width="1.5" opacity="0.8" />
              <circle cx="150" cy="88" r="13" fill="#451a03" opacity="0.24" />
              <circle cx="150" cy="88" r="5" fill="#1e293b" opacity="0.32" />
              <circle
                cx={150 + mouseOffset.x * 0.5}
                cy={88 + mouseOffset.y * 0.3}
                r="9"
                fill="#78350f"
                opacity="0.35"
                style="transition: all 0.1s ease;"
              />
              <circle cx="139" cy="74" r="9" fill="white" opacity="0.85" />
              <circle cx="162" cy="98" r="3.5" fill="white" opacity="0.45" />
              <circle cx="135" cy="82" r="2" fill="white" opacity="0.3" />
              <path d="M 128 107 Q 150 116 172 107" fill="none" stroke="#fbbf24" stroke-width="1.2" opacity="0.45" />
            {/if}
          </g>
        </g>

        <!-- ===== ANTENNA ===== -->
        <g
          class="antenna-group"
          style="transform: translate({headTranslateX * 0.5 + antennaSwing * 0.3}px, {headTranslateY * 0.5}px); transition: transform 0.15s ease-out;"
        >
          <rect x="145" y="28" width="10" height="10" rx="3" fill={COLORS.bodyStroke} />
          <line
            x1="150"
            y1="28"
            x2={150 + antennaSwing * 0.5}
            y2="-4"
            stroke={COLORS.bodyStroke}
            stroke-width="3.5"
            stroke-linecap="round"
          />
          <circle
            cx={150 + antennaSwing * 0.25}
            cy="14"
            r="4"
            fill={COLORS.joint}
            stroke={COLORS.jointDark}
            stroke-width="1"
          />
          <g style={`transform: translate(${antennaSwing * 0.6}px, 0px)`}>
            {#if isActive}
              <circle cx="150" cy="-4" r="18" fill={COLORS.screenActive} opacity="0.12" />
            {/if}
            <circle
              cx="150"
              cy="-4"
              r="10"
              fill={antennaColor}
              filter={isActive ? "url(#antennaGlow)" : "none"}
              style="transition: fill 0.3s ease;"
            >
              {#if isActive}
                <animate attributeName="opacity" values="1;0.55;1" dur="0.5s" repeatCount="indefinite" />
              {/if}
            </circle>
            <circle cx="150" cy="-4" r="5" fill={isSleeping ? COLORS.bodyStroke : "#92400e"} opacity="0.4" />
            <circle cx="146" cy="-8" r="3" fill="white" opacity="0.5" />
          </g>
        </g>
      </g>

    </svg>
  </div>

  <Screen
    isOpen={expandedGameOpen}
    game={gameView === "whac" ? "whac" : "tetris"}
    onClose={closeExpandedGame}
  />
</div>

<style>
  .container {
    width: 360px;
    height: 504px;
    position: relative;
    user-select: none;
    isolation: isolate;
  }

  .bot {
    width: 360px;
    height: 504px;
    position: absolute;
    cursor: pointer;
    transition: transform 0.2s ease;
    touch-action: pan-y;
    z-index: 2;
  }

  .bot:focus {
    outline: none;
  }

  .bot:focus-visible {
    outline: 3px dashed #f59e0b;
    outline-offset: -8px;
    border-radius: 45% 45% 18% 18%;
  }

  .grapple-rig {
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    overflow: visible;
    opacity: 0;
  }

  .grapple-rig--active {
    animation: grapple-rig-visibility 2.6s linear both;
  }

  .grapple-cable-shadow,
  .grapple-cable {
    fill: none;
    stroke-linecap: round;
    stroke-dasharray: 300;
    stroke-dashoffset: 300;
  }

  .grapple-cable-shadow {
    stroke: rgba(15, 23, 42, 0.28);
    stroke-width: 5;
    transform: translate(1.5px, 1.5px);
  }

  .grapple-cable {
    stroke: #64748b;
    stroke-width: 2.4;
    filter: url(#cableGlow);
  }

  .grapple-rig--active .grapple-cable,
  .grapple-rig--active .grapple-cable-shadow {
    animation: grapple-cable-cycle 2.6s cubic-bezier(0.22, 0.8, 0.25, 1) both;
  }

  .grapple-rig--active .grapple-anchor {
    transform-origin: 291px -27px;
    animation: grapple-anchor-lock 2.6s ease-out both;
  }

  .impact-ring {
    fill: none;
    stroke: #f59e0b;
    stroke-width: 1.4;
    opacity: 0;
    transform-origin: 150px 369px;
  }

  .dust {
    fill: #94a3b8;
    opacity: 0;
    transform-origin: center;
  }

  .grapple-rig--active .impact-ring--one {
    animation: impact-ring 2.6s ease-out both;
  }

  .grapple-rig--active .impact-ring--two {
    animation: impact-ring 2.6s ease-out 0.08s both;
  }

  .grapple-rig--active .dust--one,
  .grapple-rig--active .dust--three {
    animation: dust-left 2.6s ease-out both;
  }

  .grapple-rig--active .dust--two,
  .grapple-rig--active .dust--four {
    animation: dust-right 2.6s ease-out both;
  }

  .bot.intro-sequence {
    animation: grapple-entry 2.6s cubic-bezier(0.22, 0.75, 0.18, 1) both !important;
    cursor: default;
    will-change: transform, filter;
  }

  .bot.intro-sequence :global(.right-arm-group) {
    animation: grapple-intro-right-arm 2.6s ease-in-out both !important;
  }

  .bot.intro-sequence :global(.left-arm-group) {
    animation: grapple-intro-left-arm 2.6s ease-in-out both !important;
  }

  .bot.intro-sequence :global(.left-leg-group),
  .bot.intro-sequence :global(.right-leg-group) {
    animation: grapple-intro-legs 2.6s ease-in-out both !important;
  }

  @keyframes grapple-entry {
    0% { transform: translate3d(118px, -205px, 100px) rotate(-17deg) scale(0.76); opacity: 0; filter: blur(2px) drop-shadow(-16px 28px 18px rgba(15, 23, 42, 0.08)); }
    9% { opacity: 1; }
    31% { transform: translate3d(55px, -124px, 72px) rotate(13deg) scale(0.84); filter: blur(0) drop-shadow(-12px 22px 14px rgba(15, 23, 42, 0.12)); }
    55% { transform: translate3d(-22px, -52px, 28px) rotate(-8deg) scale(0.95); }
    70% { transform: translate3d(3px, 8px, 0) rotate(2.5deg) scale(1.025); }
    79% { transform: translate3d(0, -19px, 16px) rotate(-1.5deg) scale(1.01); }
    91% { transform: translate3d(0, 5px, 0) rotate(0.6deg) scaleX(1.025) scaleY(0.972); }
    100% { transform: translate3d(0, 0, 0) rotate(0) scale(1); opacity: 1; filter: none; }
  }

  @keyframes grapple-intro-right-arm {
    0%, 58% { transform: rotate(-128deg); }
    72% { transform: rotate(-42deg); }
    100% { transform: rotate(0deg); }
  }

  @keyframes grapple-intro-left-arm {
    0%, 34% { transform: rotate(38deg); }
    58% { transform: rotate(-18deg); }
    100% { transform: rotate(0deg); }
  }

  @keyframes grapple-intro-legs {
    0%, 58% { transform: rotate(-16deg) translateY(-8px); }
    72% { transform: rotate(7deg) translateY(5px); }
    100% { transform: rotate(0deg) translateY(0); }
  }

  @keyframes grapple-rig-visibility {
    0%, 68% { opacity: 1; }
    82%, 100% { opacity: 0; }
  }

  @keyframes grapple-cable-cycle {
    0% { stroke-dashoffset: 300; }
    12%, 48% { stroke-dashoffset: 0; }
    68% { stroke-dashoffset: 210; opacity: 1; }
    78%, 100% { stroke-dashoffset: 300; opacity: 0; }
  }

  @keyframes grapple-anchor-lock {
    0% { opacity: 0; transform: translate(291px, -27px) rotate(20deg) scale(1.7); }
    9%, 54% { opacity: 1; transform: translate(291px, -27px) rotate(0deg) scale(1); }
    72%, 100% { opacity: 0; transform: translate(291px, -27px) rotate(-15deg) scale(0.75); }
  }

  @keyframes impact-ring {
    0%, 70% { opacity: 0; transform: scale(0.35); }
    72% { opacity: 0.85; }
    94%, 100% { opacity: 0; transform: scale(2.5); }
  }

  @keyframes dust-left {
    0%, 70% { opacity: 0; transform: translate(0, 0) scale(0.4); }
    73% { opacity: 0.55; }
    100% { opacity: 0; transform: translate(-30px, -18px) scale(1.7); }
  }

  @keyframes dust-right {
    0%, 70% { opacity: 0; transform: translate(0, 0) scale(0.4); }
    73% { opacity: 0.55; }
    100% { opacity: 0; transform: translate(30px, -18px) scale(1.7); }
  }

  .bot:not(.anim-dance):not(.anim-jump):not(.anim-floss):not(.anim-orange-justice):not(.anim-hype):not(.anim-sprinkler):not(.anim-shuffle) {
    animation: idle-sway 4s ease-in-out infinite;
  }

  @keyframes idle-sway {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(0.3deg); }
    75% { transform: rotate(-0.3deg); }
  }

  .bot.sleeping:not(.anim-dance):not(.anim-jump):not(.anim-floss):not(.anim-orange-justice):not(.anim-hype):not(.anim-sprinkler):not(.anim-shuffle) {
    animation: sleep-bob 3s ease-in-out infinite;
  }

  @keyframes sleep-bob {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(3px) rotate(1deg); }
  }

  .eye-ring {
    opacity: 0.8;
  }

  .eye-ring.pulsing {
    animation: pulse-ring 1.8s ease-in-out infinite;
  }

  @keyframes pulse-ring {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.06); opacity: 1; }
  }

  .bot :global(.tetris-ui-button),
  .bot :global(.tetris-control-button),
  .bot :global(.play-games-btn) {
    cursor: pointer;
  }

  .bot :global(.tetris-ui-button rect),
  .bot :global(.tetris-control-button rect),
  .bot :global(.play-games-btn rect) {
    transition: fill 0.15s ease, opacity 0.15s ease;
  }

  .bot :global(.tetris-ui-button:hover rect),
  .bot :global(.tetris-control-button:hover rect),
  .bot :global(.play-games-btn:hover rect) {
    fill: #1e293b;
    opacity: 1;
  }

  .bot :global(.tetris-ui-button:active rect),
  .bot :global(.tetris-control-button:active rect),
  .bot :global(.play-games-btn:active rect) {
    transform: translateY(0.5px);
  }

  /* Star twinkle */
  :global(.twinkle) {
    animation: twinkle 1.5s ease-in-out infinite;
  }
  :global(.twinkle-delay) {
    animation: twinkle 1.5s ease-in-out infinite 0.5s;
  }
  :global(.twinkle-delay2) {
    animation: twinkle 1.5s ease-in-out infinite 1s;
  }

  @keyframes twinkle {
    0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
    50% { transform: scale(1.4) rotate(20deg); opacity: 1; }
  }

  :global(.zzz-float) {
    animation: zzz-up 2.2s ease-in-out infinite;
  }
  :global(.zzz-float-delay) {
    animation: zzz-up 2.2s ease-in-out infinite 0.4s;
  }
  :global(.zzz-float-delay2) {
    animation: zzz-up 2.2s ease-in-out infinite 0.8s;
  }

  @keyframes zzz-up {
    0%, 100% { transform: translateY(0); opacity: 0.7; }
    50% { transform: translateY(-8px); opacity: 0.2; }
  }

  /* === CSS transform-origins for all limb groups === */
  .bot :global(.left-arm-group) {
    transform-origin: 72px 178px;
    transition: transform 0.3s ease;
  }

  .bot :global(.right-arm-group) {
    transform-origin: 228px 178px;
    transition: transform 0.3s ease;
  }

  .bot :global(.left-forearm-group) {
    transform-origin: 72px 226px;
    transition: transform 0.3s ease;
  }

  .bot :global(.right-forearm-group) {
    transform-origin: 228px 226px;
    transition: transform 0.3s ease;
  }

  .bot :global(.left-leg-group) {
    transform-origin: 100px 284px;
  }

  .bot :global(.right-leg-group) {
    transform-origin: 200px 284px;
  }

  .bot :global(.left-shin-group) {
    transform-origin: 100px 317px;
    transition: transform 0.3s ease;
  }

  .bot :global(.right-shin-group) {
    transform-origin: 200px 317px;
    transition: transform 0.3s ease;
  }

  .bot :global(.head-motion-group) {
    transform-origin: 150px 100px;
    transition: transform 0.1s ease-out;
  }

  /* === Idle arm swing === */
  .bot:not(.anim-dance):not(.anim-jump):not(.anim-floss):not(.anim-orange-justice):not(.anim-hype):not(.anim-sprinkler):not(.anim-shuffle):not(.state-waving):not(.state-happy):not(.state-excited):not(.state-love) :global(.left-arm-group) {
    animation: idle-left-arm 4s ease-in-out infinite;
  }

  .bot:not(.anim-dance):not(.anim-jump):not(.anim-floss):not(.anim-orange-justice):not(.anim-hype):not(.anim-sprinkler):not(.anim-shuffle):not(.state-waving):not(.state-happy):not(.state-excited):not(.state-love) :global(.right-arm-group) {
    animation: idle-right-arm 4s ease-in-out infinite;
  }

  @keyframes idle-left-arm {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(5deg); }
  }

  @keyframes idle-right-arm {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(-5deg); }
  }

  /* === State-based arm positions === */

  .bot.state-waving :global(.right-arm-group) {
    transform: rotate(-35deg);
    animation: none;
  }
  .bot.state-waving :global(.right-forearm-group) {
    animation: wave-forearm 0.28s ease-in-out infinite;
  }

  @keyframes wave-forearm {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(-22deg); }
  }

  .bot.state-happy :global(.right-arm-group) {
    transform: rotate(-22deg);
    animation: none;
  }
  .bot.state-happy :global(.left-arm-group) {
    transform: rotate(22deg);
    animation: none;
  }
  .bot.state-happy :global(.right-forearm-group) {
    transform: rotate(-15deg);
    animation: none;
  }
  .bot.state-happy :global(.left-forearm-group) {
    transform: rotate(15deg);
    animation: none;
  }

  .bot.state-excited :global(.right-arm-group) {
    transform: rotate(-50deg);
    animation: none;
  }
  .bot.state-excited :global(.left-arm-group) {
    transform: rotate(45deg);
    animation: none;
  }
  .bot.state-excited :global(.right-forearm-group) {
    transform: rotate(-28deg);
    animation: none;
  }
  .bot.state-excited :global(.left-forearm-group) {
    transform: rotate(28deg);
    animation: none;
  }

  .bot.state-love :global(.right-arm-group) {
    transform: rotate(-50deg);
    animation: none;
  }
  .bot.state-love :global(.left-arm-group) {
    transform: rotate(45deg);
    animation: none;
  }
  .bot.state-love :global(.right-forearm-group) {
    transform: rotate(-28deg);
    animation: none;
  }
  .bot.state-love :global(.left-forearm-group) {
    transform: rotate(28deg);
    animation: none;
  }

  /* === Click Animations === */

  .anim-left-arm :global(.left-arm-group) {
    animation: left-arm-wave 0.5s ease-in-out 3;
    animation-fill-mode: forwards;
  }
  .anim-left-arm :global(.left-forearm-group) {
    animation: left-forearm-bend 0.5s ease-in-out 3;
    animation-fill-mode: forwards;
  }

  @keyframes left-arm-wave {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(42deg); }
    75% { transform: rotate(26deg); }
  }
  @keyframes left-forearm-bend {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(36deg); }
    75% { transform: rotate(20deg); }
  }

  .anim-right-arm :global(.right-arm-group) {
    animation: right-arm-wave 0.5s ease-in-out 3;
    animation-fill-mode: forwards;
  }
  .anim-right-arm :global(.right-forearm-group) {
    animation: right-forearm-bend 0.5s ease-in-out 3;
    animation-fill-mode: forwards;
  }

  @keyframes right-arm-wave {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-42deg); }
    75% { transform: rotate(-26deg); }
  }
  @keyframes right-forearm-bend {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-36deg); }
    75% { transform: rotate(-20deg); }
  }

  .anim-left-leg :global(.left-leg-group) {
    animation: left-leg-kick 0.6s ease-in-out 2;
    animation-fill-mode: forwards;
  }
  @keyframes left-leg-kick {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-18px) rotate(-12deg); }
  }

  .anim-right-leg :global(.right-leg-group) {
    animation: right-leg-tap 0.5s ease-in-out 3;
    animation-fill-mode: forwards;
  }
  @keyframes right-leg-tap {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
  }

  .anim-head-bang :global(.head-motion-group) {
    animation: head-bop 0.32s ease-in-out 4;
    animation-fill-mode: forwards;
  }
  @keyframes head-bop {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(9px) rotate(-4deg); }
  }

  .anim-dance {
    animation: dance-move 0.5s ease-in-out 4 !important;
  }
  .anim-dance :global(.left-arm-group) {
    animation: dance-left-arm 0.5s ease-in-out 4;
  }
  .anim-dance :global(.right-arm-group) {
    animation: dance-right-arm 0.5s ease-in-out 4;
  }
  .anim-dance :global(.left-forearm-group) {
    animation: dance-left-forearm 0.5s ease-in-out 4;
  }
  .anim-dance :global(.right-forearm-group) {
    animation: dance-right-forearm 0.5s ease-in-out 4;
  }
  .anim-dance :global(.left-leg-group) {
    animation: dance-left-leg 0.5s ease-in-out 4;
  }
  .anim-dance :global(.right-leg-group) {
    animation: dance-right-leg 0.5s ease-in-out 4;
  }

  @keyframes dance-move {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(-9px) rotate(-3.5deg); }
    75% { transform: translateY(-9px) rotate(3.5deg); }
  }
  @keyframes dance-left-arm {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(38deg); }
  }
  @keyframes dance-right-arm {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(-52deg); }
  }
  @keyframes dance-left-forearm {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(32deg); }
  }
  @keyframes dance-right-forearm {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(-32deg); }
  }
  @keyframes dance-left-leg {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  @keyframes dance-right-leg {
    0%, 100% { transform: translateY(0); }
    25% { transform: translateY(-6px); }
  }

  .anim-jump {
    animation: jump-up 0.8s cubic-bezier(0.25, 0.8, 0.25, 1) 2 !important;
  }
  .anim-jump :global(.left-leg-group),
  .anim-jump :global(.right-leg-group) {
    animation: jump-legs 0.8s cubic-bezier(0.25, 0.8, 0.25, 1) 2;
  }
  .anim-jump :global(.left-shin-group),
  .anim-jump :global(.right-shin-group) {
    animation: jump-shin-tuck 0.8s cubic-bezier(0.25, 0.8, 0.25, 1) 2;
  }
  .anim-jump :global(.left-arm-group) {
    animation: jump-arms-left 0.8s cubic-bezier(0.25, 0.8, 0.25, 1) 2;
  }
  .anim-jump :global(.right-arm-group) {
    animation: jump-arms-right 0.8s cubic-bezier(0.25, 0.8, 0.25, 1) 2;
  }

  @keyframes jump-up {
    0%, 100% { transform: translateY(0); }
    15% { transform: translateY(8px); }
    40% { transform: translateY(-44px); }
    70% { transform: translateY(-44px); }
    90% { transform: translateY(4px); }
  }
  @keyframes jump-legs {
    0%, 100% { transform: rotate(0deg); }
    15% { transform: rotate(5deg); }
    40%, 70% { transform: rotate(-16deg); }
  }
  @keyframes jump-shin-tuck {
    0%, 100% { transform: rotate(0deg); }
    40%, 70% { transform: rotate(-22deg); }
  }
  @keyframes jump-arms-left {
    0%, 100% { transform: rotate(0deg); }
    40%, 70% { transform: rotate(32deg); }
  }
  @keyframes jump-arms-right {
    0%, 100% { transform: rotate(0deg); }
    40%, 70% { transform: rotate(-32deg); }
  }

  .anim-floss :global(.body-group) {
    animation: floss-body 0.48s ease-in-out 4;
  }
  .anim-floss :global(.left-arm-group) {
    animation: floss-left-arm 0.48s ease-in-out 4;
  }
  .anim-floss :global(.right-arm-group) {
    animation: floss-right-arm 0.48s ease-in-out 4;
  }
  .anim-floss :global(.left-forearm-group) {
    animation: floss-left-forearm 0.48s ease-in-out 4;
  }
  .anim-floss :global(.right-forearm-group) {
    animation: floss-right-forearm 0.48s ease-in-out 4;
  }
  .anim-floss :global(.left-leg-group) {
    animation: floss-left-leg 0.48s ease-in-out 4;
  }
  .anim-floss :global(.right-leg-group) {
    animation: floss-right-leg 0.48s ease-in-out 4;
  }
  .anim-floss :global(.head-motion-group) {
    animation: floss-head 0.48s ease-in-out 4;
  }

  @keyframes floss-body {
    0%, 100% { transform: translateX(0) translateY(0); }
    25% { transform: translateX(-10px) translateY(-4px); }
    50% { transform: translateX(0) translateY(0); }
    75% { transform: translateX(10px) translateY(-4px); }
  }
  @keyframes floss-left-arm {
    0%, 100% { transform: rotate(34deg); }
    25% { transform: rotate(-32deg); }
    50% { transform: rotate(-40deg); }
    75% { transform: rotate(26deg); }
  }
  @keyframes floss-right-arm {
    0%, 100% { transform: rotate(-34deg); }
    25% { transform: rotate(32deg); }
    50% { transform: rotate(40deg); }
    75% { transform: rotate(-26deg); }
  }
  @keyframes floss-left-forearm {
    0%, 100% { transform: rotate(12deg); }
    25% { transform: rotate(28deg); }
    50% { transform: rotate(34deg); }
    75% { transform: rotate(-10deg); }
  }
  @keyframes floss-right-forearm {
    0%, 100% { transform: rotate(-12deg); }
    25% { transform: rotate(-28deg); }
    50% { transform: rotate(-34deg); }
    75% { transform: rotate(10deg); }
  }
  @keyframes floss-left-leg {
    0%, 100% { transform: translateX(0) rotate(0deg); }
    25% { transform: translateX(-4px) rotate(6deg); }
    75% { transform: translateX(3px) rotate(-4deg); }
  }
  @keyframes floss-right-leg {
    0%, 100% { transform: translateX(0) rotate(0deg); }
    25% { transform: translateX(3px) rotate(-4deg); }
    75% { transform: translateX(-4px) rotate(6deg); }
  }
  @keyframes floss-head {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(-2px) rotate(-2deg); }
    75% { transform: translateY(-2px) rotate(2deg); }
  }

  .anim-orange-justice :global(.body-group) {
    animation: orange-justice-body 0.5s cubic-bezier(0.45, 0, 0.55, 1) 4;
  }
  .anim-orange-justice :global(.left-arm-group) {
    animation: orange-justice-left-arm 0.5s cubic-bezier(0.45, 0, 0.55, 1) 4;
  }
  .anim-orange-justice :global(.right-arm-group) {
    animation: orange-justice-right-arm 0.5s cubic-bezier(0.45, 0, 0.55, 1) 4;
  }
  .anim-orange-justice :global(.left-forearm-group) {
    animation: orange-justice-left-forearm 0.5s cubic-bezier(0.45, 0, 0.55, 1) 4;
  }
  .anim-orange-justice :global(.right-forearm-group) {
    animation: orange-justice-right-forearm 0.5s cubic-bezier(0.45, 0, 0.55, 1) 4;
  }
  .anim-orange-justice :global(.left-leg-group) {
    animation: orange-justice-left-leg 0.5s cubic-bezier(0.45, 0, 0.55, 1) 4;
  }
  .anim-orange-justice :global(.right-leg-group) {
    animation: orange-justice-right-leg 0.5s cubic-bezier(0.45, 0, 0.55, 1) 4;
  }
  .anim-orange-justice :global(.left-shin-group) {
    animation: orange-justice-left-shin 0.5s cubic-bezier(0.45, 0, 0.55, 1) 4;
  }
  .anim-orange-justice :global(.right-shin-group) {
    animation: orange-justice-right-shin 0.5s cubic-bezier(0.45, 0, 0.55, 1) 4;
  }
  .anim-orange-justice :global(.head-motion-group) {
    animation: orange-justice-head 0.5s cubic-bezier(0.45, 0, 0.55, 1) 4;
  }

  @keyframes orange-justice-body {
    0%, 100% { transform: translateX(0) translateY(0); }
    25% { transform: translateX(-8px) translateY(-8px); }
    50% { transform: translateX(0) translateY(2px); }
    75% { transform: translateX(8px) translateY(-8px); }
  }
  @keyframes orange-justice-left-arm {
    0%, 100% { transform: rotate(10deg); }
    25% { transform: rotate(56deg); }
    50% { transform: rotate(-8deg); }
    75% { transform: rotate(42deg); }
  }
  @keyframes orange-justice-right-arm {
    0%, 100% { transform: rotate(-10deg); }
    25% { transform: rotate(-56deg); }
    50% { transform: rotate(8deg); }
    75% { transform: rotate(-42deg); }
  }
  @keyframes orange-justice-left-forearm {
    0%, 100% { transform: rotate(14deg); }
    25% { transform: rotate(30deg); }
    50% { transform: rotate(-12deg); }
    75% { transform: rotate(24deg); }
  }
  @keyframes orange-justice-right-forearm {
    0%, 100% { transform: rotate(-14deg); }
    25% { transform: rotate(-30deg); }
    50% { transform: rotate(12deg); }
    75% { transform: rotate(-24deg); }
  }
  @keyframes orange-justice-left-leg {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(-4px) rotate(8deg); }
    50% { transform: translateY(8px) rotate(-6deg); }
    75% { transform: translateY(-6px) rotate(12deg); }
  }
  @keyframes orange-justice-right-leg {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(8px) rotate(-6deg); }
    50% { transform: translateY(-4px) rotate(8deg); }
    75% { transform: translateY(-6px) rotate(-12deg); }
  }
  @keyframes orange-justice-left-shin {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-10deg); }
    50% { transform: rotate(8deg); }
    75% { transform: rotate(-14deg); }
  }
  @keyframes orange-justice-right-shin {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(8deg); }
    50% { transform: rotate(-10deg); }
    75% { transform: rotate(14deg); }
  }
  @keyframes orange-justice-head {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(-3px) rotate(-3deg); }
    75% { transform: translateY(-3px) rotate(3deg); }
  }

  .anim-hype :global(.body-group) {
    animation: hype-body 0.45s ease-in-out 4;
  }
  .anim-hype :global(.left-arm-group) {
    animation: hype-left-arm 0.45s ease-in-out 4;
  }
  .anim-hype :global(.right-arm-group) {
    animation: hype-right-arm 0.45s ease-in-out 4;
  }
  .anim-hype :global(.left-forearm-group) {
    animation: hype-left-forearm 0.45s ease-in-out 4;
  }
  .anim-hype :global(.right-forearm-group) {
    animation: hype-right-forearm 0.45s ease-in-out 4;
  }
  .anim-hype :global(.left-leg-group),
  .anim-hype :global(.right-leg-group) {
    animation: hype-legs 0.45s ease-in-out 4;
  }
  .anim-hype :global(.head-motion-group) {
    animation: hype-head 0.45s ease-in-out 4;
  }

  @keyframes hype-body {
    0%, 100% { transform: translateY(0) scaleY(1); }
    35% { transform: translateY(-10px) scaleY(1.01); }
    65% { transform: translateY(3px) scaleY(0.99); }
  }
  @keyframes hype-left-arm {
    0%, 100% { transform: rotate(10deg); }
    35% { transform: rotate(56deg); }
    65% { transform: rotate(24deg); }
  }
  @keyframes hype-right-arm {
    0%, 100% { transform: rotate(-10deg); }
    35% { transform: rotate(-56deg); }
    65% { transform: rotate(-24deg); }
  }
  @keyframes hype-left-forearm {
    0%, 100% { transform: rotate(8deg); }
    35% { transform: rotate(34deg); }
    65% { transform: rotate(18deg); }
  }
  @keyframes hype-right-forearm {
    0%, 100% { transform: rotate(-8deg); }
    35% { transform: rotate(-34deg); }
    65% { transform: rotate(-18deg); }
  }
  @keyframes hype-legs {
    0%, 100% { transform: translateY(0); }
    35% { transform: translateY(-8px); }
    65% { transform: translateY(4px); }
  }
  @keyframes hype-head {
    0%, 100% { transform: translateY(0); }
    35% { transform: translateY(-4px); }
    65% { transform: translateY(2px); }
  }

  .anim-sprinkler :global(.body-group) {
    animation: sprinkler-body 0.5s ease-in-out 4;
  }
  .anim-sprinkler :global(.left-arm-group) {
    animation: sprinkler-left-arm 0.5s ease-in-out 4;
  }
  .anim-sprinkler :global(.right-arm-group) {
    animation: sprinkler-right-arm 0.5s ease-in-out 4;
  }
  .anim-sprinkler :global(.left-forearm-group) {
    animation: sprinkler-left-forearm 0.5s ease-in-out 4;
  }
  .anim-sprinkler :global(.right-forearm-group) {
    animation: sprinkler-right-forearm 0.5s ease-in-out 4;
  }
  .anim-sprinkler :global(.left-leg-group) {
    animation: sprinkler-left-leg 0.5s ease-in-out 4;
  }
  .anim-sprinkler :global(.right-leg-group) {
    animation: sprinkler-right-leg 0.5s ease-in-out 4;
  }
  .anim-sprinkler :global(.head-motion-group) {
    animation: sprinkler-head 0.5s ease-in-out 4;
  }

  @keyframes sprinkler-body {
    0%, 100% { transform: translateX(0) translateY(0); }
    25% { transform: translateX(-6px) translateY(-6px); }
    75% { transform: translateX(6px) translateY(-2px); }
  }
  @keyframes sprinkler-left-arm {
    0%, 100% { transform: rotate(60deg); }
    50% { transform: rotate(18deg); }
  }
  @keyframes sprinkler-right-arm {
    0%, 100% { transform: rotate(-18deg); }
    25% { transform: rotate(-64deg); }
    75% { transform: rotate(-38deg); }
  }
  @keyframes sprinkler-left-forearm {
    0%, 100% { transform: rotate(26deg); }
    50% { transform: rotate(8deg); }
  }
  @keyframes sprinkler-right-forearm {
    0%, 100% { transform: rotate(-8deg); }
    25% { transform: rotate(-28deg); }
    75% { transform: rotate(-16deg); }
  }
  @keyframes sprinkler-left-leg {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-5px) rotate(6deg); }
  }
  @keyframes sprinkler-right-leg {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(6px) rotate(-5deg); }
    75% { transform: translateY(-4px) rotate(4deg); }
  }
  @keyframes sprinkler-head {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-3deg); }
    75% { transform: rotate(2deg); }
  }

  .anim-shuffle :global(.body-group) {
    animation: shuffle-body 0.4s ease-in-out 5;
  }
  .anim-shuffle :global(.left-arm-group) {
    animation: shuffle-left-arm 0.4s ease-in-out 5;
  }
  .anim-shuffle :global(.right-arm-group) {
    animation: shuffle-right-arm 0.4s ease-in-out 5;
  }
  .anim-shuffle :global(.left-forearm-group) {
    animation: shuffle-left-forearm 0.4s ease-in-out 5;
  }
  .anim-shuffle :global(.right-forearm-group) {
    animation: shuffle-right-forearm 0.4s ease-in-out 5;
  }
  .anim-shuffle :global(.left-leg-group) {
    animation: shuffle-left-leg 0.4s ease-in-out 5;
  }
  .anim-shuffle :global(.right-leg-group) {
    animation: shuffle-right-leg 0.4s ease-in-out 5;
  }
  .anim-shuffle :global(.left-shin-group) {
    animation: shuffle-left-shin 0.4s ease-in-out 5;
  }
  .anim-shuffle :global(.right-shin-group) {
    animation: shuffle-right-shin 0.4s ease-in-out 5;
  }
  .anim-shuffle :global(.head-motion-group) {
    animation: shuffle-head 0.4s ease-in-out 5;
  }

  @keyframes shuffle-body {
    0%, 100% { transform: translateX(0) translateY(0); }
    25% { transform: translateX(-8px) translateY(-4px); }
    75% { transform: translateX(8px) translateY(-4px); }
  }
  @keyframes shuffle-left-arm {
    0%, 100% { transform: rotate(8deg); }
    25% { transform: rotate(30deg); }
    75% { transform: rotate(-12deg); }
  }
  @keyframes shuffle-right-arm {
    0%, 100% { transform: rotate(-8deg); }
    25% { transform: rotate(12deg); }
    75% { transform: rotate(-30deg); }
  }
  @keyframes shuffle-left-forearm {
    0%, 100% { transform: rotate(6deg); }
    25% { transform: rotate(18deg); }
    75% { transform: rotate(-10deg); }
  }
  @keyframes shuffle-right-forearm {
    0%, 100% { transform: rotate(-6deg); }
    25% { transform: rotate(10deg); }
    75% { transform: rotate(-18deg); }
  }
  @keyframes shuffle-left-leg {
    0%, 100% { transform: translateX(0) rotate(0deg); }
    25% { transform: translateX(-10px) rotate(8deg); }
    75% { transform: translateX(4px) rotate(-4deg); }
  }
  @keyframes shuffle-right-leg {
    0%, 100% { transform: translateX(0) rotate(0deg); }
    25% { transform: translateX(4px) rotate(-4deg); }
    75% { transform: translateX(10px) rotate(8deg); }
  }
  @keyframes shuffle-left-shin {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-10deg); }
    75% { transform: rotate(8deg); }
  }
  @keyframes shuffle-right-shin {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(8deg); }
    75% { transform: rotate(-10deg); }
  }
  @keyframes shuffle-head {
    0%, 100% { transform: translateY(0); }
    25% { transform: translateY(-2px); }
    75% { transform: translateY(-3px); }
  }

  /* Grapple rebound: a compact replay of the arrival move. */
  .bot.anim-grapple {
    animation: grapple-rebound 2.6s cubic-bezier(0.22, 0.75, 0.18, 1) both !important;
  }

  .bot.anim-grapple :global(.right-arm-group) {
    animation: grapple-rebound-arm 2.6s ease-in-out both !important;
  }

  .bot.anim-grapple :global(.left-leg-group),
  .bot.anim-grapple :global(.right-leg-group) {
    animation: grapple-rebound-legs 2.6s ease-in-out both !important;
  }

  @keyframes grapple-rebound {
    0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
    16% { transform: translate3d(5px, 8px, 0) rotate(1deg) scaleY(0.98); }
    42% { transform: translate3d(42px, -82px, 42px) rotate(12deg) scale(0.92); filter: drop-shadow(-10px 18px 12px rgba(15, 23, 42, 0.12)); }
    66% { transform: translate3d(-16px, -30px, 18px) rotate(-6deg) scale(0.98); }
    84% { transform: translate3d(0, 5px, 0) rotate(1deg) scaleY(0.975); filter: none; }
  }

  @keyframes grapple-rebound-arm {
    0%, 12%, 100% { transform: rotate(0deg); }
    28%, 58% { transform: rotate(-128deg); }
    78% { transform: rotate(-30deg); }
  }

  @keyframes grapple-rebound-legs {
    0%, 12%, 100% { transform: rotate(0deg) translateY(0); }
    38%, 62% { transform: rotate(-17deg) translateY(-7px); }
    82% { transform: rotate(7deg) translateY(5px); }
  }

  /* A grounded mechanical moonwalk with counter-rotating joints. */
  .bot.anim-moonwalk :global(.body-group) {
    animation: moonwalk-body 0.44s cubic-bezier(0.5, 0, 0.3, 1) 5 !important;
  }

  .bot.anim-moonwalk :global(.left-leg-group) {
    animation: moonwalk-left-leg 0.88s ease-in-out 2.5 !important;
  }

  .bot.anim-moonwalk :global(.right-leg-group) {
    animation: moonwalk-right-leg 0.88s ease-in-out 2.5 !important;
  }

  .bot.anim-moonwalk :global(.left-shin-group) {
    animation: moonwalk-left-shin 0.88s ease-in-out 2.5 !important;
  }

  .bot.anim-moonwalk :global(.right-shin-group) {
    animation: moonwalk-right-shin 0.88s ease-in-out 2.5 !important;
  }

  .bot.anim-moonwalk :global(.left-arm-group),
  .bot.anim-moonwalk :global(.right-arm-group) {
    animation: moonwalk-arms 0.88s ease-in-out 2.5 !important;
  }

  @keyframes moonwalk-body {
    0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
    50% { transform: translateX(-7px) translateY(-3px) rotate(-1.5deg); }
  }

  @keyframes moonwalk-left-leg {
    0%, 100% { transform: translateX(7px) rotate(-5deg); }
    50% { transform: translateX(-9px) rotate(8deg); }
  }

  @keyframes moonwalk-right-leg {
    0%, 100% { transform: translateX(-8px) rotate(7deg); }
    50% { transform: translateX(8px) rotate(-6deg); }
  }

  @keyframes moonwalk-left-shin {
    0%, 100% { transform: rotate(-14deg) translateY(-3px); }
    50% { transform: rotate(10deg) translateY(2px); }
  }

  @keyframes moonwalk-right-shin {
    0%, 100% { transform: rotate(12deg) translateY(2px); }
    50% { transform: rotate(-14deg) translateY(-3px); }
  }

  @keyframes moonwalk-arms {
    0%, 100% { transform: rotate(-13deg); }
    50% { transform: rotate(15deg); }
  }

  /* Pathfinder-style victory beat: compress, launch, hold, and land. */
  .bot.anim-victory {
    animation: victory-hop 2.2s cubic-bezier(0.2, 0.75, 0.25, 1) both !important;
  }

  .bot.anim-victory :global(.left-arm-group) {
    animation: victory-left-arm 2.2s ease-in-out both !important;
  }

  .bot.anim-victory :global(.right-arm-group) {
    animation: victory-right-arm 2.2s ease-in-out both !important;
  }

  .bot.anim-victory :global(.left-leg-group),
  .bot.anim-victory :global(.right-leg-group) {
    animation: victory-legs 2.2s ease-in-out both !important;
  }

  @keyframes victory-hop {
    0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
    14% { transform: translateY(7px) rotate(0deg) scaleX(1.03) scaleY(0.97); }
    36%, 62% { transform: translateY(-38px) rotate(-2deg) scale(1.02); }
    82% { transform: translateY(4px) rotate(1deg) scaleX(1.025) scaleY(0.975); }
  }

  @keyframes victory-left-arm {
    0%, 100% { transform: rotate(0deg); }
    28%, 70% { transform: rotate(142deg); }
    84% { transform: rotate(24deg); }
  }

  @keyframes victory-right-arm {
    0%, 100% { transform: rotate(0deg); }
    28%, 70% { transform: rotate(-142deg); }
    84% { transform: rotate(-24deg); }
  }

  @keyframes victory-legs {
    0%, 100% { transform: rotate(0deg); }
    32%, 64% { transform: rotate(-13deg) translateY(-5px); }
    82% { transform: rotate(6deg) translateY(4px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .bot,
    .bot :global(*),
    .grapple-rig,
    .grapple-rig :global(*) {
      animation: none !important;
      transition-duration: 0.01ms !important;
    }

    .grapple-rig {
      display: none;
    }
  }

</style>
