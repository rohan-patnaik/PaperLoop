import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  getMinecraftMaterialMap,
  resetMinecraftMaterialMap
} from './minecraftMaterials.js';

describe('minecraftMaterials', () => {
  beforeEach(() => {
    resetMinecraftMaterialMap();
  });

  it('returns a complete semantic material map', () => {
    const materials = getMinecraftMaterialMap();
    const expectedKeys = [
      'grass',
      'dirt',
      'stone',
      'leaves',
      'wood',
      'roadDark',
      'roadLine',
      'sign',
      'carBody',
      'carGlass',
      'wheel',
      'coal',
      'centerPlaque',
      'curb',
      'breakParticle'
    ];

    expectedKeys.forEach((key) => {
      expect(materials[key]).toBeTruthy();
      expect(materials[key]).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(materials[key].map).toBeTruthy();
    });
  });

  it('keeps pixel filtering on mapped textures', () => {
    const materials = getMinecraftMaterialMap();
    expect(materials.grass.map.magFilter).toBe(THREE.NearestFilter);
    expect(materials.roadDark.map.magFilter).toBe(THREE.NearestFilter);
    expect(materials.sign.map.magFilter).toBe(THREE.NearestFilter);
  });
});
