import * as THREE from 'three';
import { getMinecraftMaterialMap } from './theme/minecraftMaterials.js';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const approach = (value, target, delta) => {
  if (value < target) {
    return Math.min(value + delta, target);
  }
  return Math.max(value - delta, target);
};

export class Car {
  constructor(scene) {
    this.mesh = new THREE.Group();
    this.materials = getMinecraftMaterialMap();

    this.speed = 0;
    this.heading = Math.PI;
    this.steerAngle = 0;

    this.maxSpeed = 20;
    this.maxReverse = 8;
    this.acceleration = 12;
    this.reverseAcceleration = 9;
    this.brakeForce = 26;
    this.drag = 2.6;
    this.maxSteer = 0.55;
    this.wheelBase = 1.6;

    this.createMesh();
    this.mesh.position.set(0, 0.35, -18);
    scene.add(this.mesh);
  }

  createMesh() {
    const bodyMat = this.materials.carBody;
    const cabinMat = this.materials.carGlass;
    const wheelMat = this.materials.wheel;
    const trimMat = this.materials.stone;
    const lightMat = this.materials.roadLine;

    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 4.2), bodyMat);
    base.position.y = 0.5;
    this.mesh.add(base);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 1.4), bodyMat);
    hood.position.set(0, 0.9, 1.25);
    this.mesh.add(hood);

    const cabinBase = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.15), bodyMat);
    cabinBase.position.set(0, 1.08, -0.25);
    this.mesh.add(cabinBase);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.45, 0.42), cabinMat);
    windshield.position.set(0, 1.35, 0.55);
    this.mesh.add(windshield);

    const backWindow = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.45, 0.42), cabinMat);
    backWindow.position.set(0, 1.35, -1.1);
    this.mesh.add(backWindow);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 1.9), cabinMat);
    roof.position.set(0, 1.58, -0.25);
    this.mesh.add(roof);

    const bumperFront = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.2, 0.25), trimMat);
    bumperFront.position.set(0, 0.45, 2.1);
    this.mesh.add(bumperFront);
    const bumperRear = bumperFront.clone();
    bumperRear.position.z = -2.1;
    this.mesh.add(bumperRear);

    const frontLightL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.09), lightMat);
    frontLightL.position.set(-0.72, 0.68, 2.18);
    const frontLightR = frontLightL.clone();
    frontLightR.position.x = 0.72;
    this.mesh.add(frontLightL, frontLightR);

    const wheelGeo = new THREE.BoxGeometry(0.45, 0.45, 0.85);
    const wheelPositions = [
      [-1.05, 0.23, 1.35],
      [1.05, 0.23, 1.35],
      [-1.05, 0.23, -1.35],
      [1.05, 0.23, -1.35]
    ];
    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(x, y, z);
      this.mesh.add(wheel);
    });

    this.mesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  setPosition(position) {
    this.mesh.position.copy(position);
  }

  update(dt, intent = {}) {
    const throttle =
      typeof intent.throttle === 'number' ? intent.throttle : intent.forward ? 1 : 0;
    const reverse =
      typeof intent.reverse === 'number' ? intent.reverse : intent.back ? 1 : 0;
    const braking = Boolean(intent.brake);
    const boost = intent.boost ? 1.35 : 1;

    if (braking) {
      this.speed = approach(this.speed, 0, this.brakeForce * dt);
    } else if (throttle) {
      this.speed += this.acceleration * boost * dt;
    } else if (reverse) {
      this.speed -= this.reverseAcceleration * dt;
    }

    const dragFactor = 1 - this.drag * dt;
    this.speed *= dragFactor;

    this.speed = clamp(this.speed, -this.maxReverse, this.maxSpeed * boost);

    const rawSteer =
      typeof intent.steer === 'number'
        ? intent.steer
        : (intent.left ? 1 : 0) + (intent.right ? -1 : 0);
    const steerInput = clamp(rawSteer, -1, 1);
    this.steerAngle = THREE.MathUtils.lerp(
      this.steerAngle,
      steerInput * this.maxSteer,
      0.12
    );

    // Simple bicycle steering model for arcade handling.
    const angularVelocity =
      Math.abs(this.speed) > 0.02
        ? (this.speed / this.wheelBase) * Math.tan(this.steerAngle)
        : 0;
    this.heading += angularVelocity * dt;

    this.mesh.position.x += Math.sin(this.heading) * this.speed * dt;
    this.mesh.position.z += Math.cos(this.heading) * this.speed * dt;
    this.mesh.rotation.y = this.heading;
    this.mesh.position.y = 0.35;
  }
}
