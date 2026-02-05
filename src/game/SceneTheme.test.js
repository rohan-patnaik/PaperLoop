import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SceneManager, getSceneMinecraftSanity } from './Scene.js';
import { getMinecraftMaterialMap } from './theme/minecraftMaterials.js';

const createSceneStub = () => {
  const manager = Object.create(SceneManager.prototype);
  manager.scene = new THREE.Scene();
  manager.track = {
    radiusX: 26,
    radiusZ: 18,
    roadWidth: 5
  };
  manager.materials = getMinecraftMaterialMap();
  manager._trackScale = manager.track.radiusZ / manager.track.radiusX;
  manager._carCollisionRadius = 1.25;
  manager.destructibles = [];
  manager.fragmentBursts = [];
  manager._fragmentGeometry = new THREE.BoxGeometry(1, 1, 1);
  manager._fragmentTemp = new THREE.Object3D();
  return manager;
};

describe('Scene Minecraft theme', () => {
  it('exposes a valid spawn sanity payload', () => {
    const sanity = getSceneMinecraftSanity();
    expect(sanity.totalDestructibles).toBeGreaterThan(0);
    expect(sanity.hasAnimalSet).toBe(true);
  });

  it('adds center label plaque to scene', () => {
    const manager = createSceneStub();
    manager.addCenterLabel();
    const center = manager.scene.children.find(
      (child) => child.name === 'paper-loop-center'
    );
    expect(center).toBeTruthy();
  });

  it('populates destructibles and triggers disintegration on collision', () => {
    const manager = createSceneStub();
    manager.addDecorations();
    expect(manager.destructibles.length).toBeGreaterThan(100);

    const target = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      manager.materials.stone
    );
    target.position.set(0, 0, 0);
    manager.scene.add(target);
    manager.registerDestructible(target, 1);

    const before = manager.fragmentBursts.length;
    manager.handleDestructibleCollisions(new THREE.Vector3(0, 0, 0));
    expect(manager.fragmentBursts.length).toBe(before + 1);
    expect(manager.destructibles[manager.destructibles.length - 1].active).toBe(
      false
    );
  });
});
