# Image Spring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A full-viewport WebGL page where ~22 images rise in an inverted-funnel stream (narrow bottom → wide top), evaporate at the top, loop back to the bottom, and burst into texture-particles when clicked.

**Architecture:** Single Three.js scene with an orthographic camera mapped 1:1 to viewport pixels. Pure funnel math lives in `funnel.js` (unit-tested). Each image is a `FlowItem` (textured plane); `FlowField` owns items + funnel bounds; `BurstEffect` is a self-disposing instanced shader mesh animated by one GSAP tween; `assets.js` preloads rounded-corner canvas textures.

**Tech Stack:** Vite, vanilla JS (ESM), three, gsap, vitest.

## Global Constraints

- Stack: Vite + vanilla JS; `three` and `gsap` from npm (spec: no framework).
- Mood: off-white `#f4f4f2` background with subtle dot grid (CSS layer); calm pacing — full bottom-to-top journey 25–35 s.
- ~22 images, placeholder photos from picsum.photos, swappable via one array in `src/assets.js`.
- `devicePixelRatio` capped at 2.
- `prefers-reduced-motion: reduce` → 4× slower flow, burst replaced by instant fade/reset.
- Burst image respawns from the bottom; stream never pauses; simultaneous bursts allowed.
- Canvas fades in only after all textures are loaded.

---

### Task 1: Project scaffold + empty scene

**Files:**
- Create: `package.json`, `index.html`, `src/style.css`, `src/main.js`, `.gitignore`

**Interfaces:**
- Produces: running Vite dev server; `#scene` canvas; CSS classes `ready` (fade-in) and `hovering` (pointer cursor) on the canvas; dot-grid background layer.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "image-spring",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "gsap": "^3.12.5",
    "three": "^0.166.1"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Write `.gitignore`**

```
node_modules
dist
```

- [ ] **Step 3: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Image Spring</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <div class="dots"></div>
    <canvas id="scene"></canvas>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Write `src/style.css`**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  height: 100%;
  overflow: hidden;
  background: #f4f4f2;
}

.dots {
  position: fixed;
  inset: 0;
  background-image: radial-gradient(circle, #d9d9d6 1px, transparent 1px);
  background-size: 26px 26px;
}

#scene {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 1.2s ease;
}

#scene.ready { opacity: 1; }
#scene.hovering { cursor: pointer; }
```

- [ ] **Step 5: Write minimal `src/main.js`** (renders an empty transparent scene; replaced wholesale in Task 4)

```js
import * as THREE from 'three';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(
  -window.innerWidth / 2, window.innerWidth / 2,
  window.innerHeight / 2, -window.innerHeight / 2,
  0.1, 100
);
camera.position.z = 10;

renderer.setAnimationLoop(() => renderer.render(scene, camera));
canvas.classList.add('ready');
```

- [ ] **Step 6: Install and verify dev server**

Run: `npm install` then start the dev server (preview tooling or `npm run dev`).
Expected: page shows off-white dotted background, zero console errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + Three.js empty scene with dotted background"
```

---

### Task 2: Funnel math (TDD)

**Files:**
- Create: `src/funnel.js`
- Test: `tests/funnel.test.js`

**Interfaces:**
- Produces (all pure, exported from `src/funnel.js`):
  - `lerp(a: number, b: number, t: number): number`
  - `easeOutQuad(t: number): number`
  - `clamp01(t: number): number`
  - `spreadAt(p: number, maxHalfWidth: number): number` — funnel half-width in px at progress `p`
  - `scaleAt(p: number): number` — 0.15 at p=0 → 1 at p=1
  - `opacityAt(p: number): number` — 0 at p≤0, quick fade-in, 1 mid, 0 by p=1
  - `yAt(p: number, height: number): number` — bottom `-h/2+50` → top `h/2+120`
  - `xAt(p: number, lane: number, time: number, seed: number, maxHalfWidth: number): number` — lane∈[-1,1] spread + sine wobble (≤14 px)

- [ ] **Step 1: Write the failing tests — `tests/funnel.test.js`**

```js
import { describe, it, expect } from 'vitest';
import {
  lerp, easeOutQuad, clamp01,
  spreadAt, scaleAt, opacityAt, yAt, xAt,
} from '../src/funnel.js';

describe('helpers', () => {
  it('lerp interpolates', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
  it('easeOutQuad endpoints', () => {
    expect(easeOutQuad(0)).toBe(0);
    expect(easeOutQuad(1)).toBe(1);
  });
  it('clamp01 clamps', () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(2)).toBe(1);
  });
});

describe('spreadAt', () => {
  it('is narrow at the bottom and wide at the top', () => {
    expect(spreadAt(0, 100)).toBeLessThan(10);
    expect(spreadAt(1, 100)).toBeCloseTo(100);
  });
  it('grows monotonically', () => {
    let prev = -Infinity;
    for (let p = 0; p <= 1.001; p += 0.1) {
      const s = spreadAt(p, 100);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });
});

describe('scaleAt', () => {
  it('goes from 0.15 to 1', () => {
    expect(scaleAt(0)).toBeCloseTo(0.15);
    expect(scaleAt(1)).toBeCloseTo(1);
  });
});

describe('opacityAt', () => {
  it('is 0 before spawn, 1 mid-flight, 0 at the top', () => {
    expect(opacityAt(-0.05)).toBe(0);
    expect(opacityAt(0.5)).toBe(1);
    expect(opacityAt(1)).toBe(0);
  });
});

describe('yAt', () => {
  it('maps p to bottom→top of an 800px viewport', () => {
    expect(yAt(0, 800)).toBeCloseTo(-350);
    expect(yAt(1, 800)).toBeCloseTo(520);
  });
});

describe('xAt', () => {
  it('stays near center for lane 0 (wobble only)', () => {
    expect(Math.abs(xAt(0.5, 0, 3.2, 0.7, 400))).toBeLessThanOrEqual(14);
  });
  it('spreads lanes apart at the top', () => {
    const left = xAt(1, -1, 0, 0.1, 400);
    const right = xAt(1, 1, 0, 0.1, 400);
    expect(right - left).toBeGreaterThan(600);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/funnel.test.js`
Expected: FAIL — cannot resolve `../src/funnel.js`.

- [ ] **Step 3: Write `src/funnel.js`**

```js
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
export const clamp01 = (t) => Math.min(1, Math.max(0, t));

// Funnel half-width in pixels at progress p (0 bottom → 1 top).
export function spreadAt(p, maxHalfWidth) {
  return maxHalfWidth * (0.05 + 0.95 * easeOutQuad(clamp01(p)));
}

// Image scale factor: small bubble at the bottom, full size at the top.
export function scaleAt(p) {
  return lerp(0.15, 1, easeOutQuad(clamp01(p)));
}

// Quick fade-in at spawn, evaporate near the top edge.
export function opacityAt(p) {
  if (p <= 0) return 0;
  const fadeIn = clamp01(p / 0.06);
  const fadeOut = p > 0.82 ? clamp01(1 - (p - 0.82) / 0.16) : 1;
  return Math.min(fadeIn, fadeOut);
}

export function yAt(p, height) {
  return lerp(-height / 2 + 50, height / 2 + 120, clamp01(p));
}

// lane ∈ [-1, 1] spread by funnel width, plus a gentle per-item sine wobble.
export function xAt(p, lane, time, seed, maxHalfWidth) {
  const wobble =
    Math.sin(time * (0.4 + seed * 0.5) + seed * 43.7) * 14 * clamp01(p * 4);
  return lane * spreadAt(p, maxHalfWidth) + wobble;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/funnel.test.js`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/funnel.js tests/funnel.test.js
git commit -m "feat: funnel math with unit tests"
```

---

### Task 3: Texture pipeline

**Files:**
- Create: `src/assets.js`

**Interfaces:**
- Produces:
  - `IMAGE_URLS: Array<{ url: string, aspect: number }>` — the one array to swap for real images later
  - `loadTextures(): Promise<Array<{ texture: THREE.CanvasTexture, aspect: number }>>` — resolves when every entry is ready (failed loads fall back to a flat gray rounded block, so it never rejects)

- [ ] **Step 1: Write `src/assets.js`**

```js
import * as THREE from 'three';

const ASPECTS = [1, 1, 1.25, 0.8]; // height/width mix echoing the reference
const COUNT = 22;
const TEX_W = 512;
const CORNER_RADIUS = 28;

// Swap these for real images later — one entry per flow item.
export const IMAGE_URLS = Array.from({ length: COUNT }, (_, i) => {
  const aspect = ASPECTS[i % ASPECTS.length];
  return {
    url: `https://picsum.photos/seed/spring${i}/${TEX_W}/${Math.round(TEX_W * aspect)}`,
    aspect,
  };
});

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Rounded-corner canvas so every texture — and every burst shard cut from
// it — carries the rounded-rect alpha.
function makeTexture(aspect, draw) {
  const w = TEX_W;
  const h = Math.round(w * aspect);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, CORNER_RADIUS);
  ctx.clip();
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export async function loadTextures() {
  return Promise.all(
    IMAGE_URLS.map(async ({ url, aspect }) => {
      try {
        const img = await loadImage(url);
        return {
          texture: makeTexture(aspect, (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h)),
          aspect,
        };
      } catch {
        return {
          texture: makeTexture(aspect, (ctx, w, h) => {
            ctx.fillStyle = '#dcdcda';
            ctx.fillRect(0, 0, w, h);
          }),
          aspect,
        };
      }
    })
  );
}
```

- [ ] **Step 2: Temporary smoke check in `src/main.js`** — add at the end:

```js
import { loadTextures } from './assets.js';
loadTextures().then((t) => console.log('textures loaded:', t.length));
```

- [ ] **Step 3: Verify in browser**

Reload the dev server page.
Expected: console logs `textures loaded: 22`, no errors. Then remove the two temporary lines from `src/main.js`.

- [ ] **Step 4: Commit**

```bash
git add src/assets.js src/main.js
git commit -m "feat: rounded-corner texture pipeline with picsum placeholders"
```

---

### Task 4: Flow — FlowItem, FlowField, main loop

**Files:**
- Create: `src/FlowItem.js`, `src/FlowField.js`
- Modify: `src/main.js` (replace entirely with the version below)

**Interfaces:**
- Consumes: `funnel.js` functions (Task 2), `loadTextures()` (Task 3).
- Produces:
  - `class FlowItem { mesh, material, progress, bursting, baseSize, aspect; update(dt, time, bounds); reset() }` — `mesh.userData.item` points back to the item
  - `class FlowField { constructor(scene, entries, reducedMotion); resize(width, height); update(dt, time); burst(item, uv); meshes(): THREE.Mesh[] }`
  - `FlowField.burst` calls `new BurstEffect(scene, item, uv, onComplete)` — Task 5 provides that class; until then use the temporary stub shown in Step 3.

- [ ] **Step 1: Write `src/FlowItem.js`**

```js
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
```

- [ ] **Step 2: Write `src/FlowField.js`**

```js
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
```

- [ ] **Step 3: Temporary `src/BurstEffect.js` stub** (replaced in Task 5; lets the flow render and click-reset work now)

```js
export class BurstEffect {
  constructor(scene, item, uv, onComplete) {
    setTimeout(onComplete, 600);
  }
}
```

- [ ] **Step 4: Replace `src/main.js` entirely**

```js
import * as THREE from 'three';
import { loadTextures } from './assets.js';
import { FlowField } from './FlowField.js';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
camera.position.z = 10;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function pointerToNdc(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

function resize(field) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.left = -w / 2;
  camera.right = w / 2;
  camera.top = h / 2;
  camera.bottom = -h / 2;
  camera.updateProjectionMatrix();
  field.resize(w, h);
}

async function init() {
  const entries = await loadTextures();
  const field = new FlowField(scene, entries, reducedMotion);
  resize(field);
  window.addEventListener('resize', () => resize(field));

  window.addEventListener('pointermove', (e) => {
    pointerToNdc(e);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(field.meshes())[0];
    canvas.classList.toggle('hovering', !!hit);
  });

  window.addEventListener('click', (e) => {
    pointerToNdc(e);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(field.meshes())[0];
    if (hit) field.burst(hit.object.userData.item, hit.uv);
  });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    field.update(dt, clock.elapsedTime);
    renderer.render(scene, camera);
  });

  canvas.classList.add('ready');
}

init();
```

- [ ] **Step 5: Verify in browser**

Reload the page. Expected:
- Images fade in and drift upward, small at bottom-center, larger and spread wide near the top — an inverted funnel silhouette.
- Images evaporate near the top and re-enter at the bottom.
- Cursor becomes a pointer over an image; clicking hides it briefly, then it re-enters at the bottom (stub behavior).
- Console clean of errors.

- [ ] **Step 6: Commit**

```bash
git add src/FlowItem.js src/FlowField.js src/BurstEffect.js src/main.js
git commit -m "feat: funnel flow field with looping textured planes"
```

---

### Task 5: Burst effect

**Files:**
- Modify: `src/BurstEffect.js` (replace the stub entirely)

**Interfaces:**
- Consumes: `item.material.map`, `item.mesh.position/scale` (Task 4); `FlowField.burst` already calls `new BurstEffect(scene, item, uv, onComplete)` where `uv` is the raycast hit UV (`THREE.Vector2`, 0..1 on the plane).
- Produces: `class BurstEffect` — adds an instanced shard mesh at the item's transform, animates one `uProgress` uniform 0→1 with GSAP (shader does per-shard easing), then removes/disposes itself and calls `onComplete()`.

- [ ] **Step 1: Replace `src/BurstEffect.js`**

```js
import * as THREE from 'three';
import gsap from 'gsap';

const GRID = 24;
const COUNT = GRID * GRID;

const vertexShader = /* glsl */ `
  attribute vec3 aCell; // xy = cell center in plane space [-0.5,0.5], z = random seed
  uniform float uProgress;
  uniform vec2 uClick;  // click point in plane space [-0.5,0.5]
  varying vec2 vUv;
  varying float vFade;

  void main() {
    vec2 cell = aCell.xy;
    float seed = aCell.z;

    // each shard samples its own slice of the image
    vUv = (cell + 0.5) + (uv - 0.5) / ${GRID}.0;

    // shards closer to the click point fly hardest — a finger popping a bubble
    vec2 fromClick = cell - uClick;
    float dist = length(fromClick);
    vec2 dir = dist > 0.0001 ? fromClick / dist : vec2(0.0, 1.0);
    float force = 0.9 / (dist * 3.0 + 0.4);

    // per-shard stagger + cubic ease-out (GSAP drives uProgress linearly)
    float t = clamp(uProgress * (1.0 + seed * 0.7), 0.0, 1.0);
    float eased = 1.0 - pow(1.0 - t, 3.0);
    vFade = 1.0 - eased;

    vec2 jitter = vec2(sin(seed * 78.233), cos(seed * 12.9898)) * 0.3;
    vec2 center = cell + (dir * force + jitter + vec2(0.0, 0.18)) * eased;

    // spin and shrink each shard as it flies
    float angle = (seed - 0.5) * 7.0 * eased;
    float c = cos(angle);
    float s = sin(angle);
    vec2 corner = mat2(c, -s, s, c) * position.xy * (1.0 - 0.6 * eased);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(center + corner, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying float vFade;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float alpha = tex.a * vFade;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(tex.rgb, alpha);
  }
`;

export class BurstEffect {
  constructor(scene, item, uv, onComplete) {
    const base = new THREE.PlaneGeometry(1 / GRID, 1 / GRID);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute('position', base.attributes.position);
    geometry.setAttribute('uv', base.attributes.uv);
    geometry.instanceCount = COUNT;

    const cells = new Float32Array(COUNT * 3);
    let k = 0;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        cells[k++] = (x + 0.5) / GRID - 0.5;
        cells[k++] = (y + 0.5) / GRID - 0.5;
        cells[k++] = Math.random();
      }
    }
    geometry.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 3));

    const uniforms = {
      uMap: { value: item.material.map },
      uProgress: { value: 0 },
      uClick: { value: new THREE.Vector2(uv.x - 0.5, uv.y - 0.5) },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(item.mesh.position);
    this.mesh.scale.copy(item.mesh.scale);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    gsap.to(uniforms.uProgress, {
      value: 1,
      duration: 1.3,
      ease: 'none', // per-shard easing happens in the vertex shader
      onComplete: () => {
        scene.remove(this.mesh);
        geometry.dispose();
        material.dispose();
        onComplete();
      },
    });
  }
}
```

- [ ] **Step 2: Verify in browser**

Reload, then click several images (including two in quick succession). Expected:
- Clicked image shatters into ~576 shards of itself that fly outward from the click point, spin, shrink, and fade over ~1.3 s.
- Shards nearest the click travel farthest.
- The stream never pauses; burst image re-enters at the bottom shortly after.
- Two overlapping bursts run independently. Console clean.

- [ ] **Step 3: Commit**

```bash
git add src/BurstEffect.js
git commit -m "feat: instanced shader burst — click disperses image into texture shards"
```

---

### Task 6: Final verification + README

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: everything above. No new exports.

- [ ] **Step 1: Full verification pass**

- `npm run test` → all funnel tests pass.
- Dev server: console has zero errors/warnings after 60 s of idle flow.
- Screenshot confirms the inverted-funnel silhouette against the dotted background.
- Click-test bursts (single + simultaneous), confirm respawn.
- Resize the viewport (narrow/mobile width) → funnel bounds and image sizes adapt, no stretching or clipping errors.
- `npm run build` → builds without errors.

- [ ] **Step 2: Write `README.md`**

```markdown
# Image Spring

A WebGL page where images rise like water from a spring: they emerge small
at the bottom-center, spread and grow into an inverted funnel, evaporate at
the top, and loop back around. Click an image to burst it into particles of
itself — it rejoins the stream from the bottom.

Built with Three.js (orthographic scene, instanced shader burst), GSAP, and
Vite.

## Run

    npm install
    npm run dev

## Swap in your own images

Edit `IMAGE_URLS` in `src/assets.js` — one `{ url, aspect }` entry per
flowing image. `aspect` is height/width.

## Test

    npm run test
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README with usage and image-swap instructions"
```
