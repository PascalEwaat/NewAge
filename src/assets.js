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
