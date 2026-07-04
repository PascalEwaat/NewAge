# Image Spring — Design Spec

Date: 2026-07-05
Status: Approved by user ("All good, plan and build")

## Concept

A full-viewport WebGL page where images continuously emerge near the
bottom-center of the screen, rise upward while drifting outward and growing,
tracing an **inverted funnel** — narrow at the bottom, wide at the top —
like water bubbling from a spring or flames rising from a fire. At the top
edge images fade and dissolve out, then re-enter the flow at the bottom.
Clicking an image bursts it into particles of itself (a bubble popping);
the stream never pauses, and the burst image rejoins from the bottom.

Reference: user-provided mockup — light dotted background, rows of gray
rounded-corner image blocks forming an inverted funnel (4 large at top,
narrowing to 1 tiny at bottom).

## Decisions (user-confirmed)

- **Motion driver:** continuous auto-flow; no scroll required.
- **Images:** placeholder photos (picsum.photos or bundled set, ~20–24);
  swappable later via a single config array in `assets.js`.
- **Burst fate:** burst image respawns at the bottom of the funnel.
- **Mood:** light & airy — off-white background, subtle dot grid, calm
  water-spring pacing.
- **Stack:** Vite + vanilla JS, `three` and `gsap` from npm.
- **Purpose:** pure ambient visual experience — no links, captions, or nav.
- **Approach:** full WebGL (single Three.js scene, orthographic camera);
  GSAP for timing/easing; burst = instanced sub-quads sharing the image
  texture via UV offsets.

## Architecture

Vite + vanilla JS. Modules:

| Module | Responsibility |
|---|---|
| `main.js` | Bootstrap renderer/scene/camera, render loop, resize, pointer events |
| `FlowField.js` | Owns all flow items, funnel math, per-frame updates, raycast hit-testing |
| `FlowItem.js` | One image: textured plane mesh, loop progress state, wobble seed, burst/respawn state |
| `BurstEffect.js` | Instanced-mesh particle dispersal for one burst; self-disposing |
| `assets.js` | Image URL array + texture preloading with loading fade-in |

Orthographic camera mapped 1:1 to viewport pixels (2D feel). Canvas is
transparent; the off-white + dot-grid background is a CSS layer behind it.

## Funnel math

Each item holds normalized progress `p` (0 = bottom spawn → 1 = top exit),
advancing at a slow per-item speed (full journey ~25–35 s).

- `y = lerp(bottomY, topY, p)`
- `x = centerX + lane * spread(p)` — `spread(p)` widens with an ease-out
  curve; `lane` is the item's horizontal slot in [-1, 1], giving loose
  reference-style rows rather than a random cloud.
- Scale grows ~0.15× → 1× with `p`.
- Gentle per-item sine wobble on x (unique phase/frequency) for the
  bubbling feel.
- Near `p ≈ 1`: opacity and scale ease out — images "evaporate."
- ~20–24 items staggered in phase so the funnel always looks populated.

## Burst interaction

- Raycast on pointer click; cursor is `pointer` while hovering an image.
- On hit: hide the plane instantly; spawn a `BurstEffect` at its exact
  position/scale — a 24×24 instanced grid of sub-quads, each textured with
  its UV slice of the image.
- Particles fly outward from the click point (nearer particles move
  hardest), with slight rotation and staggered fade over ~1 s (GSAP).
- The item's progress resets after a short delay so it re-emerges at the
  bottom. Multiple simultaneous bursts are allowed and independent.

## Look

- Background `#f4f4f4`-range off-white with a subtle dot grid (CSS).
- Images: light rounded corners (shader or alpha-mapped corners), sizes
  echoing the reference (larger toward the top).
- Calm pacing throughout; no UI chrome.

## Performance & edge cases

- Shared plane geometry; textures preloaded before flow starts (fade-in).
- Instanced rendering for bursts; effects dispose themselves when done.
- `devicePixelRatio` capped at 2.
- Resize re-derives funnel bounds from the viewport.
- `prefers-reduced-motion`: drastically slowed flow; burst replaced by a
  simple fade-out/respawn.

## Verification

Run under the dev server with preview tooling: console clean of errors,
screenshot confirms funnel silhouette, click-testing confirms burst +
respawn, resize confirms responsive funnel bounds.
