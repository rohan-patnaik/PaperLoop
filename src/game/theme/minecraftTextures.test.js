import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  applyMinecraftTextureSettings,
  clearMinecraftTextureCache,
  loadMinecraftTexture
} from './minecraftTextures.js';

describe('minecraftTextures', () => {
  beforeEach(() => {
    clearMinecraftTextureCache();
  });

  it('applies nearest filtering, wrapping, and color space', () => {
    const texture = new THREE.Texture();
    applyMinecraftTextureSettings(texture, { repeat: [4, 2], srgb: true });

    expect(texture.magFilter).toBe(THREE.NearestFilter);
    expect(texture.minFilter).toBe(THREE.NearestMipmapNearestFilter);
    expect(texture.wrapS).toBe(THREE.RepeatWrapping);
    expect(texture.wrapT).toBe(THREE.RepeatWrapping);
    expect(texture.repeat.x).toBe(4);
    expect(texture.repeat.y).toBe(2);
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it('creates a usable texture for known keys', () => {
    const texture = loadMinecraftTexture('grass_top', { repeat: [3, 1] });
    expect(texture).toBeTruthy();
    expect(texture.repeat.x).toBe(3);
    expect(texture.repeat.y).toBe(1);
    expect(texture.magFilter).toBe(THREE.NearestFilter);
  });
});
