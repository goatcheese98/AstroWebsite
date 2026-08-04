import { MeshBasicMaterial, MeshStandardMaterial } from "three";

export const armorMaterial = new MeshStandardMaterial({
  color: 0x526b76,
  roughness: 0.54,
  metalness: 0.68,
});

export const armorLightMaterial = new MeshStandardMaterial({
  color: 0x8fa4a8,
  roughness: 0.5,
  metalness: 0.56,
});

export const graphiteMaterial = new MeshStandardMaterial({
  color: 0x111920,
  roughness: 0.46,
  metalness: 0.82,
});

export const jointMaterial = new MeshStandardMaterial({
  color: 0x34424b,
  roughness: 0.32,
  metalness: 0.94,
});

export const pistonMaterial = new MeshStandardMaterial({
  color: 0xb7c2c2,
  roughness: 0.24,
  metalness: 0.96,
});

export const safetyMaterial = new MeshStandardMaterial({
  color: 0xd6a92f,
  roughness: 0.48,
  metalness: 0.58,
});

export const cableMaterial = new MeshStandardMaterial({
  color: 0xb64b36,
  roughness: 0.62,
  metalness: 0.28,
});

export const opticMaterial = new MeshStandardMaterial({
  color: 0xffc45d,
  emissive: 0xff6d24,
  emissiveIntensity: 3.4,
  roughness: 0.15,
  metalness: 0.2,
});

export const screenMaterial = new MeshStandardMaterial({
  color: 0x183c46,
  emissive: 0x3dc4d7,
  emissiveIntensity: 1.8,
  roughness: 0.2,
  metalness: 0.25,
});

export const screenInkMaterial = new MeshBasicMaterial({
  color: 0xc9fbff,
  toneMapped: false,
});

export const grappleCableMaterial = new MeshBasicMaterial({
  color: 0xe6b94e,
  depthTest: false,
  toneMapped: false,
});
