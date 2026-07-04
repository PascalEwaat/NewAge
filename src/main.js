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
