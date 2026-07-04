import * as THREE from 'three';
import { scaleAt, opacityAt, xAt, yAt } from './funnel.js';

const sharedGeometry = new THREE.PlaneGeometry(1, 1);

export class FlowItem {
  constructor({ texture, aspect, lane, progress, duration, seed, baseSize }) {
    this.lane = lane;
    this.progress = progress; // 0→1 bottom to top; negative = waiting to (re)spawn
    this.speed = 1 / duration;
    this.seed = seed;
    this.aspect = aspect;
    this.baseSize = baseSize;
    this.bursting = false;

    this.material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(sharedGeometry, this.material);
    this.mesh.userData.item = this;
  }

  update(dt, time, bounds) {
    this.progress += dt * this.speed;
    if (this.progress > 1) this.progress -= 1 + Math.random() * 0.08;

    const p = this.progress;
    const visible = p > 0 && !this.bursting;
    this.mesh.visible = visible;
    if (!visible) return;

    const s = scaleAt(p) * this.baseSize;
    this.mesh.scale.set(s, s * this.aspect, 1);
    this.mesh.position.set(
      xAt(p, this.lane, time, this.seed, bounds.maxHalfWidth),
      yAt(p, bounds.height),
      p // higher = nearer the camera, so top-of-funnel images draw in front
    );
    this.material.opacity = opacityAt(p);
  }

  // After a burst: re-enter from below after a short gap (negative progress).
  reset() {
    this.bursting = false;
    this.progress = -0.05;
  }
}
