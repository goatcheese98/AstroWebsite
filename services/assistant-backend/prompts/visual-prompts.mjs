const BASE_COMPOSITION_RULES = [
  "Generate a single whiteboard-friendly visual asset for composition inside Excalidraw.",
  "MANDATORY composition rules:",
  "- use a square 1:1 composition",
  "- keep subject centered and sized to occupy roughly 70-85% of the frame",
  "- preserve full subject silhouette within frame (no cut-off parts)",
];

const BASE_BACKGROUND_RULES = [
  "MANDATORY background rules:",
  "- solid pure white background (#FFFFFF)",
  "- no checkerboard pattern, no transparency grid, no paper texture",
  "- no crop marks, no corner markers, no framing glyphs",
  "- no background objects, no sky, no room",
  "- no shadow plane, no glow halo, no border frame",
  "- keep the subject isolated and centered with consistent white padding",
];

const BASE_RENDER_RULES = [
  "MANDATORY rendering rules:",
  "- crisp silhouette and edges",
  "- high subject/background separation",
  "- avoid anti-aliased matte/fringe around the subject edges",
  "- avoid decorative microtextures, repetitive ornamental patterns, and noisy filler details",
  "- do not add extra internal motifs unless explicitly asked in the user request",
  "- no watermark, no text overlay unless explicitly requested",
  "- output should read clearly when scaled down on a canvas",
];

function buildSketchStyleHint(style) {
  switch (style) {
    case "hand-drawn":
      return "hand-drawn marker strokes, gentle wobble, human sketch character";
    case "technical":
      return "technical drafting look, straight controlled lines, engineering sketch clarity";
    case "organic":
      return "organic curves, softer irregular lines, natural freeform shapes";
    default:
      return "clean whiteboard illustration style with precise boundaries";
  }
}

function buildSketchComplexityHint(complexity) {
  switch (complexity) {
    case "low":
      return "minimal detail, large simple shapes, low visual density";
    case "high":
      return "high detail, rich structure, many meaningful sub-parts";
    default:
      return "balanced detail with clear hierarchy";
  }
}

function buildColorModeHint(colorMode) {
  return colorMode === "bw"
    ? "black and white only (neutral grayscale)"
    : "full color";
}

export function buildCanvasSafeImagePrompt({ mode, text, sketch, visual, hasReferenceImage }) {
  const colorMode = visual?.colorMode === "bw" ? "bw" : "color";

  const base = [
    ...BASE_COMPOSITION_RULES,
    ...BASE_BACKGROUND_RULES,
    ...BASE_RENDER_RULES,
    `- color mode: ${buildColorModeHint(colorMode)}`,
    `User request: ${text}`,
  ];

  if (mode === "sketch") {
    const style = sketch?.style || "clean";
    const complexity = sketch?.complexity || "medium";
    const colorPalette = Number.isFinite(sketch?.colorPalette)
      ? Math.max(2, Math.min(32, sketch.colorPalette))
      : 16;
    const detailLevel = Number.isFinite(sketch?.detailLevel)
      ? Math.max(0.2, Math.min(1, sketch.detailLevel))
      : 0.75;
    const edgeSensitivity = Number.isFinite(sketch?.edgeSensitivity)
      ? Math.max(1, Math.min(100, sketch.edgeSensitivity))
      : 18;

    base.push("Sketch-specific rules:");
    base.push(`- style: ${buildSketchStyleHint(style)}`);
    base.push(`- complexity: ${buildSketchComplexityHint(complexity)}`);
    base.push(`- color palette target: about ${colorPalette} dominant colors`);
    base.push(`- detail level target: ${detailLevel.toFixed(2)} (0=minimal, 1=very detailed)`);
    base.push(`- edge sensitivity target: ${edgeSensitivity} (favor edge clarity over smooth gradients)`);
    base.push("- strong dark linework for outer and inner contours");
    base.push("- outline strokes must remain clearly visible and continuous");
    base.push("- shapes should be segmentable for later vector conversion");
  } else {
    base.push("Image-specific rules:");
    base.push("- deliver a clean standalone subject for direct canvas placement and later vectorization");
    base.push("- keep empty white margins around the subject");
  }

  if (hasReferenceImage) {
    base.push("Use the provided reference image for composition/content guidance while preserving all white-background constraints.");
  }

  return base.join("\n");
}

export function buildPromptRefinerInput(prompt, mode) {
  return [
    "Rewrite this image generation prompt for maximum fidelity and composability in Excalidraw.",
    "Do not remove hard constraints about the white background and subject isolation.",
    "Output plain prompt text only (no markdown, no bullets prefix decoration).",
    `Mode: ${mode}`,
    "",
    prompt,
  ].join("\n");
}
