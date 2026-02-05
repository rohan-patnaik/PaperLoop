import * as THREE from 'three';
import { getMinecraftMaterialMap } from './theme/minecraftMaterials.js';

const wrapLines = (ctx, text, maxWidth) => {
  const words = text.split(' ');
  const lines = [];
  let line = '';

  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });

  if (line) {
    lines.push(line);
  }

  return lines;
};

// Render the title into a canvas texture for the signboard.
const createTextTexture = (title) => {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  ctx.fillStyle = '#f2deb8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#8a6238';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

  let fontSize = 30;
  if (title.length > 70) {
    fontSize = 20;
  } else if (title.length > 48) {
    fontSize = 24;
  }
  ctx.fillStyle = '#2f2418';
  ctx.imageSmoothingEnabled = false;
  ctx.font = `700 ${fontSize}px 'Press Start 2P', 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxWidth = canvas.width - 40;
  const lines = wrapLines(ctx, title, maxWidth);
  const lineHeight = fontSize + 8;
  const totalHeight = lines.length * lineHeight;
  let y = canvas.height / 2 - totalHeight / 2 + lineHeight / 2;

  lines.forEach((line) => {
    ctx.fillText(line, canvas.width / 2, y);
    y += lineHeight;
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.needsUpdate = true;
  return texture;
};

export class Stops {
  constructor(scene, papers, track) {
    this.scene = scene;
    this.papers = papers;
    this.track = track;
    this.materials = getMinecraftMaterialMap();
    this.stops = [];
    this.highlighted = null;

    this.createStops();
  }

  createStops() {
    const total = this.papers.length;
    const offset = this.track.roadWidth * 0.9 + 2.2;

    for (let i = 0; i < total; i += 1) {
      const t = (i / total) * Math.PI * 2;
      const x = Math.cos(t) * this.track.radiusX;
      const z = Math.sin(t) * this.track.radiusZ;
      const pos = new THREE.Vector3(
        x + Math.cos(t) * offset,
        0,
        z + Math.sin(t) * offset
      );
      const stop = this.createStop(this.papers[i], pos);
      this.stops.push(stop);
    }
  }

  createStop(paper, position) {
    const group = new THREE.Group();
    group.position.copy(position);

    const hue = ((paper.id || 1) * 37) % 360;
    const accentColor = new THREE.Color(`hsl(${hue}, 55%, 62%)`);

    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 2.4, 0.34),
      this.materials.wood
    );
    post.position.y = 1.2;
    group.add(post);

    const brace = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.24, 0.28),
      this.materials.wood
    );
    brace.position.set(0, 2.08, 0);
    group.add(brace);

    const railL = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.95, 0.16),
      this.materials.wood
    );
    railL.position.set(-1.1, 1.42, 0.02);
    const railR = railL.clone();
    railR.position.x = 1.1;
    group.add(railL, railR);

    const boardTexture = createTextTexture(paper.title);
    const boardBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.45, 0.16),
      this.materials.sign
    );
    boardBody.position.set(0, 2.28, 0.12);
    group.add(boardBody);

    const boardMat = new THREE.MeshStandardMaterial({
      map: boardTexture,
      roughness: 0.8,
      metalness: 0.02,
      emissive: accentColor,
      emissiveIntensity: 0
    });
    boardMat.side = THREE.DoubleSide;

    const textFront = new THREE.Mesh(new THREE.PlaneGeometry(2.38, 1.28), boardMat);
    textFront.position.set(0, 2.28, 0.21);
    const textBack = textFront.clone();
    textBack.position.z = 0.03;
    textBack.rotation.y = Math.PI;
    group.add(textFront, textBack);

    const dir = new THREE.Vector3(-position.x, 0, -position.z).normalize();
    group.rotation.y = Math.atan2(dir.x, dir.z);

    group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.scene.add(group);

    return {
      paper,
      group,
      boardMat,
      baseEmissive: boardMat.emissive.clone()
    };
  }

  getNearestStop(position, range) {
    const rangeSq = range * range;
    let nearest = null;
    let nearestDistSq = rangeSq;

    this.stops.forEach((stop) => {
      const distSq = stop.group.position.distanceToSquared(position);
      if (distSq <= nearestDistSq) {
        nearest = stop;
        nearestDistSq = distSq;
      }
    });

    if (!nearest) {
      return null;
    }

    return {
      stop: nearest,
      paper: nearest.paper,
      distance: Math.sqrt(nearestDistSq)
    };
  }

  getStopById(id) {
    return this.stops.find((stop) => stop.paper && stop.paper.id === id) || null;
  }

  setHighlighted(stop) {
    if (this.highlighted === stop) {
      return;
    }

    if (this.highlighted) {
      this.highlighted.boardMat.emissiveIntensity = 0;
    }

    this.highlighted = stop;

    if (this.highlighted) {
      this.highlighted.boardMat.emissiveIntensity = 0.6;
    }
  }

  update(time) {
    if (!this.highlighted) {
      return;
    }

    const pulse = 0.4 + Math.sin(time * 4) * 0.2;
    this.highlighted.boardMat.emissiveIntensity = pulse;
  }
}
