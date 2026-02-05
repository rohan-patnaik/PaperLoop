import * as THREE from 'three';
import { loadMinecraftTexture } from './minecraftTextures.js';

let cachedMaterialMap = null;

const createTexturedMaterial = (
  textureKey,
  { repeat = [1, 1], roughness = 0.95, metalness = 0, emissive = null } = {}
) => {
  const map = loadMinecraftTexture(textureKey, { repeat, srgb: true });
  const material = new THREE.MeshStandardMaterial({
    map,
    roughness,
    metalness
  });
  if (emissive) {
    material.emissive = new THREE.Color(emissive);
    material.emissiveIntensity = 0.2;
  }
  return material;
};

export const createMinecraftMaterialMap = () => ({
  grass: createTexturedMaterial('grass_top', {
    repeat: [56, 56],
    roughness: 1
  }),
  dirt: createTexturedMaterial('dirt', {
    repeat: [24, 24],
    roughness: 1
  }),
  stone: createTexturedMaterial('stone', {
    repeat: [18, 18],
    roughness: 1
  }),
  leaves: createTexturedMaterial('leaves', {
    repeat: [6, 6],
    roughness: 0.96
  }),
  wood: createTexturedMaterial('wood_planks', {
    repeat: [3, 3],
    roughness: 0.95
  }),
  roadDark: createTexturedMaterial('road_dark', {
    repeat: [28, 8],
    roughness: 0.92
  }),
  roadLine: createTexturedMaterial('road_line', {
    repeat: [3, 1],
    roughness: 0.88
  }),
  sign: createTexturedMaterial('sign_oak', {
    repeat: [2, 1],
    roughness: 0.9
  }),
  carBody: createTexturedMaterial('car_red', {
    repeat: [2, 2],
    roughness: 0.75,
    metalness: 0.05
  }),
  carGlass: createTexturedMaterial('car_glass', {
    repeat: [1, 1],
    roughness: 0.45,
    metalness: 0.08
  }),
  wheel: createTexturedMaterial('coal_block', {
    repeat: [2, 2],
    roughness: 0.95,
    metalness: 0.05
  }),
  coal: createTexturedMaterial('coal_block', {
    repeat: [1, 1],
    roughness: 0.95,
    metalness: 0.05
  }),
  centerPlaque: createTexturedMaterial('sign_oak', {
    repeat: [3, 3],
    roughness: 0.9
  }),
  curb: createTexturedMaterial('stone', {
    repeat: [2, 2],
    roughness: 0.92
  }),
  breakParticle: createTexturedMaterial('stone', {
    repeat: [1, 1],
    roughness: 0.85
  })
});

export const getMinecraftMaterialMap = () => {
  if (!cachedMaterialMap) {
    cachedMaterialMap = createMinecraftMaterialMap();
  }
  return cachedMaterialMap;
};

export const resetMinecraftMaterialMap = () => {
  cachedMaterialMap = null;
};
