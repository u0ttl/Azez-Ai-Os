import * as THREE from "three";

export type CinematicVariant = "hero" | "ambient";

const VIOLET = new THREE.Color("#8b7cf6");
const CYAN = new THREE.Color("#38e1ff");
const MAGENTA = new THREE.Color("#e07cf6");
const STAR = new THREE.Color("#a9b8ff");

function fibonacciSphere(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    positions[i * 3] = Math.cos(theta) * r * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return positions;
}

function makePoints(positions: Float32Array, color: THREE.Color, size: number, opacity: number): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return new THREE.Points(geometry, material);
}

function makeStars(count: number, spread: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }
  return makePoints(positions, STAR, 0.035, 0.55);
}

function makeRing(radius: number, color: THREE.Color, opacity: number): THREE.Mesh {
  const geometry = new THREE.TorusGeometry(radius, 0.012, 12, 220);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Mesh(geometry, material);
}

export type CinematicGraph = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update: (time: number, pointer: { x: number; y: number }) => void;
  dispose: () => void;
  counts: { core: number; innerCore: number; stars: number; rings: number };
};

/**
 * Builds the full cinematic 3D scene graph (no renderer — the caller owns
 * rendering). Pure three.js: safe to construct in any environment, including
 * Node for automated verification.
 */
export function createCinematicGraph(variant: CinematicVariant): CinematicGraph {
  const isHero = variant === "hero";

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0616, 0.05);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
  camera.position.set(0, 0.7, 9.5);

  const world = new THREE.Group();
  scene.add(world);

  const coreCount = isHero ? 1500 : 700;
  const innerCount = Math.floor(coreCount / 2);
  const core = makePoints(fibonacciSphere(coreCount, 2.1), VIOLET, 0.05, isHero ? 0.95 : 0.5);
  const innerCore = makePoints(fibonacciSphere(innerCount, 1.25), CYAN, 0.045, isHero ? 0.9 : 0.45);
  world.add(core, innerCore);

  const rings: THREE.Mesh[] = [];
  if (isHero) {
    const ringA = makeRing(3.1, CYAN, 0.5);
    ringA.rotation.x = Math.PI / 2.35;
    ringA.rotation.y = 0.35;
    const ringB = makeRing(3.7, MAGENTA, 0.32);
    ringB.rotation.x = Math.PI / 1.8;
    ringB.rotation.y = -0.5;
    rings.push(ringA, ringB);
    world.add(ringA, ringB);
  }

  const starCount = isHero ? 1100 : 600;
  const stars = makeStars(starCount, 34);
  scene.add(stars);

  const update = (time: number, pointer: { x: number; y: number }) => {
    const t = time * 0.001;
    core.rotation.y = t * 0.12;
    core.rotation.x = Math.sin(t * 0.1) * 0.18;
    innerCore.rotation.y = -t * 0.2;
    innerCore.rotation.z = t * 0.08;
    const breathe = 1 + Math.sin(t * 0.9) * 0.03;
    core.scale.setScalar(breathe);
    innerCore.scale.setScalar(2 - breathe);
    rings.forEach((ring, index) => {
      ring.rotation.z = t * (index === 0 ? 0.16 : -0.11);
    });
    stars.rotation.y = t * 0.008;

    camera.position.x += (pointer.x * 0.9 - camera.position.x) * 0.04;
    camera.position.y += (0.7 - pointer.y * 0.6 - camera.position.y) * 0.04;
    camera.position.z = 9.5 + Math.sin(t * 0.22) * 0.35;
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  };

  const dispose = () => {
    const disposables: Array<{ dispose: () => void }> = [];
    world.traverse((object) => {
      const mesh = object as THREE.Mesh | THREE.Points;
      const geometry = (mesh as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
      const material = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (geometry) disposables.push(geometry);
      if (Array.isArray(material)) disposables.push(...material);
      else if (material) disposables.push(material);
    });
    disposables.push(stars.geometry, stars.material as THREE.Material);
    const seen = new Set(disposables);
    seen.forEach((d) => d.dispose());
  };

  return {
    scene,
    camera,
    update,
    dispose,
    counts: { core: coreCount, innerCore: innerCount, stars: starCount, rings: rings.length },
  };
}
