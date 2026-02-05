import * as THREE from 'three';
import { MINECRAFT_THEME, getMinecraftSpawnPlan } from './theme/constants.js';
import { getMinecraftMaterialMap } from './theme/minecraftMaterials.js';

const ellipseCircumference = (radiusX, radiusZ) => {
  return (
    Math.PI *
    (3 * (radiusX + radiusZ) -
      Math.sqrt((3 * radiusX + radiusZ) * (radiusX + 3 * radiusZ)))
  );
};

const createPixelLabelTexture = (text) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#d8b27a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#6a4a2b';
    ctx.fillRect(12, 12, canvas.width - 24, canvas.height - 24);
    ctx.fillStyle = '#f4e1ba';
    ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#3c2a1b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "700 110px 'Press Start 2P', 'Courier New', monospace";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 6);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.needsUpdate = true;
  return texture;
};

export const getSceneMinecraftSanity = () => {
  const spawn = getMinecraftSpawnPlan();
  return {
    totalDestructibles: spawn.totalDestructibles,
    hasAnimalSet:
      spawn.monkeys > 0 &&
      spawn.lions > 0 &&
      spawn.deer > 0 &&
      spawn.cows > 0
  };
};

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#9fd7ff');
    this.scene.fog = new THREE.Fog('#9fd7ff', 45, 170);

    this.track = {
      radiusX: 26,
      radiusZ: 18,
      roadWidth: 5
    };

    this.materials = getMinecraftMaterialMap();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      260
    );
    this.camera.position.set(0, 6, -12);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this._cameraOffset = new THREE.Vector3();
    this._cameraLook = new THREE.Vector3();
    this._baseOffset = new THREE.Vector3(0, 4.8, -8.5);
    this._targetOffset = new THREE.Vector3(0, 1.6, 3);

    this._trackScale = this.track.radiusZ / this.track.radiusX;
    this._carCollisionRadius = 1.25;

    this.destructibles = [];
    this.fragmentBursts = [];
    this._fragmentGeometry = new THREE.BoxGeometry(1, 1, 1);
    this._fragmentTemp = new THREE.Object3D();

    this.createSky();
    this.createLights();
    this.createWorld();
  }

  createSky() {
    this.createClouds();
  }

  createClouds() {
    const cloudMat = new THREE.MeshLambertMaterial({ color: '#f2fbff' });
    const cloudBlockGeo = new THREE.BoxGeometry(2, 1, 1.5);

    for (let i = 0; i < 18; i += 1) {
      const cloud = new THREE.Group();
      const blocks = 3 + Math.floor(Math.random() * 4);
      const baseX = -70 + Math.random() * 140;
      const baseY = 16 + Math.random() * 12;
      const baseZ = -70 + Math.random() * 140;

      for (let b = 0; b < blocks; b += 1) {
        const voxel = new THREE.Mesh(cloudBlockGeo, cloudMat);
        voxel.position.set(b * 1.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 1.4);
        cloud.add(voxel);
      }

      cloud.position.set(baseX, baseY, baseZ);
      cloud.traverse((node) => {
        if (node.isMesh) {
          node.receiveShadow = false;
          node.castShadow = false;
        }
      });
      this.scene.add(cloud);
    }
  }

  createLights() {
    const ambient = new THREE.AmbientLight('#ffffff', 0.7);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight('#d3efff', '#5c7449', 0.45);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight('#fff4cc', 0.9);
    sun.position.set(22, 30, -18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 8;
    sun.shadow.camera.far = 140;
    sun.shadow.camera.left = -48;
    sun.shadow.camera.right = 48;
    sun.shadow.camera.top = 48;
    sun.shadow.camera.bottom = -48;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
  }

  createWorld() {
    this.createGroundLayers();
    this.createRoadAndDetails();
    this.addCenterLabel();
    this.addDecorations();
  }

  createGroundLayers() {
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220),
      this.materials.grass
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = 0;
    grass.receiveShadow = true;
    this.scene.add(grass);

    const dirtBand = new THREE.Mesh(
      new THREE.RingGeometry(this.track.radiusX + this.track.roadWidth * 0.8, 80, 96),
      this.materials.dirt
    );
    dirtBand.rotation.x = -Math.PI / 2;
    dirtBand.position.y = 0.01;
    dirtBand.scale.y = this._trackScale;
    dirtBand.receiveShadow = true;
    this.scene.add(dirtBand);

    const infield = new THREE.Mesh(
      new THREE.CircleGeometry(this.track.radiusX - this.track.roadWidth * 0.75, 80),
      this.materials.grass
    );
    infield.rotation.x = -Math.PI / 2;
    infield.position.y = 0.02;
    infield.scale.y = this._trackScale;
    infield.receiveShadow = true;
    this.scene.add(infield);
  }

  createRoadAndDetails() {
    const segmentCount = MINECRAFT_THEME.track.roadSegmentCount;
    const roadCircumference = ellipseCircumference(this.track.radiusX, this.track.radiusZ);
    const segmentLength = (roadCircumference / segmentCount) * 1.18;

    const roadMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(this.track.roadWidth, 0.22, segmentLength),
      this.materials.roadDark,
      segmentCount
    );

    const temp = new THREE.Object3D();
    for (let i = 0; i < segmentCount; i += 1) {
      const t = (i / segmentCount) * Math.PI * 2;
      const x = Math.cos(t) * this.track.radiusX;
      const z = Math.sin(t) * this.track.radiusZ;
      const tangentAngle = Math.atan2(
        -Math.sin(t) * this.track.radiusX,
        Math.cos(t) * this.track.radiusZ
      );
      temp.position.set(x, 0.13, z);
      temp.rotation.set(0, tangentAngle, 0);
      temp.updateMatrix();
      roadMesh.setMatrixAt(i, temp.matrix);
    }
    roadMesh.instanceMatrix.needsUpdate = true;
    roadMesh.castShadow = true;
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);

    const markerCount = MINECRAFT_THEME.track.laneMarkerCount;
    const markerMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.42, 0.08, 1.35),
      this.materials.roadLine,
      markerCount
    );
    for (let i = 0; i < markerCount; i += 1) {
      const t = (i / markerCount) * Math.PI * 2;
      const x = Math.cos(t) * this.track.radiusX;
      const z = Math.sin(t) * this.track.radiusZ;
      const tangentAngle = Math.atan2(
        -Math.sin(t) * this.track.radiusX,
        Math.cos(t) * this.track.radiusZ
      );
      temp.position.set(x, 0.25, z);
      temp.rotation.set(0, tangentAngle, 0);
      temp.updateMatrix();
      markerMesh.setMatrixAt(i, temp.matrix);
    }
    markerMesh.instanceMatrix.needsUpdate = true;
    markerMesh.receiveShadow = true;
    this.scene.add(markerMesh);

    this.createCurbRing(this.track.radiusX - this.track.roadWidth * 0.55, this.track.radiusZ - this.track.roadWidth * 0.55);
    this.createCurbRing(this.track.radiusX + this.track.roadWidth * 0.55, this.track.radiusZ + this.track.roadWidth * 0.55);
    this.createFenceRing(this.track.radiusX + this.track.roadWidth * 0.9 + 0.9, this.track.radiusZ + this.track.roadWidth * 0.9 + 0.9);
  }

  createCurbRing(radiusX, radiusZ) {
    const curbCount = MINECRAFT_THEME.track.curbBlockCount;
    const curbMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.44, 0.18, 0.44),
      this.materials.curb,
      curbCount
    );
    const temp = new THREE.Object3D();

    for (let i = 0; i < curbCount; i += 1) {
      const t = (i / curbCount) * Math.PI * 2;
      temp.position.set(Math.cos(t) * radiusX, 0.15, Math.sin(t) * radiusZ);
      temp.rotation.set(0, Math.atan2(Math.cos(t) * radiusX, -Math.sin(t) * radiusZ), 0);
      temp.updateMatrix();
      curbMesh.setMatrixAt(i, temp.matrix);
    }
    curbMesh.instanceMatrix.needsUpdate = true;
    curbMesh.castShadow = true;
    curbMesh.receiveShadow = true;
    this.scene.add(curbMesh);
  }

  createFenceRing(radiusX, radiusZ) {
    const postCount = 96;
    const postMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.14, 0.68, 0.14),
      this.materials.stone,
      postCount
    );
    const temp = new THREE.Object3D();

    for (let i = 0; i < postCount; i += 1) {
      const t = (i / postCount) * Math.PI * 2;
      temp.position.set(Math.cos(t) * radiusX, 0.36, Math.sin(t) * radiusZ);
      temp.rotation.set(0, Math.atan2(Math.cos(t) * radiusX, -Math.sin(t) * radiusZ), 0);
      temp.updateMatrix();
      postMesh.setMatrixAt(i, temp.matrix);
    }
    postMesh.instanceMatrix.needsUpdate = true;
    postMesh.castShadow = true;
    postMesh.receiveShadow = true;
    this.scene.add(postMesh);
  }

  addCenterLabel() {
    const badge = new THREE.Group();
    badge.name = 'paper-loop-center';

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(10.8, 0.5, 10.8),
      this.materials.centerPlaque
    );
    base.position.y = 0.29;

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(9.8, 0.25, 9.8),
      this.materials.sign
    );
    top.position.y = 0.68;

    const textTexture = createPixelLabelTexture('PAPER LOOP');
    const textPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(8.8, 2.2),
      new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        depthWrite: false
      })
    );
    textPlane.rotation.x = -Math.PI / 2;
    textPlane.position.y = 0.82;

    badge.add(base, top, textPlane);
    badge.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.scene.add(badge);
  }

  addDecorations() {
    const jungleCfg = MINECRAFT_THEME.jungle;
    const jungleMinRadius = this.track.radiusX + this.track.roadWidth * 0.5 + jungleCfg.minRadiusOffset;
    const jungleMaxRadius = jungleCfg.maxRadius;

    const placeInJungle = (object, radius) => {
      const pos = this.sampleJunglePoint(jungleMinRadius, jungleMaxRadius);
      object.position.copy(pos);
      object.rotation.y = Math.random() * Math.PI * 2;
      this.setObjectShadow(object);
      this.scene.add(object);
      this.registerDestructible(object, radius);
    };

    const spawn = (count, minScale, maxScale, radiusScale, factory) => {
      for (let i = 0; i < count; i += 1) {
        const scale = minScale + Math.random() * (maxScale - minScale);
        const object = factory();
        object.scale.setScalar(scale);
        placeInJungle(object, radiusScale * scale);
      }
    };

    spawn(jungleCfg.rocks, 0.5, 1.15, 0.55, () => this.createVoxelRock());
    spawn(jungleCfg.trees, 0.75, 1.35, 0.96, () => this.createVoxelTree());
    spawn(jungleCfg.bushes, 0.7, 1.15, 0.72, () => this.createVoxelBush());
    spawn(jungleCfg.grassClumps, 0.6, 1.15, 0.34, () => this.createVoxelGrassClump());

    spawn(jungleCfg.monkeys, 0.74, 1.06, 0.66, () => this.createMonkeyFigurine());
    spawn(jungleCfg.lions, 0.88, 1.22, 0.84, () => this.createLionFigurine());
    spawn(jungleCfg.deer, 0.84, 1.2, 0.8, () => this.createDeerFigurine());
    spawn(jungleCfg.cows, 0.9, 1.2, 0.82, () => this.createCowFigurine());
  }

  createVoxelRock() {
    const group = new THREE.Group();
    const block = new THREE.BoxGeometry(0.6, 0.6, 0.6);

    const pieceCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < pieceCount; i += 1) {
      const mesh = new THREE.Mesh(block, this.materials.stone);
      mesh.position.set(
        (Math.random() - 0.5) * 0.65,
        0.2 + Math.random() * 0.32,
        (Math.random() - 0.5) * 0.65
      );
      mesh.scale.set(0.75 + Math.random() * 0.4, 0.65 + Math.random() * 0.45, 0.75 + Math.random() * 0.4);
      group.add(mesh);
    }

    return group;
  }

  createVoxelTree() {
    const tree = new THREE.Group();

    const trunkBlock = new THREE.BoxGeometry(0.46, 0.46, 0.46);
    for (let i = 0; i < 6; i += 1) {
      const trunk = new THREE.Mesh(trunkBlock, this.materials.wood);
      trunk.position.y = 0.24 + i * 0.45;
      tree.add(trunk);
    }

    const leafBlock = new THREE.BoxGeometry(0.68, 0.68, 0.68);
    const offsets = [];
    for (let x = -1; x <= 1; x += 1) {
      for (let z = -1; z <= 1; z += 1) {
        offsets.push([x, z, 0]);
      }
    }
    offsets.push([0, 0, 1]);
    offsets.push([0, 0, 2]);

    offsets.forEach(([x, z, level]) => {
      const leaf = new THREE.Mesh(leafBlock, this.materials.leaves);
      leaf.position.set(x * 0.55, 2.4 + level * 0.45, z * 0.55);
      tree.add(leaf);
    });

    return tree;
  }

  createVoxelBush() {
    const bush = new THREE.Group();
    const block = new THREE.BoxGeometry(0.5, 0.5, 0.5);

    const offsets = [
      [0, 0.28, 0],
      [0.34, 0.24, -0.12],
      [-0.28, 0.24, 0.12],
      [0, 0.52, 0.08]
    ];

    offsets.forEach(([x, y, z]) => {
      const part = new THREE.Mesh(block, this.materials.leaves);
      part.position.set(x, y, z);
      bush.add(part);
    });

    return bush;
  }

  createVoxelGrassClump() {
    const clump = new THREE.Group();
    const blade = new THREE.BoxGeometry(0.1, 0.68, 0.1);

    for (let i = 0; i < 6; i += 1) {
      const mesh = new THREE.Mesh(blade, this.materials.grass);
      mesh.position.set((Math.random() - 0.5) * 0.4, 0.34, (Math.random() - 0.5) * 0.4);
      clump.add(mesh);
    }

    return clump;
  }

  createMonkeyFigurine() {
    const monkey = new THREE.Group();

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.52, 0.48), this.materials.wood);
    body.position.y = 0.52;

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.24), this.materials.sign);
    chest.position.set(0, 0.52, 0.18);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.36), this.materials.wood);
    head.position.set(0, 0.86, 0.18);

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.14), this.materials.wood);
    legL.position.set(-0.16, 0.18, -0.08);
    const legR = legL.clone();
    legR.position.x = 0.16;

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.12), this.materials.wood);
    armL.position.set(-0.28, 0.45, 0.1);
    const armR = armL.clone();
    armR.position.x = 0.28;

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.48), this.materials.wood);
    tail.position.set(0, 0.56, -0.34);

    monkey.add(body, chest, head, legL, legR, armL, armR, tail);
    return monkey;
  }

  createLionFigurine() {
    const lion = new THREE.Group();

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.5, 0.52), this.materials.sign);
    body.position.y = 0.5;

    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.52), this.materials.wood);
    mane.position.set(0, 0.82, 0.34);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.42), this.materials.sign);
    head.position.set(0, 0.82, 0.42);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.55), this.materials.sign);
    tail.position.set(0, 0.55, -0.44);

    const legOffsets = [
      [-0.32, 0.18, 0.18],
      [0.32, 0.18, 0.18],
      [-0.32, 0.18, -0.18],
      [0.32, 0.18, -0.18]
    ];

    const legs = legOffsets.map(([x, y, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.14), this.materials.sign);
      leg.position.set(x, y, z);
      return leg;
    });

    lion.add(body, mane, head, tail, ...legs);
    return lion;
  }

  createDeerFigurine() {
    const deer = new THREE.Group();

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.42, 0.42), this.materials.wood);
    body.position.y = 0.5;

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.16), this.materials.wood);
    neck.position.set(0, 0.74, 0.26);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.36), this.materials.wood);
    head.position.set(0, 0.88, 0.43);

    const antlerL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.05), this.materials.roadLine);
    antlerL.position.set(-0.08, 1.08, 0.4);
    const antlerR = antlerL.clone();
    antlerR.position.x = 0.08;

    const legOffsets = [
      [-0.22, 0.2, 0.15],
      [0.22, 0.2, 0.15],
      [-0.22, 0.2, -0.15],
      [0.22, 0.2, -0.15]
    ];

    const legs = legOffsets.map(([x, y, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.38, 0.1), this.materials.wood);
      leg.position.set(x, y, z);
      return leg;
    });

    deer.add(body, neck, head, antlerL, antlerR, ...legs);
    return deer;
  }

  createCowFigurine() {
    const cow = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.06, 0.55, 0.52),
      this.materials.roadLine
    );
    body.position.y = 0.56;

    const patchA = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.22, 0.18),
      this.materials.coal
    );
    patchA.position.set(-0.26, 0.66, 0.14);
    const patchB = patchA.clone();
    patchB.position.set(0.22, 0.5, -0.12);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.33, 0.36),
      this.materials.roadLine
    );
    head.position.set(0, 0.8, 0.44);

    const muzzle = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.14, 0.18),
      this.materials.sign
    );
    muzzle.position.set(0, 0.75, 0.58);

    const hornL = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.08),
      this.materials.stone
    );
    hornL.position.set(-0.12, 0.94, 0.45);
    const hornR = hornL.clone();
    hornR.position.x = 0.12;

    const legOffsets = [
      [-0.3, 0.2, 0.18],
      [0.3, 0.2, 0.18],
      [-0.3, 0.2, -0.18],
      [0.3, 0.2, -0.18]
    ];

    const legs = legOffsets.map(([x, y, z]) => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.4, 0.12),
        this.materials.coal
      );
      leg.position.set(x, y, z);
      return leg;
    });

    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.32, 0.07),
      this.materials.coal
    );
    tail.position.set(0, 0.65, -0.34);

    cow.add(
      body,
      patchA,
      patchB,
      head,
      muzzle,
      hornL,
      hornR,
      tail,
      ...legs
    );
    return cow;
  }

  setObjectShadow(object) {
    object.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  sampleJunglePoint(minRadiusX, maxRadiusX) {
    const angle = Math.random() * Math.PI * 2;
    const radiusX = minRadiusX + Math.random() * (maxRadiusX - minRadiusX);
    const radiusZ = radiusX * this._trackScale;
    const sideJitter = (Math.random() - 0.5) * 2.6;

    return new THREE.Vector3(
      Math.cos(angle) * radiusX + Math.cos(angle + Math.PI / 2) * sideJitter,
      0,
      Math.sin(angle) * radiusZ + Math.sin(angle + Math.PI / 2) * sideJitter
    );
  }

  registerDestructible(object, radius) {
    const color = new THREE.Color('#8a8f94');
    let foundColor = false;

    object.traverse((child) => {
      if (foundColor || !child.isMesh) {
        return;
      }
      if (child.material && child.material.color) {
        color.copy(child.material.color);
        foundColor = true;
      }
    });

    this.destructibles.push({
      object,
      radius,
      active: true,
      color
    });
  }

  disintegrateDestructible(entry) {
    entry.active = false;
    entry.object.visible = false;

    const fragmentCfg = MINECRAFT_THEME.fragments;
    const origin = entry.object.position.clone();
    const fragmentCount = Math.max(
      fragmentCfg.minCount,
      Math.min(fragmentCfg.maxCount, Math.round(fragmentCfg.minCount + entry.radius * 8))
    );

    const fragmentMat = this.materials.breakParticle.clone();
    fragmentMat.color.copy(entry.color);
    fragmentMat.transparent = true;
    fragmentMat.opacity = 1;

    const fragments = new THREE.InstancedMesh(
      this._fragmentGeometry,
      fragmentMat,
      fragmentCount
    );
    fragments.castShadow = true;
    fragments.receiveShadow = true;

    const positions = [];
    const velocities = [];
    const rotations = [];
    const angular = [];
    const scales = [];

    for (let i = 0; i < fragmentCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const lift = 0.45 + Math.random() * 1.05;
      const spread = 0.68 + Math.random() * 0.7;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * spread,
        lift,
        Math.sin(angle) * spread
      ).multiplyScalar(2.4 + Math.random() * 3.7 + entry.radius * 0.9);

      const position = new THREE.Vector3(
        origin.x + (Math.random() - 0.5) * entry.radius * 0.9,
        0.2 + Math.random() * entry.radius * 0.55,
        origin.z + (Math.random() - 0.5) * entry.radius * 0.9
      );

      const rotation = new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      const spin = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      );
      const scale = 0.08 + Math.random() * 0.17 + entry.radius * 0.05;

      positions.push(position);
      velocities.push(velocity);
      rotations.push(rotation);
      angular.push(spin);
      scales.push(scale);

      this._fragmentTemp.position.copy(position);
      this._fragmentTemp.rotation.copy(rotation);
      this._fragmentTemp.scale.setScalar(scale);
      this._fragmentTemp.updateMatrix();
      fragments.setMatrixAt(i, this._fragmentTemp.matrix);
    }
    fragments.instanceMatrix.needsUpdate = true;

    this.scene.add(fragments);
    this.fragmentBursts.push({
      mesh: fragments,
      material: fragmentMat,
      positions,
      velocities,
      rotations,
      angular,
      scales,
      life: 0,
      ttl:
        fragmentCfg.minTtl +
        Math.random() * (fragmentCfg.maxTtl - fragmentCfg.minTtl)
    });
  }

  handleDestructibleCollisions(carPosition) {
    for (let i = 0; i < this.destructibles.length; i += 1) {
      const entry = this.destructibles[i];
      if (!entry.active) {
        continue;
      }

      const dx = entry.object.position.x - carPosition.x;
      const dz = entry.object.position.z - carPosition.z;
      const reach = this._carCollisionRadius + entry.radius;
      if (dx * dx + dz * dz <= reach * reach) {
        this.disintegrateDestructible(entry);
      }
    }
  }

  updateFragmentBursts(dt) {
    for (let i = this.fragmentBursts.length - 1; i >= 0; i -= 1) {
      const burst = this.fragmentBursts[i];
      burst.life += dt;
      const progress = Math.min(1, burst.life / burst.ttl);
      const alpha = 1 - progress;
      burst.material.opacity = alpha;

      for (let j = 0; j < burst.positions.length; j += 1) {
        const pos = burst.positions[j];
        const vel = burst.velocities[j];
        const rot = burst.rotations[j];
        const spin = burst.angular[j];

        vel.y -= MINECRAFT_THEME.fragments.gravity * dt;
        vel.multiplyScalar(1 - 0.55 * dt);
        pos.addScaledVector(vel, dt);

        rot.x += spin.x * dt;
        rot.y += spin.y * dt;
        rot.z += spin.z * dt;

        const scale = burst.scales[j] * (0.2 + alpha * 0.8);
        this._fragmentTemp.position.copy(pos);
        this._fragmentTemp.rotation.copy(rot);
        this._fragmentTemp.scale.setScalar(scale);
        this._fragmentTemp.updateMatrix();
        burst.mesh.setMatrixAt(j, this._fragmentTemp.matrix);
      }

      burst.mesh.instanceMatrix.needsUpdate = true;

      if (progress >= 1) {
        this.scene.remove(burst.mesh);
        burst.material.dispose();
        this.fragmentBursts.splice(i, 1);
      }
    }
  }

  updateEnvironment(dt, carPosition) {
    if (carPosition) {
      this.handleDestructibleCollisions(carPosition);
    }
    this.updateFragmentBursts(dt);
  }

  updateCamera(car, dt) {
    this._cameraOffset.copy(this._baseOffset).applyQuaternion(car.mesh.quaternion);
    const desiredPosition = this._cameraOffset.add(car.mesh.position);

    const smoothing = 1 - Math.pow(0.001, dt);
    this.camera.position.lerp(desiredPosition, smoothing);

    this._cameraLook
      .copy(this._targetOffset)
      .applyQuaternion(car.mesh.quaternion)
      .add(car.mesh.position);

    const lookAheadDistance = Math.min(Math.abs(car.speed) * 0.12, 4);
    if (lookAheadDistance > 0.01) {
      const lookAhead = new THREE.Vector3(
        0,
        0,
        Math.sign(car.speed || 1) * lookAheadDistance
      ).applyQuaternion(car.mesh.quaternion);
      this._cameraLook.add(lookAhead);
    }

    this.camera.lookAt(this._cameraLook);
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
