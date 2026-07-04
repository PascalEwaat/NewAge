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
