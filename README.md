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
