<script lang="ts">
  let isHovering = $state(false);
  let isAction = $state(false);
  let currentActionClass = $state(""); // 'scan' or 'backflip'
  let mouseOffset = $state({ x: 0, y: 0 });

  function handleMouseMove(e: MouseEvent) {
    if (!isAction) {
      const xOffset = (e.clientX / window.innerWidth - 0.5) * 30;
      const yOffset = (e.clientY / window.innerHeight - 0.5) * 15;
      mouseOffset = { x: xOffset, y: yOffset };
    }
  }

  $effect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  });

  function triggerAction() {
    if (isAction) return;
    isAction = true;

    // Choose randomly between 'scan' and 'backflip'
    const actionType = Math.random() > 0.5 ? "backflip" : "scan";
    currentActionClass = actionType;

    let duration = actionType === "backflip" ? 3500 : 2800;

    setTimeout(() => {
      isAction = false;
      currentActionClass = "";
    }, duration);
  }

  // Calculate dynamic rotation based on mouse position to simulate turning towards the cursor.
  // When cursor moves left-to-right, it maps to a full 900-degree rotation.
  const rotationDegrees = $derived(
    (mouseOffset.x / 30) * 450, // xOffset is between -30 and +30. This makes full range -450 to +450 = 900 degrees
  );
</script>

<div
  class="spot-container"
  onmouseenter={() => (isHovering = true)}
  onmouseleave={() => (isHovering = false)}
  onclick={triggerAction}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === "Enter" && triggerAction()}
>
  <!-- Dynamic shadow -->
  <div
    class="shadow"
    class:acting={isAction}
    style="transform: translateX({-mouseOffset.x}px); opacity: {currentActionClass ===
    'backflip'
      ? '0.1'
      : ''}"
  ></div>

  <!-- Wrapper for 900-deg tracking relative to the cursor -->
  <div
    class="robot-wrapper"
    style="transform: rotateY({rotationDegrees}deg); transition: transform 0.2s ease-out;"
  >
    <svg
      viewBox="0 0 800 600"
      class="spot-robot"
      class:acting={isAction}
      class:action-scan={currentActionClass === "scan"}
      class:action-backflip={currentActionClass === "backflip"}
      class:hovering={isHovering}
      style="transform: translate({mouseOffset.x}px, {mouseOffset.y}px)"
    >
      <!-- === BACKGROUND LEGS (Left Side) === -->
      <!-- Hind Left Leg -->
      <g class="leg hind-left" stroke-linejoin="round" stroke-linecap="round">
        <path d="M 230 250 L 140 370" stroke="#dcb40a" stroke-width="45" />
        <path
          d="M 140 370 Q 200 450 240 450 Q 200 500 180 550"
          fill="none"
          stroke="#111"
          stroke-width="25"
        />
        <circle cx="180" cy="550" r="14" fill="#222" />
      </g>
      <!-- Fore Left Leg -->
      <g class="leg fore-left" stroke-linejoin="round" stroke-linecap="round">
        <path d="M 520 250 L 610 380" stroke="#dcb40a" stroke-width="45" />
        <path
          d="M 610 380 Q 550 460 520 450 Q 560 500 520 540"
          fill="none"
          stroke="#111"
          stroke-width="25"
        />
        <circle cx="520" cy="540" r="14" fill="#222" />
      </g>

      <!-- === BODY HULL === -->
      <g class="body">
        <!-- Mechanical Underbelly -->
        <path d="M 230 280 L 540 280 L 510 320 L 260 320 Z" fill="#181818" />

        <!-- Yellow Main Hull (#fbce07 is the iconic Spot yellow) -->
        <path
          d="M 180 200 
               L 560 200 
               L 580 220 
               C 600 240, 600 270, 580 280 
               L 540 290 
               L 230 290 
               L 160 250 
               C 150 230, 160 200, 180 200 Z"
          fill="#fbce07"
        />

        <!-- Panel Vents & Seam Lines -->
        <line
          x1="250"
          y1="200"
          x2="250"
          y2="290"
          stroke="#dfb000"
          stroke-width="4"
        />
        <line
          x1="490"
          y1="200"
          x2="490"
          y2="290"
          stroke="#dfb000"
          stroke-width="4"
        />

        <!-- Side Vents -->
        <path
          d="M 330 275 L 430 275"
          stroke="#111"
          stroke-width="6"
          stroke-linecap="round"
        />
        <path
          d="M 330 285 L 430 285"
          stroke="#111"
          stroke-width="6"
          stroke-linecap="round"
        />

        <!-- Handles (Top) -->
        <path
          d="M 220 200 C 220 155, 290 155, 290 200"
          fill="none"
          stroke="#1a1a1a"
          stroke-width="12"
          stroke-linecap="round"
        />
        <path
          d="M 450 200 C 450 155, 520 155, 520 200"
          fill="none"
          stroke="#1a1a1a"
          stroke-width="12"
          stroke-linecap="round"
        />
        <!-- Power button / Top node -->
        <rect x="360" y="190" width="20" height="10" rx="3" fill="#222" />

        <!-- Front Sensor Array (Face) -->
        <path d="M 575 220 L 625 220 L 610 260 L 565 260 Z" fill="#111" />

        <!-- Lenses and Sensors (Face Details) -->
        <g class="sensors">
          <rect x="580" y="235" width="25" height="12" rx="4" fill="#2a2a2a" />
          <!-- Stereo Cameras -->
          <circle
            cx="586"
            cy="241"
            r="3"
            fill="#000"
            stroke="#555"
            stroke-width="1.5"
          />
          <circle
            cx="598"
            cy="241"
            r="3"
            fill="#000"
            stroke="#555"
            stroke-width="1.5"
          />
          <!-- Scanner laser -->
          <circle
            cx="612"
            cy="241"
            r="4"
            fill="#111"
            stroke="#f00"
            stroke-width="1"
            class="laser-eye"
          />
        </g>

        <!-- Typography (Spot Logo) -->
        <text
          x="320"
          y="238"
          font-family="'Helvetica Neue', Helvetica, sans-serif"
          font-weight="600"
          font-size="26"
          fill="#111"
          letter-spacing="-0.5">BostonDynamics</text
        >

        <!-- Side Vision Sensors -->
        <rect x="270" y="220" width="45" height="18" rx="6" fill="#111" />
        <circle cx="282" cy="229" r="4" fill="#333" />
        <circle cx="295" cy="229" r="4" fill="#333" />
        <rect x="303" y="227" width="6" height="4" rx="1" fill="#444" />
      </g>

      <!-- === FOREGROUND LEGS (Right Side) === -->
      <!-- Hind Right Leg -->
      <g class="leg hind-right" stroke-linejoin="round" stroke-linecap="round">
        <!-- Upper Yellow Joint -->
        <path d="M 270 240 L 160 380" stroke="#fbce07" stroke-width="50" />
        <!-- Lower Mechanical Joint -->
        <path
          d="M 160 380 Q 230 460 270 460 Q 230 510 210 570"
          fill="none"
          stroke="#151515"
          stroke-width="32"
        />
        <!-- Mechanical Accents -->
        <circle cx="270" cy="240" r="25" fill="#111" />
        <circle cx="160" cy="380" r="22" fill="#111" />
        <path
          d="M 155 380 L 180 395"
          stroke="#333"
          stroke-width="4"
          stroke-linecap="round"
        />
        <!-- Foot Pad -->
        <path d="M 195 565 L 225 565 L 235 590 L 195 590 Z" fill="#151515" />
        <path d="M 210 570 L 210 590" stroke="#555" stroke-width="4" />
      </g>
      <!-- Fore Right Leg -->
      <g class="leg fore-right" stroke-linejoin="round" stroke-linecap="round">
        <path d="M 550 240 L 640 390" stroke="#fbce07" stroke-width="50" />
        <path
          d="M 640 390 Q 570 470 540 460 Q 590 510 550 560"
          fill="none"
          stroke="#151515"
          stroke-width="32"
        />
        <circle cx="550" cy="240" r="25" fill="#111" />
        <circle cx="640" cy="390" r="22" fill="#111" />
        <path
          d="M 635 390 L 610 405"
          stroke="#333"
          stroke-width="4"
          stroke-linecap="round"
        />
        <path d="M 535 555 L 565 555 L 575 580 L 535 580 Z" fill="#151515" />
        <path d="M 550 560 L 550 580" stroke="#555" stroke-width="4" />
      </g>
    </svg>
  </div>
</div>

<style>
  .spot-container {
    width: 100%;
    max-width: 700px;
    height: auto;
    aspect-ratio: 4/3;
    margin: 0 auto;
    position: relative;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    perspective: 1000px;
  }

  .shadow {
    position: absolute;
    bottom: 5%;
    width: 60%;
    height: 30px;
    background: radial-gradient(
      ellipse at center,
      rgba(0, 0, 0, 0.3) 0%,
      rgba(0, 0, 0, 0) 70%
    );
    border-radius: 50%;
    transition: all 0.5s ease;
  }

  .spot-robot {
    width: 100%;
    height: 100%;
    transition: transform 0.1s ease-out;
  }

  /* Red laser pulse */
  .laser-eye {
    animation: pulse-laser 2s infinite alternate ease-in-out;
  }

  @keyframes pulse-laser {
    0% {
      fill: #220000;
      filter: drop-shadow(0 0 1px #ff0000);
    }
    100% {
      fill: #ff0000;
      filter: drop-shadow(0 0 5px #ff0000);
    }
  }

  /* Idle Breathing Animation */
  .spot-robot .body {
    animation: idle-breathe 2.5s infinite ease-in-out;
    transform-origin: center;
  }

  .spot-robot.hovering .body {
    animation: hover-breathe 1s infinite alternate
      cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  @keyframes idle-breathe {
    0%,
    100% {
      transform: translateY(0) rotate(0deg);
    }
    50% {
      transform: translateY(-4px) rotate(0.5deg);
    }
  }

  @keyframes hover-breathe {
    0% {
      transform: translateY(0) rotate(-1deg);
    }
    100% {
      transform: translateY(5px) rotate(1deg);
    }
  }

  /* =================================== */
  /* Complex Scan/Inspect Animation      */
  /* =================================== */

  .spot-robot.acting {
    animation: none; /* Disable global transform, handle internally */
  }

  /* Body tilts down to inspect the ground, then looks up */
  .spot-robot.action-scan .body {
    animation: scan-body 2.8s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
  }

  @keyframes scan-body {
    0% {
      transform: translateY(0) rotate(0deg);
    }
    15% {
      transform: translateY(20px) rotate(8deg);
    } /* Look down */
    30% {
      transform: translateY(20px) rotate(8deg);
    } /* Hold look down */
    50% {
      transform: translateY(-30px) rotate(-12deg);
    } /* Look up */
    75% {
      transform: translateY(-30px) rotate(-12deg);
    } /* Hold look up */
    100% {
      transform: translateY(0) rotate(0deg);
    } /* Reset */
  }

  /* Leg pivot points for realism */
  .leg {
    transform-origin: 50% 40%;
  }
  .fore-right {
    transform-origin: 550px 240px;
  }
  .hind-right {
    transform-origin: 270px 240px;
  }
  .fore-left {
    transform-origin: 520px 250px;
  }
  .hind-left {
    transform-origin: 230px 250px;
  }

  /* Leg inverse kinematics simulation via rotations */
  .spot-robot.action-scan .fore-right {
    animation: flex-fore 2.8s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
  }
  .spot-robot.action-scan .fore-left {
    animation: flex-fore-left 2.8s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
  }
  .spot-robot.action-scan .hind-right {
    animation: flex-hind 2.8s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
  }
  .spot-robot.action-scan .hind-left {
    animation: flex-hind-left 2.8s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
  }

  @keyframes flex-fore {
    0% {
      transform: rotate(0deg);
    }
    15% {
      transform: rotate(-15deg);
    }
    30% {
      transform: rotate(-15deg);
    }
    50% {
      transform: rotate(18deg);
    }
    75% {
      transform: rotate(18deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }

  @keyframes flex-fore-left {
    0% {
      transform: rotate(0deg);
    }
    15% {
      transform: rotate(-12deg);
    }
    30% {
      transform: rotate(-12deg);
    }
    50% {
      transform: rotate(15deg);
    }
    75% {
      transform: rotate(15deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }

  @keyframes flex-hind {
    0% {
      transform: rotate(0deg);
    }
    15% {
      transform: rotate(8deg);
    }
    30% {
      transform: rotate(8deg);
    }
    50% {
      transform: rotate(-10deg);
    }
    75% {
      transform: rotate(-10deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }

  @keyframes flex-hind-left {
    0% {
      transform: rotate(0deg);
    }
    15% {
      transform: rotate(10deg);
    }
    30% {
      transform: rotate(10deg);
    }
    50% {
      transform: rotate(-12deg);
    }
    75% {
      transform: rotate(-12deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }

  /* Adjust shadow size during jump/crouch */
  .shadow.acting {
    animation: shadow-size 2.8s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
  }

  @keyframes shadow-size {
    0% {
      transform: scale(1);
      opacity: 0.3;
    }
    15% {
      transform: scale(1.1);
      opacity: 0.4;
    }
    30% {
      transform: scale(1.1);
      opacity: 0.4;
    }
    50% {
      transform: scale(0.7);
      opacity: 0.1;
    }
    75% {
      transform: scale(0.7);
      opacity: 0.1;
    }
    100% {
      transform: scale(1);
      opacity: 0.3;
    }
  }

  /* =================================== */
  /* Backflip Animation (Global & Legs)  */
  /* =================================== */

  .spot-robot.action-backflip {
    /* Global spin container */
    animation: backflip-global 3.5s cubic-bezier(0.3, 0.1, 0.1, 0.9) forwards;
    transform-origin: 50% 50%;
  }

  @keyframes backflip-global {
    0% {
      transform: translateY(0) rotate(0deg);
    }
    10% {
      transform: translateY(40px) rotate(5deg);
    } /* Wind up */
    20% {
      transform: translateY(-300px) rotate(-180deg);
    } /* Ascent and mid-flip */
    30% {
      transform: translateY(-400px) rotate(-360deg);
    } /* Full flip in air */
    40% {
      transform: translateY(-400px) rotate(-360deg);
    } /* Hang time */
    60% {
      transform: translateY(20px) rotate(-360deg);
    } /* Landing impact */
    80% {
      transform: translateY(10px) rotate(-360deg);
    } /* Bounce */
    100% {
      transform: translateY(0) rotate(-360deg);
    } /* Settle */
  }

  /* Tuck legs during backflip */
  .spot-robot.action-backflip .fore-right,
  .spot-robot.action-backflip .fore-left {
    animation: backflip-tuck-fore 3.5s forwards;
  }
  .spot-robot.action-backflip .hind-right,
  .spot-robot.action-backflip .hind-left {
    animation: backflip-tuck-hind 3.5s forwards;
  }

  @keyframes backflip-tuck-fore {
    0% {
      transform: rotate(0deg);
    }
    10% {
      transform: rotate(-30deg);
    } /* Crouched launch */
    20%,
    40% {
      transform: rotate(50deg);
    } /* Tucked in air */
    55%,
    65% {
      transform: rotate(-20deg);
    } /* Brace for landing */
    100% {
      transform: rotate(0deg);
    }
  }

  @keyframes backflip-tuck-hind {
    0% {
      transform: rotate(0deg);
    }
    10% {
      transform: rotate(45deg);
    } /* Crouched launch */
    20%,
    40% {
      transform: rotate(-60deg);
    } /* Tucked in air */
    55%,
    65% {
      transform: rotate(30deg);
    } /* Brace for landing */
    100% {
      transform: rotate(0deg);
    }
  }

  /* Wrapper to allow 3D Y-axis spinning to face mouse */
  .robot-wrapper {
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
  }
</style>
