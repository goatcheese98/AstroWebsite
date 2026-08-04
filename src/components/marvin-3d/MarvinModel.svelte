<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { onMount } from "svelte";
  import {
    Group,
    MathUtils,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Vector3,
  } from "three";
  import {
    MARVIN_3D_GRAPPLE_DURATION,
    getMarvin3DActionPose,
    getMarvin3DGrapplePose,
    type Marvin3DAction,
    type Marvin3DGrapplePhase,
    type Marvin3DPose,
  } from "../../lib/marvin-3d-motion";

  const ACTION_DURATION = 2.25;
  const cableAnchor = new Vector3(3.5, 4.65, 0.15);
  const handPosition = new Vector3();
  const cableMiddle = new Vector3();
  const cableDirection = new Vector3();
  const cableCenter = new Vector3();
  const upAxis = new Vector3(0, 1, 0);

  const shellMaterial = new MeshStandardMaterial({ color: 0xf0a51f, roughness: 0.42, metalness: 0.62 });
  const shellLightMaterial = new MeshStandardMaterial({ color: 0xffc84f, roughness: 0.34, metalness: 0.52 });
  const graphiteMaterial = new MeshStandardMaterial({ color: 0x1d252d, roughness: 0.5, metalness: 0.78 });
  const jointMaterial = new MeshStandardMaterial({ color: 0x52616c, roughness: 0.38, metalness: 0.9 });
  const trimMaterial = new MeshStandardMaterial({ color: 0xb8c0c2, roughness: 0.28, metalness: 0.92 });
  const lensMaterial = new MeshStandardMaterial({
    color: 0x9eefff,
    emissive: 0x38ccec,
    emissiveIntensity: 2.6,
    roughness: 0.18,
    metalness: 0.18,
  });
  const screenMaterial = new MeshStandardMaterial({
    color: 0x183842,
    emissive: 0x44cbe7,
    emissiveIntensity: 1.45,
    roughness: 0.25,
    metalness: 0.3,
  });
  const cableMeshMaterial = new MeshBasicMaterial({
    color: 0xffd36a,
    depthTest: false,
    toneMapped: false,
  });

  let {
    action,
    actionToken,
    reducedMotion,
    pointerX,
    pointerY,
    onReady,
    onPhaseChange,
  }: {
    action: Marvin3DAction;
    actionToken: number;
    reducedMotion: boolean;
    pointerX: number;
    pointerY: number;
    onReady: () => void;
    onPhaseChange: (phase: Marvin3DGrapplePhase) => void;
  } = $props();

  let root = $state<Group>();
  let head = $state<Group>();
  let leftShoulder = $state<Group>();
  let rightShoulder = $state<Group>();
  let leftElbow = $state<Group>();
  let rightElbow = $state<Group>();
  let rightHand = $state<Group>();
  let leftHip = $state<Group>();
  let rightHip = $state<Group>();
  let leftKnee = $state<Group>();
  let rightKnee = $state<Group>();
  let cableGroup = $state<Group>();
  let cableUpper = $state<Mesh>();
  let cableLower = $state<Mesh>();

  let entranceElapsed = 0;
  let actionElapsed = 0;
  let lastActionToken = 0;
  let lastPhase: Marvin3DGrapplePhase | null = null;
  let introComplete = $state(false);
  let activeAction = $state(false);
  let rigReady = $state(false);
  let pageVisible = $state(true);

  onMount(() => {
    const updateVisibility = () => (pageVisible = !document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  });

  function announcePhase(phase: Marvin3DGrapplePhase) {
    if (phase === lastPhase) return;
    lastPhase = phase;
    onPhaseChange(phase);
  }

  function alignCableSegment(segment: Mesh, start: Vector3, end: Vector3) {
    cableDirection.copy(end).sub(start);
    const length = cableDirection.length();
    cableCenter.copy(start).add(end).multiplyScalar(0.5);
    segment.position.copy(cableCenter);
    segment.scale.set(1, length, 1);
    segment.quaternion.setFromUnitVectors(upAxis, cableDirection.normalize());
  }

  function updateCable(visible: boolean, tension: number) {
    if (!cableGroup || !cableUpper || !cableLower || !rightHand || !root) return;
    cableGroup.visible = visible;
    if (!visible) return;

    root.updateMatrixWorld(true);
    rightHand.getWorldPosition(handPosition);
    cableMiddle.copy(cableAnchor).lerp(handPosition, 0.52);
    cableMiddle.y -= MathUtils.lerp(0.58, 0.06, tension);
    alignCableSegment(cableUpper, cableAnchor, cableMiddle);
    alignCableSegment(cableLower, cableMiddle, handPosition);
  }

  function applyPose(pose: Marvin3DPose, cableVisible = false, cableTension = 0) {
    if (
      !rigReady || !root || !head || !leftShoulder || !rightShoulder || !leftElbow ||
      !rightElbow || !leftHip || !rightHip || !leftKnee || !rightKnee
    ) return;

    root.position.set(pose.root.x, pose.root.y - 0.12, pose.root.z);
    root.rotation.set(0, pose.root.rotationY, pose.root.rotationZ);
    leftShoulder.rotation.z = pose.leftShoulderZ;
    rightShoulder.rotation.z = pose.rightShoulderZ;
    leftElbow.rotation.z = pose.leftElbowZ;
    rightElbow.rotation.z = pose.rightElbowZ;
    leftHip.rotation.z = pose.leftHipZ;
    rightHip.rotation.z = pose.rightHipZ;
    leftKnee.rotation.x = pose.kneeBend;
    rightKnee.rotation.x = pose.kneeBend;
    head.rotation.z = pose.headTiltZ;
    head.rotation.y = pointerX * 0.2;
    head.rotation.x = pointerY * 0.08;
    updateCable(cableVisible, cableTension);
  }

  $effect(() => {
    if (
      root && head && leftShoulder && rightShoulder && leftElbow && rightElbow && rightHand &&
      leftHip && rightHip && leftKnee && rightKnee && cableGroup && cableUpper && cableLower && !rigReady
    ) {
      rigReady = true;
      const pose = getMarvin3DGrapplePose(reducedMotion ? MARVIN_3D_GRAPPLE_DURATION : 0, reducedMotion);
      applyPose(pose, pose.cableVisible, pose.cableTension);
      if (reducedMotion) {
        introComplete = true;
        announcePhase("online");
      }
      onReady();
    }
  });

  $effect(() => {
    if (!rigReady || actionToken === lastActionToken || !introComplete) return;
    lastActionToken = actionToken;
    actionElapsed = 0;
    activeAction = action !== "idle" && !reducedMotion;
    if (reducedMotion) applyPose(getMarvin3DActionPose(action, 1));
  });

  $effect(() => {
    if (!rigReady || !reducedMotion) return;
    entranceElapsed = MARVIN_3D_GRAPPLE_DURATION;
    introComplete = true;
    activeAction = false;
    announcePhase("online");
    applyPose(getMarvin3DGrapplePose(MARVIN_3D_GRAPPLE_DURATION, true));
  });

  $effect(() => {
    if (!rigReady || !introComplete || activeAction) return;
    const idle = getMarvin3DActionPose("idle", 0);
    applyPose(idle);
  });

  useTask(
    (delta) => {
      if (!rigReady || document.hidden) return;

      if (!introComplete) {
        entranceElapsed = Math.min(entranceElapsed + delta, MARVIN_3D_GRAPPLE_DURATION);
        const pose = getMarvin3DGrapplePose(entranceElapsed, reducedMotion);
        announcePhase(pose.phase);
        applyPose(pose, pose.cableVisible, pose.cableTension);
        if (pose.phase === "online") {
          introComplete = true;
          activeAction = false;
        }
        return;
      }

      if (activeAction) {
        actionElapsed = Math.min(actionElapsed + delta, ACTION_DURATION);
        applyPose(getMarvin3DActionPose(action, actionElapsed / ACTION_DURATION));
        if (actionElapsed >= ACTION_DURATION) {
          activeAction = false;
          applyPose(getMarvin3DActionPose("idle", 0));
        }
      }
    },
    {
      running: () => pageVisible && !reducedMotion && (!introComplete || activeAction),
      autoInvalidate: true,
    },
  );
</script>

<T.Group bind:ref={cableGroup} renderOrder={12}>
  <T.Mesh bind:ref={cableUpper} frustumCulled={false} material={cableMeshMaterial}>
    <T.CylinderGeometry args={[0.025, 0.025, 1, 8]} />
  </T.Mesh>
  <T.Mesh bind:ref={cableLower} frustumCulled={false} material={cableMeshMaterial}>
    <T.CylinderGeometry args={[0.025, 0.025, 1, 8]} />
  </T.Mesh>
</T.Group>

<T.Group bind:ref={root}>
  <!-- Pelvis and compact counterweight -->
  <T.Mesh position={[0, 0.2, 0]} scale={[0.92, 0.4, 0.56]} castShadow material={graphiteMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>
  <T.Mesh position={[0, 0.16, 0.52]} scale={[0.6, 0.24, 0.12]} castShadow material={shellMaterial}>
    <T.BoxGeometry args={[1, 1, 1]} />
  </T.Mesh>
  <T.Mesh position={[0, 0.55, 0]} castShadow material={jointMaterial}>
    <T.CylinderGeometry args={[0.34, 0.28, 0.72, 16]} />
  </T.Mesh>
  {#each [-1, 1] as side}
    <T.Mesh position={[side * 0.52, 0.64, 0.08]} rotation={[0, 0, side * 0.13]} castShadow material={trimMaterial}>
      <T.CylinderGeometry args={[0.055, 0.07, 0.72, 10]} />
    </T.Mesh>
  {/each}

  <!-- Torso frame -->
  <T.Group position={[0, 1.55, 0]}>
    <T.Mesh position={[0, 0, -0.58]} scale={[0.78, 0.94, 0.28]} castShadow material={graphiteMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    {#each [-1, 1] as side}
      <T.Mesh position={[side * 0.54, 0, -0.7]} castShadow material={jointMaterial}>
        <T.CylinderGeometry args={[0.15, 0.15, 0.95, 12]} />
      </T.Mesh>
    {/each}
    <T.Mesh scale={[1.15, 1.22, 0.55]} castShadow material={graphiteMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    <T.Mesh position={[0, 0.02, 0.52]} scale={[0.93, 0.92, 0.14]} castShadow material={shellMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    <T.Mesh position={[0, 0.05, 0.68]} scale={[0.6, 0.48, 0.08]} material={screenMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    <T.Mesh position={[0, 0.05, 0.77]} scale={[0.39, 0.025, 0.02]} material={lensMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    <T.Mesh position={[0, -0.14, 0.77]} scale={[0.22, 0.025, 0.02]} material={lensMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>

    <!-- Chest ribs and exposed fasteners -->
    {#each [-1, 1] as side}
      <T.Mesh position={[side * 1.02, 0.08, 0.05]} scale={[0.16, 0.92, 0.64]} castShadow material={shellLightMaterial}>
        <T.BoxGeometry args={[1, 1, 1]} />
      </T.Mesh>
      <T.Mesh position={[side * 0.95, 0.63, 0.55]} material={trimMaterial}>
        <T.CylinderGeometry args={[0.08, 0.08, 0.08, 12]} />
      </T.Mesh>
      <T.Mesh position={[side * 0.95, -0.55, 0.55]} material={trimMaterial}>
        <T.CylinderGeometry args={[0.08, 0.08, 0.08, 12]} />
      </T.Mesh>
    {/each}
    <T.Mesh position={[0, 0.72, 0.05]} scale={[0.76, 0.16, 0.61]} castShadow material={shellLightMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    {#each [-0.24, 0, 0.24] as ventX}
      <T.Mesh position={[ventX, 0.73, 0.68]} rotation={[0, 0, -0.32]} scale={[0.1, 0.035, 0.025]} material={graphiteMaterial}>
        <T.BoxGeometry args={[1, 1, 1]} />
      </T.Mesh>
    {/each}
    <T.Mesh position={[0, -0.72, 0.04]} scale={[0.74, 0.14, 0.6]} castShadow material={jointMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
  </T.Group>

  <!-- Head, lens assembly, and antenna -->
  <T.Group bind:ref={head} position={[0, 3.25, 0]}>
    <T.Mesh scale={[0.92, 0.72, 0.66]} castShadow material={shellMaterial}>
      <T.SphereGeometry args={[1, 28, 18]} />
    </T.Mesh>
    <T.Mesh position={[0, -0.05, 0.61]} rotation={[Math.PI / 2, 0, 0]} castShadow material={graphiteMaterial}>
      <T.CylinderGeometry args={[0.52, 0.57, 0.2, 24]} />
    </T.Mesh>
    <T.Mesh position={[0, -0.05, 0.76]} material={trimMaterial}>
      <T.TorusGeometry args={[0.35, 0.09, 12, 32]} />
    </T.Mesh>
    <T.Mesh position={[0, -0.05, 0.79]} scale={[0.29, 0.29, 0.14]} material={lensMaterial}>
      <T.SphereGeometry args={[1, 24, 16]} />
    </T.Mesh>
    <T.Mesh position={[-0.46, 0.44, 0.37]} rotation={[0.15, 0, -0.3]} scale={[0.26, 0.11, 0.12]} material={shellLightMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    <T.Mesh position={[0.42, 0.43, 0.38]} rotation={[0.15, 0, 0.28]} scale={[0.22, 0.1, 0.12]} material={shellLightMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    {#each [-1, 1] as side}
      <T.Mesh position={[side * 0.82, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow material={jointMaterial}>
        <T.CylinderGeometry args={[0.18, 0.18, 0.18, 16]} />
      </T.Mesh>
      <T.Mesh position={[side * 0.92, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={shellLightMaterial}>
        <T.CylinderGeometry args={[0.11, 0.11, 0.08, 16]} />
      </T.Mesh>
    {/each}
    <T.Mesh position={[0.42, 0.95, 0]} rotation={[0, 0, -0.12]} material={jointMaterial}>
      <T.CylinderGeometry args={[0.045, 0.055, 0.55, 10]} />
    </T.Mesh>
    <T.Mesh position={[0.46, 1.24, 0]} material={lensMaterial}>
      <T.SphereGeometry args={[0.09, 12, 8]} />
    </T.Mesh>
  </T.Group>

  <T.Mesh position={[0, 2.65, 0]} material={jointMaterial}>
    <T.CylinderGeometry args={[0.28, 0.32, 0.45, 16]} />
  </T.Mesh>

  <!-- Left arm -->
  <T.Group bind:ref={leftShoulder} position={[-1.3, 2.38, 0]}>
    <T.Mesh castShadow material={jointMaterial}><T.SphereGeometry args={[0.34, 16, 12]} /></T.Mesh>
    <T.Mesh position={[-0.16, 0.04, 0.04]} scale={[0.24, 0.3, 0.28]} castShadow material={shellLightMaterial}>
      <T.SphereGeometry args={[1, 14, 10]} />
    </T.Mesh>
    <T.Mesh position={[0, -0.55, 0]} castShadow material={shellMaterial}>
      <T.CylinderGeometry args={[0.23, 0.28, 1.05, 12]} />
    </T.Mesh>
    <T.Mesh position={[0, -0.32, 0.22]} scale={[0.33, 0.52, 0.12]} material={shellLightMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    <T.Mesh position={[-0.21, -0.55, 0.16]} material={trimMaterial}>
      <T.CylinderGeometry args={[0.045, 0.055, 0.78, 8]} />
    </T.Mesh>
    <T.Group bind:ref={leftElbow} position={[0, -1.08, 0]}>
      <T.Mesh castShadow material={jointMaterial}><T.SphereGeometry args={[0.25, 14, 10]} /></T.Mesh>
      <T.Mesh position={[0, -0.48, 0]} castShadow material={jointMaterial}>
        <T.CylinderGeometry args={[0.17, 0.22, 0.88, 12]} />
      </T.Mesh>
      <T.Mesh position={[0, -0.92, 0.08]} scale={[0.34, 0.3, 0.27]} castShadow material={shellMaterial}>
        <T.BoxGeometry args={[1, 1, 1]} />
      </T.Mesh>
      {#each [-0.12, 0, 0.12] as fingerX}
        <T.Mesh position={[fingerX, -1.12, 0.1]} material={jointMaterial}>
          <T.CylinderGeometry args={[0.035, 0.045, 0.28, 8]} />
        </T.Mesh>
      {/each}
    </T.Group>
  </T.Group>

  <!-- Right arm and grapple spool -->
  <T.Group bind:ref={rightShoulder} position={[1.3, 2.38, 0]}>
    <T.Mesh castShadow material={jointMaterial}><T.SphereGeometry args={[0.34, 16, 12]} /></T.Mesh>
    <T.Mesh position={[0.16, 0.04, 0.04]} scale={[0.24, 0.3, 0.28]} castShadow material={shellLightMaterial}>
      <T.SphereGeometry args={[1, 14, 10]} />
    </T.Mesh>
    <T.Mesh position={[0, -0.55, 0]} castShadow material={shellMaterial}>
      <T.CylinderGeometry args={[0.23, 0.28, 1.05, 12]} />
    </T.Mesh>
    <T.Mesh position={[0, -0.32, 0.22]} scale={[0.33, 0.52, 0.12]} material={shellLightMaterial}>
      <T.BoxGeometry args={[1, 1, 1]} />
    </T.Mesh>
    <T.Mesh position={[0.21, -0.55, 0.16]} material={trimMaterial}>
      <T.CylinderGeometry args={[0.045, 0.055, 0.78, 8]} />
    </T.Mesh>
    <T.Group bind:ref={rightElbow} position={[0, -1.08, 0]}>
      <T.Mesh castShadow material={jointMaterial}><T.SphereGeometry args={[0.25, 14, 10]} /></T.Mesh>
      <T.Mesh position={[0, -0.48, 0]} castShadow material={jointMaterial}>
        <T.CylinderGeometry args={[0.19, 0.23, 0.88, 12]} />
      </T.Mesh>
      <T.Mesh position={[0.21, -0.44, 0]} rotation={[Math.PI / 2, 0, 0]} material={shellLightMaterial}>
        <T.TorusGeometry args={[0.2, 0.075, 10, 20]} />
      </T.Mesh>
      <T.Group bind:ref={rightHand} position={[0, -0.94, 0.08]}>
        <T.Mesh scale={[0.36, 0.31, 0.28]} castShadow material={shellMaterial}>
          <T.BoxGeometry args={[1, 1, 1]} />
        </T.Mesh>
        <T.Mesh position={[0, -0.28, 0.04]} material={graphiteMaterial}>
          <T.ConeGeometry args={[0.14, 0.42, 10]} />
        </T.Mesh>
      </T.Group>
    </T.Group>
  </T.Group>

  <!-- Left leg -->
  <T.Group bind:ref={leftHip} position={[-0.55, 0.05, 0]}>
    <T.Mesh castShadow material={jointMaterial}><T.SphereGeometry args={[0.3, 14, 10]} /></T.Mesh>
    <T.Mesh position={[0, -0.58, 0]} castShadow material={shellMaterial}>
      <T.CylinderGeometry args={[0.24, 0.3, 1.1, 12]} />
    </T.Mesh>
    <T.Mesh position={[-0.22, -0.58, 0.16]} material={trimMaterial}>
      <T.CylinderGeometry args={[0.05, 0.065, 0.82, 8]} />
    </T.Mesh>
    <T.Group bind:ref={leftKnee} position={[0, -1.12, 0]}>
      <T.Mesh castShadow material={jointMaterial}><T.SphereGeometry args={[0.27, 14, 10]} /></T.Mesh>
      <T.Mesh position={[0, -0.49, 0]} castShadow material={jointMaterial}>
        <T.CylinderGeometry args={[0.18, 0.23, 0.88, 12]} />
      </T.Mesh>
      <T.Mesh position={[-0.2, -0.48, 0.18]} material={trimMaterial}>
        <T.CylinderGeometry args={[0.045, 0.055, 0.66, 8]} />
      </T.Mesh>
      <T.Mesh position={[0, -0.97, 0.18]} scale={[0.55, 0.28, 0.85]} castShadow material={shellLightMaterial}>
        <T.BoxGeometry args={[1, 1, 1]} />
      </T.Mesh>
      <T.Mesh position={[0, -0.97, 0.64]} scale={[0.58, 0.19, 0.14]} castShadow material={graphiteMaterial}>
        <T.BoxGeometry args={[1, 1, 1]} />
      </T.Mesh>
    </T.Group>
  </T.Group>

  <!-- Right leg -->
  <T.Group bind:ref={rightHip} position={[0.55, 0.05, 0]}>
    <T.Mesh castShadow material={jointMaterial}><T.SphereGeometry args={[0.3, 14, 10]} /></T.Mesh>
    <T.Mesh position={[0, -0.58, 0]} castShadow material={shellMaterial}>
      <T.CylinderGeometry args={[0.24, 0.3, 1.1, 12]} />
    </T.Mesh>
    <T.Mesh position={[0.22, -0.58, 0.16]} material={trimMaterial}>
      <T.CylinderGeometry args={[0.05, 0.065, 0.82, 8]} />
    </T.Mesh>
    <T.Group bind:ref={rightKnee} position={[0, -1.12, 0]}>
      <T.Mesh castShadow material={jointMaterial}><T.SphereGeometry args={[0.27, 14, 10]} /></T.Mesh>
      <T.Mesh position={[0, -0.49, 0]} castShadow material={jointMaterial}>
        <T.CylinderGeometry args={[0.18, 0.23, 0.88, 12]} />
      </T.Mesh>
      <T.Mesh position={[0.2, -0.48, 0.18]} material={trimMaterial}>
        <T.CylinderGeometry args={[0.045, 0.055, 0.66, 8]} />
      </T.Mesh>
      <T.Mesh position={[0, -0.97, 0.18]} scale={[0.55, 0.28, 0.85]} castShadow material={shellLightMaterial}>
        <T.BoxGeometry args={[1, 1, 1]} />
      </T.Mesh>
      <T.Mesh position={[0, -0.97, 0.64]} scale={[0.58, 0.19, 0.14]} castShadow material={graphiteMaterial}>
        <T.BoxGeometry args={[1, 1, 1]} />
      </T.Mesh>
    </T.Group>
  </T.Group>
</T.Group>
