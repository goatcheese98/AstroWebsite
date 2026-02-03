<script lang="ts">
  type RobotState = "idle" | "waving" | "happy" | "excited" | "love";
  type ScreenMessage = "smile" | "hi" | "heart" | "cool";
  type ClickAnimation = "right-arm" | "left-arm" | "left-leg" | "right-leg" | "body-shake" | "head-bang";

  const MESSAGES: ScreenMessage[] = ["smile", "hi", "heart", "cool"];
  const CLICK_ANIMATIONS: ClickAnimation[] = [
    "right-arm",
    "left-arm", 
    "left-leg",
    "right-leg",
    "body-shake",
    "head-bang"
  ];

  const COLORS = {
    body: "#e2e8f0",
    bodyStroke: "#475569",
    eyeRing: "#d97706",
    eye: "#f59e0b",
    screen: "#fef3c7",
    screenActive: "#fde68a",
    accent: "#3b82f6",
  };

  // State
  let robotState = $state<RobotState>("idle");
  let screenMessage = $state<ScreenMessage>("smile");
  let isHovering = $state(false);
  let mouseOffset = $state({ x: 0, y: 0 });
  let containerRef: HTMLDivElement;
  let clickAnimation = $state<ClickAnimation | null>(null);

  // Refs for timers
  let waveTimeout: ReturnType<typeof setTimeout> | null = null;
  let messageInterval: ReturnType<typeof setInterval> | null = null;
  let clickAnimationTimeout: ReturnType<typeof setTimeout> | null = null;

  // Track mouse for head movement - subtle when not hovering
  function handleGlobalMouseMove(e: MouseEvent) {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const offsetX = (e.clientX - centerX) / (rect.width / 2);
    const offsetY = (e.clientY - centerY) / (rect.height / 2);

    const multiplier = 1;

    mouseOffset = {
      x: Math.max(-1, Math.min(1, offsetX)) * 8 * multiplier,
      y: Math.max(-1, Math.min(1, offsetY)) * 5 * multiplier,
    };
  }

  // Schedule wave animation
  function scheduleWave() {
    const delay = 4000 + Math.random() * 3000;
    waveTimeout = setTimeout(() => {
      if (robotState === "idle") {
        robotState = "waving";
        screenMessage = "hi";
        setTimeout(() => {
          robotState = "idle";
          screenMessage = "smile";
        }, 2000);
      }
      scheduleWave();
    }, delay);
  }

  // Initialize timers
  $effect(() => {
    window.addEventListener("mousemove", handleGlobalMouseMove);
    scheduleWave();

    messageInterval = setInterval(() => {
      if (robotState === "idle") {
        const nextMsg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
        screenMessage = nextMsg;
        // Reset back to smile after a brief moment if not interacting
        if (nextMsg !== "smile") {
          setTimeout(() => {
            if (robotState === "idle") {
              screenMessage = "smile";
            }
          }, 1500);
        }
      }
    }, 6000);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      if (waveTimeout) clearTimeout(waveTimeout);
      if (messageInterval) clearInterval(messageInterval);
      if (clickAnimationTimeout) clearTimeout(clickAnimationTimeout);
    };
  });

  function handleClick() {
    // Randomly select a body part animation
    const randomAnim = CLICK_ANIMATIONS[Math.floor(Math.random() * CLICK_ANIMATIONS.length)];
    clickAnimation = randomAnim;
    
    robotState = "excited";
    screenMessage = "heart";
    setTimeout(() => (robotState = "love"), 300);
    setTimeout(() => {
      robotState = "happy";
      screenMessage = "cool";
    }, 1200);
    setTimeout(() => {
      robotState = "idle";
      screenMessage = "smile";
    }, 2500);
    
    // Clear the click animation after it completes
    if (clickAnimationTimeout) clearTimeout(clickAnimationTimeout);
    clickAnimationTimeout = setTimeout(() => {
      clickAnimation = null;
    }, 2000);
  }

  function handleMouseEnter() {
    isHovering = true;
    robotState = "happy";
    screenMessage = "hi";
  }

  function handleMouseLeave() {
    isHovering = false;
    robotState = "idle";
    screenMessage = "smile";
  }

  // Derived values
  const headTranslateX = $derived(mouseOffset.x);
  const headTranslateY = $derived(mouseOffset.y);
  const headRotate = $derived(mouseOffset.x * 0.5);

  const isWaving = $derived(robotState === "waving");
  const isExcited = $derived(robotState === "excited");
  const isLove = $derived(robotState === "love");
  const isHappy = $derived(robotState === "happy" || isHovering);
  const eyeGlow = $derived(
    isExcited || isLove ? "#fbbf24" : isHappy ? "#f59e0b" : "#d97706",
  );
  const screenColor = $derived(
    isExcited || isLove
      ? "#fca5a5"
      : isHappy
        ? COLORS.screenActive
        : COLORS.screen,
  );
</script>

<div bind:this={containerRef} class="container">
  <div
    on:click={handleClick}
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave}
    class="bot"
    class:hovering={isHovering}
    class:anim-right-arm={clickAnimation === "right-arm"}
    class:anim-left-arm={clickAnimation === "left-arm"}
    class:anim-left-leg={clickAnimation === "left-leg"}
    class:anim-right-leg={clickAnimation === "right-leg"}
    class:anim-body-shake={clickAnimation === "body-shake"}
    class:anim-head-bang={clickAnimation === "head-bang"}
  >
    <svg
      width="300"
      height="420"
      viewBox="0 -40 300 420"
      style="overflow: visible;"
    >
      <defs>
        <style>
          @keyframes heartbeat {
            0%,
            100% {
              transform: scale(1);
            }
            25% {
              transform: scale(1.15);
            }
            50% {
              transform: scale(1);
            }
          }
          @keyframes pulse-ring {
            0%,
            100% {
              transform: scale(1);
              opacity: 0.8;
            }
            50% {
              transform: scale(1.08);
              opacity: 1;
            }
          }
        </style>
      </defs>

      <!-- Left Leg -->
      <g class="left-leg-group" style="transform-origin: 100px 315px;">
        <rect
          x="85"
          y="280"
          width="30"
          height="70"
          rx="8"
          fill={COLORS.body}
          stroke={COLORS.bodyStroke}
          stroke-width="2.5"
        />
        <rect
          x="82"
          y="340"
          width="36"
          height="20"
          rx="4"
          fill={COLORS.bodyStroke}
        />
        <circle cx="100" cy="350" r="3" fill={COLORS.body} />
      </g>

      <!-- Right Leg -->
      <g class="right-leg-group" style="transform-origin: 200px 315px;">
        <rect
          x="185"
          y="280"
          width="30"
          height="70"
          rx="8"
          fill={COLORS.body}
          stroke={COLORS.bodyStroke}
          stroke-width="2.5"
        />
        <rect
          x="182"
          y="340"
          width="36"
          height="20"
          rx="4"
          fill={COLORS.bodyStroke}
        />
        <circle cx="200" cy="350" r="3" fill={COLORS.body} />
      </g>

      <!-- Body -->
      <rect
        x="85"
        y="160"
        width="130"
        height="130"
        rx="15"
        fill={COLORS.body}
        stroke={COLORS.bodyStroke}
        stroke-width="2.5"
        style="transform: {isExcited
          ? 'translateY(-5px)'
          : 'translateY(0)'}; transition: transform 0.2s ease;"
      />

      <!-- Chest Screen Frame -->
      <rect
        x="100"
        y="180"
        width="100"
        height="80"
        rx="8"
        fill="#f8fafc"
        stroke={COLORS.eyeRing}
        stroke-width="2.5"
      />
      <rect
        x="105"
        y="185"
        width="90"
        height="70"
        rx="4"
        fill={screenColor}
        opacity={isHappy || isExcited || isLove ? 0.4 : 0.2}
        style="transition: all 0.3s ease;"
      >
        {#if isHappy || isExcited || isLove}
          <animate
            attributeName="opacity"
            values="0.4;0.6;0.4"
            dur="0.3s"
            repeatCount="indefinite"
          />
        {/if}
      </rect>

      <!-- Screen Content -->
      <g
        style="transform-origin: 150px 220px; transition: transform 0.2s ease;"
      >
        {#if screenMessage === "hi"}
          <text
            x="150"
            y="225"
            text-anchor="middle"
            fill={COLORS.bodyStroke}
            font-size="20"
            font-weight="bold"
            font-family="var(--font-hand)">Hi!</text
          >
          <circle cx="135" cy="210" r="3" fill={COLORS.bodyStroke} />
          <circle cx="165" cy="210" r="3" fill={COLORS.bodyStroke} />
          <path
            d="M 140 235 Q 150 242 160 235"
            fill="none"
            stroke={COLORS.bodyStroke}
            stroke-width="2.5"
            stroke-linecap="round"
          />
        {:else if screenMessage === "heart"}
          <path
            d="M 150 235 C 150 230, 140 220, 135 225 C 130 230, 150 245, 150 245 C 150 245, 170 230, 165 225 C 160 220, 150 230, 150 235"
            fill="#f87171"
            style="transform-origin: 150px 232px; animation: heartbeat 0.5s ease-in-out infinite;"
          />
        {:else if screenMessage === "cool"}
          <text
            x="150"
            y="228"
            text-anchor="middle"
            fill={COLORS.bodyStroke}
            font-size="16"
            font-weight="bold"
            font-family="var(--font-hand)">COOL!</text
          >
          <path
            d="M 130 215 L 135 210 L 140 215"
            fill="none"
            stroke={COLORS.bodyStroke}
            stroke-width="2"
          />
          <path
            d="M 160 215 L 165 210 L 170 215"
            fill="none"
            stroke={COLORS.bodyStroke}
            stroke-width="2"
          />
        {:else}
          <!-- smile - default -->
          <circle
            cx="150"
            cy="220"
            r="25"
            fill={screenColor}
            style="transition: fill 0.3s ease;"
          />
          <rect
            x="140"
            y="212"
            width="6"
            height="8"
            rx="1"
            fill={COLORS.bodyStroke}
          />
          <rect
            x="154"
            y="212"
            width="6"
            height="8"
            rx="1"
            fill={COLORS.bodyStroke}
          />
          <path
            d={isExcited
              ? "M 138 228 Q 150 240 162 228"
              : "M 138 226 Q 150 232 162 226"}
            fill="none"
            stroke={COLORS.bodyStroke}
            stroke-width="3"
            stroke-linecap="round"
            style="transition: d 0.2s ease;"
          />
        {/if}
      </g>

      <!-- Body Details -->
      <circle cx="95" cy="200" r="5" fill={COLORS.bodyStroke} opacity="0.5" />
      <circle cx="205" cy="200" r="5" fill={COLORS.bodyStroke} opacity="0.5" />
      <circle cx="95" cy="240" r="5" fill={COLORS.bodyStroke} opacity="0.5" />
      <circle cx="205" cy="240" r="5" fill={COLORS.bodyStroke} opacity="0.5" />

      <!-- Left Arm -->
      <g class="left-arm-group" style="transform-origin: 72px 185px;">
        <rect
          x="60"
          y="175"
          width="25"
          height="80"
          rx="10"
          fill={COLORS.body}
          stroke={COLORS.bodyStroke}
          stroke-width="2.5"
        />
        <circle cx="72" cy="185" r="4" fill={COLORS.bodyStroke} opacity="0.5" />
        <rect
          x="58"
          y="250"
          width="29"
          height="25"
          rx="6"
          fill={COLORS.bodyStroke}
        />
        <rect x="60" y="273" width="6" height="12" rx="2" fill={COLORS.body} />
        <rect x="70" y="273" width="6" height="12" rx="2" fill={COLORS.body} />
        <rect x="80" y="273" width="6" height="12" rx="2" fill={COLORS.body} />
      </g>

      <!-- Right Arm (Waving) -->
      <g
        class="right-arm-group"
        style="transform-origin: 227px 185px; transform: {isWaving
          ? 'rotate(-30deg)'
          : isExcited || isLove
            ? 'rotate(-45deg)'
            : 'rotate(0deg)'}; transition: transform 0.3s ease;"
      >
        <rect
          x="215"
          y="175"
          width="25"
          height="80"
          rx="10"
          fill={COLORS.body}
          stroke={COLORS.bodyStroke}
          stroke-width="2.5"
        />
        <circle
          cx="227"
          cy="185"
          r="4"
          fill={COLORS.bodyStroke}
          opacity="0.5"
        />
        <g style="transform-origin: 227px 255px;">
          <rect
            x="213"
            y="250"
            width="28"
            height="22"
            rx="6"
            fill={COLORS.bodyStroke}
          />
          <rect
            x="212"
            y="245"
            width="6"
            height="15"
            rx="2"
            fill={COLORS.body}
          />
          <rect
            x="222"
            y="243"
            width="6"
            height="17"
            rx="2"
            fill={COLORS.body}
          />
          <rect
            x="232"
            y="245"
            width="6"
            height="15"
            rx="2"
            fill={COLORS.body}
          />
        </g>
        {#if isWaving}
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 227 255; -10 227 255; 0 227 255"
            dur="0.25s"
            repeatCount="indefinite"
            additive="sum"
          />
        {/if}
      </g>

      <!-- Neck -->
      <rect
        x="130"
        y="145"
        width="40"
        height="20"
        fill={COLORS.bodyStroke}
        opacity="0.7"
      />
      <rect
        x="125"
        y="150"
        width="50"
        height="10"
        rx="3"
        fill={COLORS.body}
        stroke={COLORS.bodyStroke}
        stroke-width="2"
      />

      <!-- Head -->
      <g
        class="head-group"
        style="transform-origin: 150px 100px; transform: translate({headTranslateX}px, {headTranslateY}px) rotate({headRotate}deg); transition: transform 0.1s ease-out;"
      >
        <circle
          cx="150"
          cy="85"
          r="55"
          fill={COLORS.body}
          stroke={COLORS.bodyStroke}
          stroke-width="2.5"
          style="filter: drop-shadow(0 3px 8px rgba(0,0,0,0.15));"
        />

        <!-- Orange eye ring with pulse animation - only on hover -->
        <circle
          cx="150"
          cy="85"
          r="45"
          fill="none"
          stroke={COLORS.eyeRing}
          stroke-width="4"
          class="eye-ring"
          class:pulsing={isHovering}
          style="transform-origin: 150px 85px;"
        />

        <circle cx="150" cy="85" r="38" fill={COLORS.bodyStroke} />
        <circle
          cx="150"
          cy="85"
          r="28"
          fill={eyeGlow}
          style="filter: drop-shadow(0 0 {isHappy || isExcited || isLove
            ? '20px'
            : '12px'} {eyeGlow}); transition: all 0.2s ease;"
        >
          {#if isHappy || isExcited || isLove}
            <animate
              attributeName="opacity"
              values="1;0.85;1"
              dur="0.4s"
              repeatCount="indefinite"
            />
          {/if}
        </circle>
        <circle cx="140" cy="72" r="8" fill="white" opacity="0.9" />
        <circle cx="160" cy="95" r="3" fill="white" opacity="0.5" />
        <rect
          x="95"
          y="70"
          width="12"
          height="30"
          rx="4"
          fill={COLORS.bodyStroke}
          opacity="0.4"
        />
        <rect
          x="193"
          y="70"
          width="12"
          height="30"
          rx="4"
          fill={COLORS.bodyStroke}
          opacity="0.4"
        />
      </g>

      <!-- Antenna -->
      <g
        style="transform: translate({headTranslateX * 0.5}px, {headTranslateY *
          0.5}px); transition: transform 0.1s ease-out;"
      >
        <line
          x1="150"
          y1="30"
          x2="150"
          y2="5"
          stroke={COLORS.bodyStroke}
          stroke-width="3"
        />
        <circle
          cx="150"
          cy="5"
          r="7"
          fill={isHappy || isExcited || isLove
            ? COLORS.screenActive
            : COLORS.bodyStroke}
          style="filter: {isHappy || isExcited || isLove
            ? `drop-shadow(0 0 8px ${COLORS.screenActive})`
            : 'none'}; transition: all 0.2s ease;"
        >
          {#if isHappy || isExcited || isLove}
            <animate
              attributeName="opacity"
              values="1;0.6;1"
              dur="0.5s"
              repeatCount="indefinite"
            />
          {/if}
        </circle>
      </g>
    </svg>
  </div>
</div>

<style>
  .container {
    width: 300px;
    height: 420px;
    position: relative;
    user-select: none;
    /* Prevent clipping of the head/antenna when moving */
    overflow: visible;
  }

  .bot {
    width: 300px;
    height: 420px;
    position: absolute;
    cursor: pointer;
    filter: url(#sketch-filter);
    transition: transform 0.2s ease;
    /* Ensure content can overflow */
    overflow: visible;
  }

  .bot:hover {
    transform: none;
  }

  .eye-ring {
    opacity: 0.8;
  }

  .eye-ring.pulsing {
    animation: pulse-ring 2s ease-in-out infinite;
  }

  @keyframes heartbeat {
    0%,
    100% {
      transform: scale(1);
    }
    25% {
      transform: scale(1.15);
    }
    50% {
      transform: scale(1);
    }
  }

  @keyframes pulse-ring {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.8;
    }
    50% {
      transform: scale(1.08);
      opacity: 1;
    }
  }

  /* Click Animation - Left Arm: Cheerful wave outward (away from body to the left) */
  .anim-left-arm :global(.left-arm-group) {
    animation: left-arm-wave 0.5s ease-in-out 3;
  }

  @keyframes left-arm-wave {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(40deg); }
    75% { transform: rotate(25deg); }
  }

  /* Click Animation - Right Arm: Cheerful wave outward (away from body to the right) */
  .anim-right-arm :global(.right-arm-group) {
    animation: right-arm-wave 0.5s ease-in-out 3;
  }

  @keyframes right-arm-wave {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-40deg); }
    75% { transform: rotate(-25deg); }
  }

  /* Click Animation - Left Leg: Kick/stomp motion */
  .anim-left-leg :global(.left-leg-group) {
    animation: left-leg-kick 0.6s ease-in-out 2;
  }

  @keyframes left-leg-kick {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-15px) rotate(-10deg); }
  }

  /* Click Animation - Right Leg: Tap/jump motion */
  .anim-right-leg :global(.right-leg-group) {
    animation: right-leg-tap 0.5s ease-in-out 3;
  }

  @keyframes right-leg-tap {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  /* Click Animation - Body Shake: Full body wiggle */
  .anim-body-shake {
    animation: body-wiggle 0.3s ease-in-out 4;
  }

  @keyframes body-wiggle {
    0%, 100% { transform: translateX(0) rotate(0deg); }
    25% { transform: translateX(-5px) rotate(-2deg); }
    75% { transform: translateX(5px) rotate(2deg); }
  }

  /* Click Animation - Head Bang: Head bopping motion */
  .anim-head-bang :global(.head-group) {
    animation: head-bop 0.35s ease-in-out 4;
  }

  @keyframes head-bop {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(8px) rotate(-3deg); }
  }
</style>
