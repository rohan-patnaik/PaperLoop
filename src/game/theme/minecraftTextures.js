import * as THREE from 'three';

export const MINECRAFT_TEXTURE_FILES = Object.freeze({
  grass_top: 'grass_top.svg',
  grass_side: 'grass_side.svg',
  dirt: 'dirt.svg',
  stone: 'stone.svg',
  leaves: 'leaves.svg',
  wood_planks: 'wood_planks.svg',
  road_dark: 'road_dark.svg',
  road_line: 'road_line.svg',
  sign_oak: 'sign_oak.svg',
  car_red: 'car_red.svg',
  car_glass: 'car_glass.svg',
  coal_block: 'coal_block.svg'
});

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();
const textureRoot = '/assets/minecraft-pack';

const hasLoaderSupport = () => {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return false;
  }
  return !window.happyDOM;
};

const paletteFor = (key) => {
  switch (key) {
    case 'grass_top':
      return ['#62af43', '#7fc55b', '#579b3f', '#8dd26a'];
    case 'grass_side':
      return ['#5a9f3d', '#7ab95a', '#6f4f2a', '#7d5d35'];
    case 'dirt':
      return ['#6d4b2b', '#7e5833', '#5f4124', '#8d6339'];
    case 'stone':
      return ['#7f8488', '#9aa0a6', '#70767b', '#8a8f94'];
    case 'leaves':
      return ['#356c35', '#4f8b49', '#2f5e2e', '#5f9b57'];
    case 'wood_planks':
      return ['#9a7447', '#b1844f', '#88653f', '#c0935f'];
    case 'road_dark':
      return ['#232323', '#2b2b2b', '#1d1d1d', '#333333'];
    case 'road_line':
      return ['#ece3bf', '#f7efca', '#d8cfab', '#fff8d9'];
    case 'sign_oak':
      return ['#c79b63', '#d5a972', '#b48856', '#e0b780'];
    case 'car_red':
      return ['#af3e2f', '#c84a38', '#923226', '#d65b47'];
    case 'car_glass':
      return ['#7da0bb', '#9dc0dd', '#678ba7', '#b0d0e7'];
    case 'coal_block':
      return ['#161616', '#232323', '#0f0f0f', '#2d2d2d'];
    default:
      return ['#999999', '#777777', '#555555', '#aaaaaa'];
  }
};

const fallbackTexture = (key) => {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  const palette = paletteFor(key);

  if (ctx) {
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        const index = (x + y + Math.floor(Math.random() * 2)) % palette.length;
        ctx.fillStyle = palette[index];
        ctx.fillRect(x * 4, y * 4, 4, 4);
      }
    }
  }

  return new THREE.CanvasTexture(canvas);
};

export const applyMinecraftTextureSettings = (
  texture,
  { repeat = [1, 1], srgb = true } = {}
) => {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.generateMipmaps = true;
  texture.repeat.set(repeat[0], repeat[1]);
  if (srgb) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  texture.needsUpdate = true;
  return texture;
};

export const loadMinecraftTexture = (
  key,
  { repeat = [1, 1], srgb = true } = {}
) => {
  const repeatKey = Array.isArray(repeat) ? repeat.join('x') : '1x1';
  const cacheKey = `${key}|${repeatKey}|${srgb ? 'srgb' : 'linear'}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  let texture;
  const filename = MINECRAFT_TEXTURE_FILES[key];
  if (filename && hasLoaderSupport()) {
    texture = textureLoader.load(`${textureRoot}/${filename}`);
  } else {
    texture = fallbackTexture(key);
  }

  applyMinecraftTextureSettings(texture, { repeat, srgb });
  textureCache.set(cacheKey, texture);
  return texture;
};

export const clearMinecraftTextureCache = () => {
  textureCache.clear();
};
