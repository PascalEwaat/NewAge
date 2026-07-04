import { FlowItem } from './FlowItem.js';
import { BurstEffect } from './BurstEffect.js';

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class FlowField {
  constructor(scene, entries, reducedMotion) {
    this.scene = scene;
    this.reducedMotion = reducedMotion;
    this.items = [];
    this.bounds = { width: 1, height: 1, maxHalfWidth: 1 };

    const count = entries.length;
    const lanes = shuffle(entries.map((_, i) => (i / (count - 1)) * 2 - 1));
    entries.forEach(({ texture, aspect }, i) => {
      const item = new FlowItem({
        texture,
        aspect,
        lane: lanes[i],
        progress: i / count, // staggered so the funnel starts populated
        duration: (25 + Math.random() * 10) * (reducedMotion ? 4 : 1),
        seed: Math.random(),
        baseSize: 1, // set by resize()
      });
      this.items.push(item);
      scene.add(item.mesh);
    });
  }

  resize(width, height) {
    this.bounds = { width, height, maxHalfWidth: width * 0.36 };
    const baseSize = Math.min(240, Math.max(90, width * 0.13));
    for (const item of this.items) item.baseSize = baseSize;
  }

  update(dt, time) {
    for (const item of this.items) item.update(dt, time, this.bounds);
  }

  burst(item, uv) {
    if (item.bursting) return;
    item.bursting = true;
    item.mesh.visible = false;
    if (this.reducedMotion) {
      item.reset();
      return;
    }
    new BurstEffect(this.scene, item, uv, () => item.reset());
  }

  meshes() {
    return this.items.filter((i) => i.mesh.visible).map((i) => i.mesh);
  }
}
