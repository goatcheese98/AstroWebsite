import {
  CanvasTexture,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
} from "three";

// Palette is lifted from the 2D MarvinBot SVG (slate shell, amber optic, cream
// screen) so the 3D figure reads as the same character, not a new one.

export const shellMaterial = new MeshPhysicalMaterial({
  color: 0xe4eaf1,
  roughness: 0.38,
  metalness: 0.04,
  clearcoat: 0.55,
  clearcoatRoughness: 0.34,
});

export const shellBrightMaterial = new MeshPhysicalMaterial({
  color: 0xf2f5f9,
  roughness: 0.32,
  metalness: 0.03,
  clearcoat: 0.6,
  clearcoatRoughness: 0.3,
});

export const frameMaterial = new MeshStandardMaterial({
  color: 0x475569,
  roughness: 0.52,
  metalness: 0.42,
});

export const graphiteMaterial = new MeshStandardMaterial({
  color: 0x27313f,
  roughness: 0.44,
  metalness: 0.52,
});

export const jointMaterial = new MeshStandardMaterial({
  color: 0x94a3b8,
  roughness: 0.3,
  metalness: 0.85,
});

export const accentOrangeMaterial = new MeshStandardMaterial({
  color: 0xf97316,
  roughness: 0.42,
  metalness: 0.18,
});

export const amberRingMaterial = new MeshStandardMaterial({
  color: 0xd97706,
  emissive: 0xb45309,
  emissiveIntensity: 0.6,
  roughness: 0.32,
  metalness: 0.35,
});

export const lensMaterial = new MeshPhysicalMaterial({
  color: 0x1e293b,
  roughness: 0.12,
  metalness: 0.1,
  clearcoat: 1,
  clearcoatRoughness: 0.08,
});

export const irisMaterial = new MeshStandardMaterial({
  color: 0xf59e0b,
  emissive: 0xf59e0b,
  emissiveIntensity: 1.9,
  roughness: 0.3,
});

export const glintMaterial = new MeshBasicMaterial({ color: 0xffffff, toneMapped: false });

export const screenMaterial = new MeshStandardMaterial({
  color: 0xfef3c7,
  emissive: 0xfde68a,
  emissiveIntensity: 0.38,
  roughness: 0.3,
  metalness: 0,
});

export const inkMaterial = new MeshBasicMaterial({ color: 0x475569, toneMapped: false });

export const indicatorGreenMaterial = new MeshBasicMaterial({ color: 0x22c55e, toneMapped: false });
export const indicatorBlueMaterial = new MeshBasicMaterial({ color: 0x3b82f6, toneMapped: false });
export const indicatorAmberMaterial = new MeshBasicMaterial({ color: 0xf59e0b, toneMapped: false });

export const antennaTipMaterial = new MeshStandardMaterial({
  color: 0xf59e0b,
  emissive: 0xf59e0b,
  emissiveIntensity: 1.4,
  roughness: 0.35,
});

export const grappleCableMaterial = new MeshStandardMaterial({
  color: 0x64748b,
  roughness: 0.6,
  metalness: 0.3,
});

// Painted-on service tag. Browser-only (canvas): call from client-side code.
export function createMarvinTagMaterial(): MeshBasicMaterial {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#475569";
  context.font = "700 52px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.textBaseline = "top";
  context.fillText("MRVN", 20, 34);
  context.fillText("RJ/01", 20, 100);
  context.fillStyle = "#f59e0b";
  context.fillRect(20, 178, 128, 12);
  context.fillRect(164, 178, 26, 12);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return new MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false });
}
