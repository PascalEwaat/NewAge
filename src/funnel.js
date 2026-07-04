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
