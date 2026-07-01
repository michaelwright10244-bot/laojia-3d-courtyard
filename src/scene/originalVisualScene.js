import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGPU from 'three/addons/capabilities/WebGPU.js';

const canvas = document.querySelector('#scene');
const renderBadge = document.querySelector('#render-badge');
const useWebGPU = WebGPU.isAvailable();
const renderer = new THREE.WebGPURenderer({
  canvas,
  antialias: true,
  alpha: true,
  forceWebGL: !useWebGPU
});
await renderer.init();

const isTouchDevice = matchMedia('(pointer: coarse)').matches;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouchDevice ? 1.2 : 1.65));
renderer.setSize(window.innerWidth, window.innerHeight);
if (renderer.shadowMap) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderBadge.textContent = useWebGPU ? 'WebGPU 梦境增强' : 'WebGL 兼容梦境';

const scene = new THREE.Scene();
scene.background = new THREE.Color('#b5d9f0');

const camera = new THREE.OrthographicCamera(-36, 36, 24, -24, 0.1, 360);
camera.position.set(-64, 76, 118);
const walkCamera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.08, 260);
walkCamera.position.set(2.1, 2.0, 15.5);
walkCamera.rotation.order = 'YXZ';
let activeCamera = camera;

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(4, 3.6, 4);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minZoom = 0.42;
controls.maxZoom = 2.25;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minPolarAngle = 0.3;

const ambient = new THREE.AmbientLight('#ffffff', 0.48);
const hemi = new THREE.HemisphereLight('#e7f6ff', '#8f9168', 1.18);
const sun = new THREE.DirectionalLight('#fff2d8', 3.2);
sun.position.set(18, 28, 16);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -82;
sun.shadow.camera.right = 82;
sun.shadow.camera.top = 82;
sun.shadow.camera.bottom = -82;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 90;
const fill = new THREE.DirectionalLight('#8cd8ff', 0.5);
fill.position.set(-16, 12, -12);
scene.add(ambient, hemi, sun, fill);

const startTime = performance.now();
const labels = new THREE.Group();
const planOverlay = new THREE.Group();
const gisOverlay = new THREE.Group();
const gisLayers = {
  poi: new THREE.Group(),
  heat: new THREE.Group(),
  story: new THREE.Group()
};
Object.values(gisLayers).forEach(layer => gisOverlay.add(layer));
const animated = [];
scene.add(labels, planOverlay, gisOverlay);
labels.visible = false;
planOverlay.visible = false;
gisOverlay.visible = true;
gisLayers.story.visible = false;
let viewMode = 'overview';
let ecologyRunning = true;
const keyState = new Set();
const walkInput = { x: 0, y: 0 };
const walkState = { yaw: -0.05, pitch: -0.06, speed: 7.2 };
const playerState = { position: new THREE.Vector3(2.1, 0.02, 15.5) };
let personView = 'first';
let playerAvatar = null;
const guideState = { duration: 68 };
const walkBounds = { minX: -86, maxX: 86, minZ: -72, maxZ: 70 };
const guidedRoute = new THREE.CatmullRomCurve3([
  new THREE.Vector3(2.1, 2.4, 12.5),
  new THREE.Vector3(-18, 2.7, 17.5),
  new THREE.Vector3(-44, 2.7, 33.0),
  new THREE.Vector3(-45, 2.8, -4.0),
  new THREE.Vector3(-58, 3.2, -28.0),
  new THREE.Vector3(6, 3.2, 48.0),
  new THREE.Vector3(44, 5.5, 38.0),
  new THREE.Vector3(52, 11.0, -14.0),
  new THREE.Vector3(8, 5.0, -38.0),
  new THREE.Vector3(2.1, 2.4, 12.5)
]);
const detailTitle = document.querySelector('#detail-title');
const detailText = document.querySelector('#detail-text');
const joyZone = document.querySelector('#joy-zone');
const joyKnob = document.querySelector('#joy-knob');
const viewToggle = document.querySelector('#view-toggle');
const layerButtons = document.querySelectorAll('[data-layer]');
const opsHeartbeat = document.querySelector('#ops-heartbeat');
const opsDream = document.querySelector('#ops-dream');
const opsHeat = document.querySelector('#ops-heat');
const gisLayerState = {
  poi: true,
  heat: false,
  story: false
};
const modeCopy = {
  overview: ['终局总览：梦幻 GIS 小城', '从终局效果反推：真实地块和路网作为 GIS 底座，只叠加 POI、人流、生态状态和故事光标，远看清透，近看有生活颗粒。'],
  walk: ['沉浸漫游：街边级仿真', 'WASD 或安卓摇杆移动，拖动右侧屏幕转向；院落、湖岸、古镇、校园、住宅和 CBD 都能进入近景查看。'],
  guided: ['梦境导览：一镜到底展示', '固定飞行路线串联老家、农田、村庄、古镇、湖岸、CBD、学校与住宅区，用来给客户直接看最终效果。'],
  eco: ['仿真运行：城市正在呼吸', '村民、无人机、炊烟、火光和故事光标持续运行；再次点击可暂停或恢复生态系统。'],
  map: ['GIS 叠加：数据骨架显性化', '显示坐标网格、地块边界、功能分区、POI 光标和 1.8m 比例尺，证明梦幻皮肤下面仍是可扩展的 GIS 数据结构。']
};

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = createSeededRandom(20260625);

const SCALE = Object.freeze({
  tileMeters: 2,
  adultHeight: 0.9,
  floorHeight: 1.5,
  road: { rural: 1.75, secondary: 4.5, arterial: 8.25 },
  grid: 0.5
});
const floorHeight = (floors) => floors * SCALE.floorHeight;
const ROAD_VISUAL_SCALE = 0.46;
const snapGrid = (value) => Math.round(value / SCALE.grid) * SCALE.grid;
const snapPoint = (x, z) => [snapGrid(x), snapGrid(z)];

function canvasTexture(draw, width = 512, height = 512) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const plasterTexture = canvasTexture((ctx, w, h) => {
  ctx.fillStyle = '#f3f0ea';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 1200; i += 1) {
    const shade = 228 + Math.floor(rand() * 18);
    ctx.fillStyle = `rgba(${shade},${shade - 3},${shade - 7},${0.035 + rand() * 0.055})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 5, 1 + rand() * 3);
  }
  ctx.strokeStyle = 'rgba(168, 156, 142, 0.08)';
  for (let y = 18; y < h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(y) * 1.2);
    ctx.lineTo(w, y - Math.sin(y) * 1.2);
    ctx.stroke();
  }
});
plasterTexture.repeat.set(2.4, 1.8);

const tileTexture = canvasTexture((ctx, w, h) => {
  ctx.fillStyle = '#ded8cf';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(112, 108, 98, 0.24)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= w; x += 54) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y <= h; y += 54) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  for (let i = 0; i < 360; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.06})`;
    ctx.fillRect(rand() * w, rand() * h, 4, 4);
  }
});
tileTexture.repeat.set(2.8, 1.9);

const roofTexture = canvasTexture((ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#75503d');
  g.addColorStop(1, '#4d392d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(22,18,16,0.26)';
  ctx.lineWidth = 5;
  for (let y = 18; y < h; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + Math.sin(y) * 2); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(245,226,198,0.08)';
  ctx.lineWidth = 2;
  for (let x = 16; x < w; x += 42) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 12, h); ctx.stroke();
  }
});
roofTexture.repeat.set(2.8, 2.4);

const concreteTexture = canvasTexture((ctx, w, h) => {
  ctx.fillStyle = '#d4cfc4';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(126, 130, 134, 0.18)';
  ctx.lineWidth = 2;
  for (let y = 32; y < h; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + Math.sin(y * 0.3) * 2); ctx.stroke();
  }
  for (let i = 0; i < 700; i += 1) {
    const value = 184 + Math.floor(rand() * 34);
    ctx.fillStyle = `rgba(${value},${value},${value},${0.04 + rand() * 0.05})`;
    ctx.fillRect(rand() * w, rand() * h, 2, 2);
  }
});
concreteTexture.repeat.set(2.7, 2.7);

const soilTexture = canvasTexture((ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#8f6a44');
  g.addColorStop(1, '#5f4024');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(41, 23, 12, 0.3)';
  ctx.lineWidth = 9;
  for (let y = 18; y < h; y += 28) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y - 8); ctx.stroke();
  }
  for (let i = 0; i < 450; i += 1) {
    ctx.fillStyle = `rgba(${80 + Math.floor(rand() * 45)},${48 + Math.floor(rand() * 26)},${24 + Math.floor(rand() * 18)},0.2)`;
    ctx.beginPath(); ctx.arc(rand() * w, rand() * h, 1 + rand() * 2.2, 0, Math.PI * 2); ctx.fill();
  }
});
soilTexture.repeat.set(2.2, 3.1);

const grassTexture = canvasTexture((ctx, w, h) => {
  ctx.fillStyle = '#86a961';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 1000; i += 1) {
    ctx.strokeStyle = `rgba(${55 + rand() * 40},${96 + rand() * 56},${44 + rand() * 32},0.26)`;
    const x = rand() * w;
    const y = rand() * h;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rand() * 5 - 2, y - 3 - rand() * 6); ctx.stroke();
  }
});
grassTexture.repeat.set(8, 8);

const strawTexture = canvasTexture((ctx, w, h) => {
  ctx.fillStyle = '#c7a25a';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 1200; i += 1) {
    const tone = 155 + Math.floor(rand() * 75);
    ctx.strokeStyle = `rgba(${tone + 28},${tone + 8},${72 + rand() * 34},0.42)`;
    ctx.lineWidth = 1 + rand() * 1.5;
    const x = rand() * w;
    const y = rand() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rand() * 42 - 21, y + rand() * 16 - 8);
    ctx.stroke();
  }
});
strawTexture.repeat.set(4, 4);

function pixelTexture(base, accents = [], size = 16) {
  return canvasTexture((ctx, w, h) => {
    const cell = w / size;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const color = accents[Math.floor(rand() * accents.length)] || base;
        if (rand() > 0.42) {
          ctx.fillStyle = color;
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.14)';
    ctx.lineWidth = cell * 0.18;
    for (let i = 0; i <= size; i += 1) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(w, i * cell); ctx.stroke();
    }
  }, 128, 128);
}

function sharpenTexture(texture) {
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

const voxelTextures = {
  grassTop: sharpenTexture(pixelTexture('#6da642', ['#7fbd4b', '#4f8434', '#8fce5a', '#5d9a3d'])),
  grassSide: sharpenTexture(pixelTexture('#7c5a34', ['#5e3e25', '#8b633b', '#68a143', '#4f8434'])),
  dirt: sharpenTexture(pixelTexture('#74502f', ['#5b3a22', '#8d6841', '#9b7245'])),
  stone: sharpenTexture(pixelTexture('#8b8f86', ['#6f746d', '#a1a69c', '#777b73'])),
  planks: sharpenTexture(pixelTexture('#8b5b31', ['#6f4324', '#a06b3b', '#c1844a'])),
  leaves: sharpenTexture(pixelTexture('#4f8f39', ['#3d7330', '#66a94a', '#72ba54'])),
  water: sharpenTexture(pixelTexture('#3f9fcc', ['#51b8df', '#2e7fab', '#78d8ee'])),
  hay: sharpenTexture(pixelTexture('#d0aa45', ['#b98c2f', '#e2c566', '#f0d678'])),
  wool: sharpenTexture(pixelTexture('#f0eee0', ['#d8d4c4', '#ffffff', '#c8c1ad'])),
  cloud: sharpenTexture(pixelTexture('#eef7f3', ['#d9e7e4', '#ffffff', '#c9d9d5']))
};

const voxelMaterials = {
  grassTop: new THREE.MeshStandardMaterial({ color: '#ffffff', map: voxelTextures.grassTop, roughness: 1 }),
  grassSide: new THREE.MeshStandardMaterial({ color: '#ffffff', map: voxelTextures.grassSide, roughness: 1 }),
  dirt: new THREE.MeshStandardMaterial({ color: '#ffffff', map: voxelTextures.dirt, roughness: 1 }),
  stone: new THREE.MeshStandardMaterial({ color: '#ffffff', map: voxelTextures.stone, roughness: 1 }),
  planks: new THREE.MeshStandardMaterial({ color: '#ffffff', map: voxelTextures.planks, roughness: 0.92 }),
  leaves: new THREE.MeshStandardMaterial({ color: '#ffffff', map: voxelTextures.leaves, roughness: 1 }),
  water: new THREE.MeshPhysicalMaterial({ color: '#6fd7f2', map: voxelTextures.water, roughness: 0.22, transparent: true, opacity: 0.72, transmission: 0.12 }),
  hay: new THREE.MeshStandardMaterial({ color: '#ffffff', map: voxelTextures.hay, roughness: 1 }),
  wool: new THREE.MeshStandardMaterial({ color: '#ffffff', map: voxelTextures.wool, roughness: 0.95 }),
  cloud: new THREE.MeshBasicMaterial({ color: '#ffffff', map: voxelTextures.cloud, transparent: true, opacity: 0.86 })
};

const grassBlockMaterials = [
  voxelMaterials.grassSide, voxelMaterials.grassSide,
  voxelMaterials.grassTop, voxelMaterials.dirt,
  voxelMaterials.grassSide, voxelMaterials.grassSide
];

const materials = {
  smoothWall: new THREE.MeshStandardMaterial({ color: '#f6f2eb', map: plasterTexture, roughness: 0.98 }),
  tileWall: new THREE.MeshStandardMaterial({ color: '#e3ddd2', map: tileTexture, roughness: 0.9 }),
  concrete: new THREE.MeshStandardMaterial({ color: '#d7d1c5', map: concreteTexture, roughness: 0.98 }),
  trim: new THREE.MeshStandardMaterial({ color: '#d0c6b8', roughness: 0.84 }),
  portal: new THREE.MeshStandardMaterial({ color: '#74787c', roughness: 0.86 }),
  roof: new THREE.MeshStandardMaterial({ color: '#684534', map: roofTexture, roughness: 0.92, metalness: 0.03 }),
  ridge: new THREE.MeshStandardMaterial({ color: '#5f4333', roughness: 0.84 }),
  eave: new THREE.MeshStandardMaterial({ color: '#8f3f28', roughness: 0.78 }),
  frame: new THREE.MeshStandardMaterial({ color: '#20262d', roughness: 0.46, metalness: 0.2 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#547ca4', roughness: 0.16, metalness: 0.04, clearcoat: 0.3, transparent: true, opacity: 0.84 }),
  dark: new THREE.MeshStandardMaterial({ color: '#474c4a', roughness: 0.8 }),
  wood: new THREE.MeshStandardMaterial({ color: '#7a5031', roughness: 0.92 }),
  cutWood: new THREE.MeshStandardMaterial({ color: '#d1a66b', roughness: 0.86 }),
  bark: new THREE.MeshStandardMaterial({ color: '#6e4729', roughness: 1 }),
  dirtyWall: new THREE.MeshStandardMaterial({ color: '#cfc7b9', map: plasterTexture, roughness: 0.98 }),
  pipe: new THREE.MeshStandardMaterial({ color: '#139555', roughness: 0.5, metalness: 0.05 }),
  straw: new THREE.MeshStandardMaterial({ color: '#c9a257', map: strawTexture, roughness: 1 }),
  tarp: new THREE.MeshStandardMaterial({ color: '#f2f3ed', roughness: 0.86, transparent: true, opacity: 0.94 }),
  soil: new THREE.MeshStandardMaterial({ color: '#6b4528', map: soilTexture, roughness: 1 }),
  leaf: new THREE.MeshStandardMaterial({ color: '#6c9955', roughness: 0.9 }),
  grass: new THREE.MeshStandardMaterial({ color: '#8fb56a', map: grassTexture, roughness: 1 }),
  grain: new THREE.MeshStandardMaterial({ color: '#c99a45', roughness: 0.96 }),
  red: new THREE.MeshStandardMaterial({ color: '#b6211e', emissive: '#7d1312', emissiveIntensity: 0.08, roughness: 0.55 }),
  accent: new THREE.MeshStandardMaterial({ color: '#64dcc7', emissive: '#64dcc7', emissiveIntensity: 0.16, roughness: 0.3 }),
  bluePlastic: new THREE.MeshStandardMaterial({ color: '#2476a8', roughness: 0.62 }),
  yellowPlastic: new THREE.MeshStandardMaterial({ color: '#d5a638', roughness: 0.68 }),
  greenPlastic: new THREE.MeshStandardMaterial({ color: '#298451', roughness: 0.62 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#151719', roughness: 0.74 }),
  windowGlow: new THREE.MeshBasicMaterial({ color: '#ffcf72' }),
  ember: new THREE.MeshBasicMaterial({ color: '#ff7b3d', transparent: true, opacity: 0.82, depthWrite: false }),
  road: new THREE.MeshStandardMaterial({ color: '#9c927f', roughness: 0.96 }),
  roadEdge: new THREE.MeshStandardMaterial({ color: '#ddd0a6', roughness: 0.88 }),
  sidewalk: new THREE.MeshStandardMaterial({ color: '#d8d0bd', roughness: 0.92 }),
  laneMark: new THREE.MeshBasicMaterial({ color: '#fff3c4' }),
  plazaTile: new THREE.MeshStandardMaterial({ color: '#b7afa1', roughness: 0.94 }),
  reed: new THREE.MeshStandardMaterial({ color: '#7d8f47', roughness: 1 }),
  rail: new THREE.MeshStandardMaterial({ color: '#d9c7a0', roughness: 0.72 }),
  crop: new THREE.MeshStandardMaterial({ color: '#6fab43', roughness: 0.92 }),
  cropGold: new THREE.MeshStandardMaterial({ color: '#d1a94a', roughness: 0.95 }),
  water: new THREE.MeshPhysicalMaterial({ color: '#61c8df', roughness: 0.2, transparent: true, opacity: 0.72, clearcoat: 0.35 }),
  futureGlass: new THREE.MeshPhysicalMaterial({ color: '#9fc7cf', roughness: 0.24, metalness: 0.08, transparent: true, opacity: 0.58, clearcoat: 0.42 }),
  futureMetal: new THREE.MeshStandardMaterial({ color: '#27333a', roughness: 0.32, metalness: 0.55 }),
  neonCyan: new THREE.MeshBasicMaterial({ color: '#64dcc7' }),
  neonAmber: new THREE.MeshBasicMaterial({ color: '#ffbe63' })
};

function box(width, height, depth, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(rt, rb, h, material, segments = 18) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function roundedPlane(width, depth, radius, material) {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hd = depth / 2;
  shape.moveTo(-hw + radius, -hd);
  shape.lineTo(hw - radius, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + radius);
  shape.lineTo(hw, hd - radius);
  shape.quadraticCurveTo(hw, hd, hw - radius, hd);
  shape.lineTo(-hw + radius, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - radius);
  shape.lineTo(-hw, -hd + radius);
  shape.quadraticCurveTo(-hw, -hd, -hw + radius, -hd);
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function applyShadows(group) {
  group.traverse(child => {
    if (child.isMesh && !child.userData.noShadow) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

function createFacadeOpening(width, height, options = {}) {
  const frameColor = options.frameColor || '#2b3035';
  const trimColor = options.trimColor || '#67c6dc';
  const group = new THREE.Group();
  const frame = box(width, height, 0.16, new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.58, metalness: 0.12 }));
  const glass = box(width - 0.16, height - 0.16, 0.045, materials.glass, 0, 0, 0.075);
  const vertical = box(0.055, height - 0.2, 0.18, materials.frame, 0, 0, 0.12);
  const middle = box(width - 0.18, 0.05, 0.18, materials.frame, 0, 0, 0.12);
  const sill = box(width + 0.18, 0.06, 0.18, materials.trim, 0, -height / 2 - 0.07, 0.03);
  const topTape = box(width - 0.18, 0.045, 0.06, new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.3, emissive: trimColor, emissiveIntensity: 0.08 }), 0, height / 2 - 0.1, 0.13);
  group.add(frame, glass, vertical, middle, sill, topTape);
  return applyShadows(group);
}

function createRoof(width, depth, rise, overhang = 0.32) {
  const roof = new THREE.Group();
  const halfDepth = depth / 2 + overhang;
  const length = width + overhang * 2;
  const profile = new THREE.Shape();
  profile.moveTo(-halfDepth, 0);
  profile.lineTo(0, rise);
  profile.lineTo(halfDepth, 0);
  profile.lineTo(-halfDepth, 0);
  const roofGeom = new THREE.ExtrudeGeometry(profile, { depth: length, bevelEnabled: false, steps: 1, curveSegments: 1 });
  roofGeom.rotateY(Math.PI / 2);
  roofGeom.translate(-length / 2, 0, 0);
  roof.add(new THREE.Mesh(roofGeom, materials.roof));
  roof.add(box(length * 0.98, 0.12, 0.2, materials.ridge, 0, rise + 0.02, 0));

  const rows = 10;
  const slope = Math.atan(rise / halfDepth);
  for (let i = 1; i <= rows; i += 1) {
    const t = i / (rows + 1);
    const z = (1 - t) * halfDepth;
    const y = t * rise + 0.04;
    const front = box(length * 0.99, 0.032, 0.06, materials.ridge, 0, y, z);
    front.rotation.x = -slope;
    const back = front.clone();
    back.position.z = -z;
    back.rotation.x = slope;
    roof.add(front, back);
  }

  const capCount = Math.max(18, Math.floor(length / 0.55));
  for (let i = 0; i <= capCount; i += 1) {
    const cap = cylinder(0.07, 0.07, 0.22, materials.ridge, 12);
    cap.rotation.z = Math.PI / 2;
    cap.position.set(-length / 2 + (length / capCount) * i, rise + 0.11, 0);
    roof.add(cap);
  }

  roof.add(box(length + 0.1, 0.12, 0.18, materials.eave, 0, 0.02, halfDepth - 0.1));
  roof.add(box(length + 0.1, 0.12, 0.18, materials.eave, 0, 0.02, -halfDepth + 0.1));
  roof.add(box(0.18, 0.12, depth + 0.08, materials.eave, -length / 2 + 0.04, 0.02, 0));
  roof.add(box(0.18, 0.12, depth + 0.08, materials.eave, length / 2 - 0.04, 0.02, 0));
  return applyShadows(roof);
}

function createShedRoof(width, depth, rise = 0.42, thickness = 0.14) {
  const shape = new THREE.Shape();
  const hd = depth / 2;
  shape.moveTo(-hd, 0);
  shape.lineTo(hd, rise);
  shape.lineTo(hd, rise + thickness);
  shape.lineTo(-hd, thickness);
  shape.lineTo(-hd, 0);
  const geom = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, steps: 1 });
  geom.rotateY(Math.PI / 2);
  geom.translate(-width / 2, 0, 0);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geom, materials.roof));
  group.add(box(width + 0.1, 0.12, 0.16, materials.eave, 0, thickness * 0.45, -hd + 0.02));
  group.add(box(width + 0.1, 0.1, 0.14, materials.ridge, 0, rise + thickness * 0.9, hd - 0.02));
  return applyShadows(group);
}

function createSmokeTrail() {
  const group = new THREE.Group();
  const puffGeometry = new THREE.SphereGeometry(0.28, 12, 8);
  for (let i = 0; i < 7; i += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: '#d9e6de',
      transparent: true,
      opacity: 0.18,
      depthWrite: false
    });
    const puff = new THREE.Mesh(puffGeometry, material);
    puff.userData = {
      noShadow: true,
      offset: i / 7,
      sway: 0.8 + rand() * 0.45,
      phase: rand() * Math.PI * 2
    };
    group.add(puff);
  }

  animated.push((elapsed) => {
    group.children.forEach((puff) => {
      const cycle = (elapsed * 0.075 + puff.userData.offset) % 1;
      const drift = Math.sin(elapsed * puff.userData.sway + puff.userData.phase);
      puff.position.set(drift * 0.18 * cycle, cycle * 1.75, -cycle * 0.1);
      puff.scale.setScalar(0.34 + cycle * 1.08);
      puff.material.opacity = Math.max(0, 0.2 * (1 - cycle));
    });
  });

  return group;
}

function createDoorAssembly() {
  const group = new THREE.Group();
  group.add(box(2.18, 2.72, 0.2, materials.portal));
  group.add(box(1.94, 2.4, 0.08, materials.frame, 0, 0, 0.07));
  const leafA = box(0.9, 2.14, 0.045, new THREE.MeshStandardMaterial({ color: '#22262a', roughness: 0.48, metalness: 0.12 }), -0.46, -0.03, 0.12);
  const leafB = leafA.clone();
  leafB.position.x = 0.46;
  group.add(leafA, leafB);
  [-0.46, 0.46].forEach(x => {
    group.add(box(0.58, 0.045, 0.06, materials.trim, x, 0.52, 0.17));
    group.add(box(0.58, 0.045, 0.06, materials.trim, x, -0.24, 0.17));
  });
  const handleA = cylinder(0.032, 0.032, 0.34, new THREE.MeshStandardMaterial({ color: '#caa766', roughness: 0.28, metalness: 0.45 }), 14);
  handleA.rotation.x = Math.PI / 2;
  handleA.position.set(-0.12, -0.05, 0.21);
  const handleB = handleA.clone();
  handleB.position.x = 0.12;
  group.add(handleA, handleB, box(2.0, 0.12, 0.1, materials.trim, 0, -1.18, 0.04));
  return applyShadows(group);
}

function createMainHouseDetailLayer(width, depth, baseTop, wallHeight, lowerFrontZ) {
  const group = new THREE.Group();
  const frontZ = lowerFrontZ + 0.14;
  const backZ = -depth / 2 - 0.08;
  const cornerMat = new THREE.MeshStandardMaterial({ color: '#ede7da', map: plasterTexture, roughness: 0.96 });
  const sillMat = new THREE.MeshStandardMaterial({ color: '#d7d0c0', roughness: 0.9 });
  const shadowMat = new THREE.MeshStandardMaterial({ color: '#c9bdaa', roughness: 0.94 });

  group.add(box(width + 0.22, 0.34, 0.18, materials.dirtyWall, 0, baseTop + 0.16, frontZ));
  group.add(box(width + 0.26, 0.12, 0.17, materials.trim, 0, baseTop + 2.62, frontZ + 0.02));
  group.add(box(width + 0.08, 0.06, 0.12, shadowMat, 0, baseTop + 2.48, frontZ + 0.04));

  [-1, 1].forEach((side) => {
    const x = side * (width / 2 - 0.12);
    group.add(box(0.22, wallHeight - 0.32, 0.24, cornerMat, x, baseTop + (wallHeight - 0.32) / 2, frontZ));
    group.add(box(0.22, wallHeight - 0.42, 0.18, cornerMat, x, baseTop + (wallHeight - 0.42) / 2, backZ));
  });

  [-4.9, 4.9].forEach((x) => {
    group.add(box(2.16, 0.12, 0.34, sillMat, x, baseTop + 2.18, frontZ + 0.08));
    group.add(box(2.0, 0.08, 0.28, materials.trim, x, baseTop + 0.66, frontZ + 0.1));
  });
  [-4.85, 0, 4.85].forEach((x) => {
    group.add(box(1.66, 0.08, 0.24, sillMat, x, baseTop + 3.92, depth / 2 + 0.82));
  });

  const porchAwning = box(3.05, 0.16, 0.64, sillMat, 0, baseTop + 2.72, lowerFrontZ + 0.43);
  porchAwning.rotation.x = THREE.MathUtils.degToRad(-4);
  group.add(porchAwning);
  group.add(box(0.36, 0.12, 0.26, materials.portal, -1.34, baseTop + 2.59, lowerFrontZ + 0.38));
  group.add(box(0.36, 0.12, 0.26, materials.portal, 1.34, baseTop + 2.59, lowerFrontZ + 0.38));

  const frontGutter = cylinder(0.045, 0.045, width + 1.4, materials.pipe, 16);
  frontGutter.rotation.z = Math.PI / 2;
  frontGutter.position.set(0, baseTop + wallHeight + 0.03, depth / 2 + 0.86);
  const backGutter = frontGutter.clone();
  backGutter.position.z = -depth / 2 - 0.74;
  group.add(frontGutter, backGutter);

  const meter = box(0.42, 0.5, 0.08, materials.frame, 2.42, baseTop + 1.28, frontZ + 0.08);
  const meterFace = box(0.28, 0.22, 0.03, materials.windowGlow, 2.42, baseTop + 1.34, frontZ + 0.14);
  meter.userData.noShadow = true;
  meterFace.userData.noShadow = true;
  group.add(meter, meterFace);

  return applyShadows(group);
}

function createMainHouse() {
  const group = new THREE.Group();
  const width = 15.0;
  const depth = 11.2;
  const wallHeight = 4.08;
  const roofRise = 1.48;
  const baseTop = 0.48;
  const lowerFrontZ = depth / 2 + 0.02;
  const upperFrontZ = depth / 2 + 0.68;

  group.add(box(15.3, 0.52, 11.9, materials.concrete, 0, 0.26, 0));
  group.add(box(width, wallHeight, depth, materials.smoothWall, 0, baseTop + wallHeight / 2, 0));
  group.add(box(width - 0.08, 2.95, 0.16, materials.tileWall, 0, baseTop + 1.48, lowerFrontZ));
  group.add(box(width + 0.25, 1.34, 0.68, materials.tileWall, 0, baseTop + 3.56, depth / 2 + 0.34));
  group.add(box(width + 0.36, 0.18, 0.9, materials.trim, 0, baseTop + 2.78, depth / 2 + 0.36));
  group.add(box(width + 0.18, 0.05, 0.08, materials.dark, 0, baseTop + 2.76, depth / 2 - 0.03));
  group.add(box(width - 0.15, 0.05, 0.12, materials.trim, 0, baseTop + 2.95, lowerFrontZ + 0.09));

  group.add(createMainHouseDetailLayer(width, depth, baseTop, wallHeight, lowerFrontZ));

  const portal = box(2.28, 2.54, 0.24, materials.portal, 0, baseTop + 1.27, lowerFrontZ + 0.06);
  group.add(portal);
  const door = createDoorAssembly();
  door.scale.set(0.84, 0.84, 1);
  door.position.set(0, baseTop + 1.14, lowerFrontZ + 0.16);
  group.add(door);

  [-1.3, 1.3].forEach(x => group.add(box(0.22, 1.95, 0.04, materials.red, x, baseTop + 1.22, lowerFrontZ + 0.26)));
  group.add(box(1.28, 0.24, 0.04, materials.red, 0, baseTop + 2.34, lowerFrontZ + 0.26));
  group.add(box(width + 0.5, 0.16, 0.14, materials.eave, 0, baseTop + 2.66, upperFrontZ + 0.24));

  [-5.05, 0, 5.05].forEach(x => {
    const brace = box(0.14, 0.88, 0.14, materials.trim, x, baseTop + 2.34, lowerFrontZ + 0.16);
    brace.rotation.x = THREE.MathUtils.degToRad(34);
    group.add(brace);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 10), new THREE.MeshStandardMaterial({ color: '#f7f1df', emissive: '#ffbe63', emissiveIntensity: 0.15, roughness: 0.35 }));
    lamp.position.set(x, baseTop + 2.48, depth / 2 + 0.72);
    group.add(lamp);
  });

  [-7.18, 7.18].forEach(x => {
    const downPipe = cylinder(0.035, 0.035, 3.2, materials.pipe, 12);
    downPipe.position.set(x, baseTop + 1.6, lowerFrontZ + 0.19);
    const elbow = cylinder(0.03, 0.03, 0.52, materials.pipe, 12);
    elbow.rotation.z = Math.PI / 2;
    elbow.position.set(x - Math.sign(x) * 0.22, baseTop + 3.18, lowerFrontZ + 0.2);
    group.add(downPipe, elbow);
  });

  group.add(box(3.1, 0.12, 1.04, materials.concrete, 0, 0.06, lowerFrontZ + 0.52));
  group.add(box(2.74, 0.11, 0.82, materials.concrete, 0, 0.19, lowerFrontZ + 0.76));
  group.add(box(2.36, 0.1, 0.62, materials.concrete, 0, 0.31, lowerFrontZ + 0.96));

  const leftWindow = createFacadeOpening(1.78, 1.44);
  leftWindow.position.set(-4.9, baseTop + 1.42, lowerFrontZ + 0.03);
  const rightWindow = createFacadeOpening(1.78, 1.44);
  rightWindow.position.set(4.9, baseTop + 1.42, lowerFrontZ + 0.03);
  group.add(leftWindow, rightWindow);

  [-4.85, 0, 4.85].forEach(x => {
    const upper = createFacadeOpening(1.28, 0.76, { frameColor: '#23272c', trimColor: '#79d5e2' });
    upper.position.set(x, baseTop + 3.42, upperFrontZ + 0.09);
    group.add(upper);
  });

  const backOpenings = [
    { x: -4.55, z: -depth / 2 - 0.02, w: 1.55, h: 1.45 },
    { x: 0.65, z: -depth / 2 - 0.02, w: 1.18, h: 2.05 }
  ];
  backOpenings.forEach((item, index) => {
    const opening = index === 1 ? createDoorAssembly() : createFacadeOpening(item.w, item.h, { frameColor: '#23272c', trimColor: '#7ecfe0' });
    opening.scale.set(index === 1 ? 0.56 : 1, index === 1 ? 0.76 : 1, 1);
    opening.position.set(item.x, baseTop + (index === 1 ? 1.35 : 1.48), item.z);
    opening.rotation.y = Math.PI;
    group.add(opening);
  });

  const gableHeight = roofRise - 0.18;
  const gableHalfSpan = depth / 2 + 0.18;
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-gableHalfSpan, 0);
  gableShape.lineTo(0, gableHeight);
  gableShape.lineTo(gableHalfSpan, 0);
  gableShape.lineTo(-gableHalfSpan, 0);
  const gableGeom = new THREE.ExtrudeGeometry(gableShape, { depth: 0.18, bevelEnabled: false, steps: 1 });
  const leftTriangle = new THREE.Mesh(gableGeom, materials.smoothWall);
  leftTriangle.rotation.y = Math.PI / 2;
  leftTriangle.position.set(-width / 2 - 0.11, baseTop + wallHeight, 0);
  const rightTriangle = leftTriangle.clone();
  rightTriangle.position.x *= -1;
  rightTriangle.rotation.y = -Math.PI / 2;
  group.add(leftTriangle, rightTriangle);

  const leftGableWindow = createFacadeOpening(0.92, 0.82, { frameColor: '#22272d', trimColor: '#7ecfe0' });
  leftGableWindow.rotation.y = Math.PI / 2;
  leftGableWindow.position.set(-width / 2 - 0.15, baseTop + 2.08, -2.4);
  const rightGableWindow = createFacadeOpening(0.92, 0.82, { frameColor: '#22272d', trimColor: '#7ecfe0' });
  rightGableWindow.rotation.y = -Math.PI / 2;
  rightGableWindow.position.set(width / 2 + 0.15, baseTop + 2.08, 2.15);
  group.add(leftGableWindow, rightGableWindow);

  const roof = createRoof(width + 0.22, depth, roofRise, 0.82);
  roof.position.set(0, baseTop + wallHeight - 0.08, 0);
  group.add(roof);
  return applyShadows(group);
}

function createRearAnnex() {
  const group = new THREE.Group();
  // 从背立面看厨房在右侧凸出；对应模型局部坐标为主屋后侧偏左。
  group.position.set(-5.15, 0.12, -6.8);
  group.add(box(3.85, 2.58, 3.35, materials.smoothWall, 0, 1.29, 0));
  group.add(box(3.96, 0.2, 3.48, materials.concrete, 0, 0.1, 0));
  const roof = createShedRoof(4.15, 3.78, 0.48, 0.16);
  roof.position.set(0, 2.58, 0.03);
  group.add(roof);
  const chimney = cylinder(0.12, 0.14, 0.72, materials.dark, 16);
  chimney.position.set(-1.28, 3.2, -1.04);
  const chimneyCap = box(0.38, 0.07, 0.32, materials.ridge, -1.28, 3.58, -1.04);
  const smoke = createSmokeTrail();
  smoke.position.set(-1.28, 3.62, -1.04);
  group.add(chimney, chimneyCap, smoke);
  const rearWindow = createFacadeOpening(1.32, 1.12, { frameColor: '#1f252c', trimColor: '#7ecfe0' });
  rearWindow.position.set(0, 1.4, -1.74);
  rearWindow.rotation.y = Math.PI;
  group.add(rearWindow);
  const sinkWindow = createFacadeOpening(0.92, 0.86, { frameColor: '#1f252c', trimColor: '#7ecfe0' });
  sinkWindow.rotation.y = Math.PI / 2;
  sinkWindow.position.set(1.96, 1.32, -0.42);
  group.add(sinkWindow);
  const vent = cylinder(0.18, 0.18, 0.08, materials.frame, 22);
  vent.rotation.x = Math.PI / 2;
  vent.position.set(1.99, 2.08, -1.15);
  group.add(vent);
  group.add(box(1.15, 0.78, 0.2, materials.concrete, 0.8, 0.55, -1.86));
  group.add(box(0.36, 0.08, 0.24, materials.frame, 0.55, 0.98, -1.98));
  group.add(box(0.36, 0.08, 0.24, materials.frame, 0.98, 0.98, -1.98));
  return applyShadows(group);
}

function createCourtyardWall() {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: '#e4dfd2', map: plasterTexture, roughness: 0.94 });
  const capMat = new THREE.MeshStandardMaterial({ color: '#b8aa94', roughness: 0.88 });
  function addWallBetween(ax, az, bx, bz, height = 0.74) {
    const dx = bx - ax;
    const dz = bz - az;
    const length = Math.hypot(dx, dz);
    const cx = (ax + bx) / 2;
    const cz = (az + bz) / 2;
    const rot = -Math.atan2(dz, dx);
    const wall = box(length, height, 0.18, wallMat, cx, height / 2, cz);
    wall.rotation.y = rot;
    const cap = box(length + 0.14, 0.11, 0.32, capMat, cx, height + 0.055, cz);
    cap.rotation.y = rot;
    group.add(wall, cap);
  }

  // 后院围墙端点直接接到房屋后外墙，房屋外墙作为闭合边界的一边。
  addWallBetween(-7.5, -5.55, -7.5, -9.2);
  addWallBetween(-7.5, -9.2, 7.5, -9.28);
  addWallBetween(7.5, -9.28, 7.5, -6.65);
  addWallBetween(7.5, -5.45, 7.5, -5.55);

  const gateMat = new THREE.MeshStandardMaterial({ color: '#343b3c', roughness: 0.62, metalness: 0.16 });
  [-6.65, -5.45].forEach(z => {
    group.add(box(0.12, 1.0, 0.12, materials.frame, 7.5, 0.5, z));
  });
  const leftLeaf = box(0.06, 0.62, 0.46, gateMat, 7.51, 0.45, -6.36);
  const rightLeaf = box(0.06, 0.62, 0.46, gateMat, 7.51, 0.45, -5.76);
  const gateCap = box(0.16, 0.08, 1.42, capMat, 7.5, 1.04, -6.05);
  group.add(leftLeaf, rightLeaf, gateCap);
  return group;
}

function createWoodPile(width = 1.25, rows = 5) {
  const group = new THREE.Group();
  for (let r = 0; r < rows; r += 1) {
    const count = rows - r + 4;
    for (let i = 0; i < count; i += 1) {
      const log = cylinder(0.075, 0.075, width, materials.wood, 12);
      log.rotation.z = Math.PI / 2;
      log.position.set((i - count / 2) * 0.16, 0.09 + r * 0.13, (rand() - 0.5) * 0.06);
      group.add(log);
    }
  }
  return group;
}

function createFirePit() {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#665b4d', roughness: 1 });
  for (let i = 0; i < 11; i += 1) {
    const angle = (i / 11) * Math.PI * 2;
    const stone = cylinder(0.06, 0.08, 0.16, stoneMat, 8);
    stone.position.set(Math.cos(angle) * 0.38, 0.09, Math.sin(angle) * 0.3);
    stone.rotation.z = Math.PI / 2;
    group.add(stone);
  }

  const glow = new THREE.PointLight('#ff9b4a', useWebGPU ? 1.35 : 0.85, 5.2, 1.8);
  glow.position.set(0, 0.56, 0);
  group.add(glow);

  const flameGeometry = new THREE.ConeGeometry(0.13, 0.58, 9);
  for (let i = 0; i < 5; i += 1) {
    const material = materials.ember.clone();
    material.color = new THREE.Color(i % 2 ? '#ffd06a' : '#ff6b2b');
    const flame = new THREE.Mesh(flameGeometry, material);
    flame.userData = {
      noShadow: true,
      phase: rand() * Math.PI * 2,
      baseX: (rand() - 0.5) * 0.18,
      baseZ: (rand() - 0.5) * 0.14
    };
    flame.position.set(flame.userData.baseX, 0.38, flame.userData.baseZ);
    group.add(flame);
  }

  animated.push((elapsed) => {
    glow.intensity = (useWebGPU ? 1.15 : 0.75) + Math.sin(elapsed * 7.2) * 0.18;
    group.children.forEach((child) => {
      if (!('phase' in child.userData)) return;
      const pulse = 0.85 + Math.sin(elapsed * 6 + child.userData.phase) * 0.18;
      child.scale.set(0.72 * pulse, 0.88 + pulse * 0.28, 0.72 * pulse);
      child.position.x = child.userData.baseX + Math.sin(elapsed * 3.2 + child.userData.phase) * 0.025;
    });
  });

  return applyShadows(group);
}

function voxelBlock(x, z, material = grassBlockMaterials, height = 0.46, size = 0.78, yBase = -0.08) {
  return box(size, height, size, material, x, yBase + height / 2, z);
}

function createVoxelTree(scale = 1) {
  const group = new THREE.Group();
  const s = 0.46 * scale;
  for (let i = 0; i < 4; i += 1) {
    group.add(box(s, s, s, voxelMaterials.planks, 0, s / 2 + i * s, 0));
  }
  const leafPositions = [
    [0, 4, 0], [-1, 3, 0], [1, 3, 0], [0, 3, -1], [0, 3, 1],
    [-1, 4, 0], [1, 4, 0], [0, 4, -1], [0, 4, 1], [0, 5, 0]
  ];
  leafPositions.forEach(([x, y, z]) => {
    group.add(box(s, s, s, voxelMaterials.leaves, x * s, s / 2 + y * s, z * s));
  });
  return applyShadows(group);
}

function createVoxelWell() {
  const group = new THREE.Group();
  const s = 0.36;
  for (let x = -1; x <= 1; x += 1) {
    for (let z = -1; z <= 1; z += 1) {
      if (Math.abs(x) + Math.abs(z) < 2) continue;
      group.add(box(s, s, s, voxelMaterials.stone, x * s, s / 2, z * s));
      group.add(box(s, s, s, voxelMaterials.stone, x * s, s * 1.5, z * s));
    }
  }
  group.add(box(s, 0.08, s, voxelMaterials.water, 0, s * 0.72, 0));
  [-0.56, 0.56].forEach(x => group.add(box(0.12, 1.12, 0.12, voxelMaterials.planks, x, 0.96, 0)));
  group.add(box(1.55, 0.18, 1.05, voxelMaterials.planks, 0, 1.62, 0));
  return applyShadows(group);
}

function createVoxelFence(width, depth) {
  const group = new THREE.Group();
  const addPost = (x, z) => group.add(box(0.16, 0.72, 0.16, voxelMaterials.planks, x, 0.36, z));
  const addRail = (x, z, length, horizontal = true) => {
    const rail = horizontal
      ? box(length, 0.12, 0.12, voxelMaterials.planks, x, 0.42, z)
      : box(0.12, 0.12, length, voxelMaterials.planks, x, 0.42, z);
    group.add(rail);
  };

  for (let x = -width / 2; x <= width / 2 + 0.01; x += 0.9) {
    addPost(x, -depth / 2);
    addPost(x, depth / 2);
  }
  for (let z = -depth / 2; z <= depth / 2 + 0.01; z += 0.9) {
    addPost(-width / 2, z);
    addPost(width / 2, z);
  }
  addRail(0, -depth / 2, width);
  addRail(0, depth / 2, width);
  addRail(-width / 2, 0, depth, false);
  addRail(width / 2, 0, depth, false);
  return applyShadows(group);
}

function createVoxelAnimal(kind = 'sheep') {
  const group = new THREE.Group();
  const bodyMat = kind === 'cow'
    ? new THREE.MeshStandardMaterial({ color: '#3f3328', roughness: 0.9 })
    : voxelMaterials.wool;
  const headMat = kind === 'cow'
    ? new THREE.MeshStandardMaterial({ color: '#ead8b2', roughness: 0.9 })
    : voxelMaterials.wool;
  group.add(box(0.72, 0.48, 0.42, bodyMat, 0, 0.52, 0));
  group.add(box(0.34, 0.32, 0.32, headMat, 0.52, 0.6, 0));
  [-0.22, 0.22].forEach(x => [-0.12, 0.12].forEach(z => {
    group.add(box(0.12, 0.38, 0.12, voxelMaterials.planks, x, 0.19, z));
  }));
  group.add(box(0.08, 0.08, 0.04, materials.dark, 0.7, 0.65, -0.08));
  group.add(box(0.08, 0.08, 0.04, materials.dark, 0.7, 0.65, 0.08));
  return applyShadows(group);
}

function createVoxelCloud(scale = 1) {
  const group = new THREE.Group();
  const s = 0.8 * scale;
  [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [1, 0, 1], [0, 1, 0], [2, 0, 0]].forEach(([x, y, z]) => {
    const cube = box(s, s * 0.55, s, voxelMaterials.cloud, x * s * 0.86, y * s * 0.5, z * s * 0.72);
    cube.userData.noShadow = true;
    cube.castShadow = false;
    cube.receiveShadow = false;
    group.add(cube);
  });
  return group;
}

function createVoxelSceneDressing() {
  const group = new THREE.Group();

  for (let i = 0; i < 34; i += 1) {
    const x = -16 + i * 1.0;
    const h = 0.34 + ((i % 5) * 0.04);
    group.add(voxelBlock(x, 13.1 + (i % 2) * 0.78, grassBlockMaterials, h));
  }
  for (let i = 0; i < 24; i += 1) {
    const z = -8.5 + i * 0.88;
    group.add(voxelBlock(-15.4, z, grassBlockMaterials, 0.34 + (i % 3) * 0.06));
    group.add(voxelBlock(15.0, z + 0.3, grassBlockMaterials, 0.32 + (i % 4) * 0.05));
  }

  for (let i = 0; i < 5; i += 1) {
    group.add(voxelBlock(-13.4 + i * 0.82, 11.5, voxelMaterials.water, 0.18, 0.78, 0.02));
  }
  for (let i = 0; i < 4; i += 1) {
    group.add(voxelBlock(-13.0 + i * 0.82, 12.3, voxelMaterials.stone, 0.22, 0.76, -0.02));
  }

  const well = createVoxelWell();
  well.position.set(9.25, 0.08, 8.75);
  group.add(well);

  const pen = createVoxelFence(3.4, 2.35);
  pen.position.set(12.6, 0.1, 2.15);
  group.add(pen);
  const sheep = createVoxelAnimal('sheep');
  sheep.position.set(12.0, 0.18, 1.8);
  const cow = createVoxelAnimal('cow');
  cow.position.set(13.15, 0.18, 2.45);
  cow.rotation.y = Math.PI;
  group.add(sheep, cow);

  [[-14.2, -2.8, 1.25], [14.2, -8.2, 1.1], [-13.6, 9.4, 0.95], [15.4, 9.8, 1.05]].forEach(([x, z, s]) => {
    const tree = createVoxelTree(s);
    tree.position.set(x, 0.12, z);
    group.add(tree);
  });

  [[-6.8, -7.15], [-6.35, -7.15], [-5.9, -7.15], [7.7, 9.55], [8.2, 9.55]].forEach(([x, z]) => {
    group.add(box(0.42, 0.42, 0.42, voxelMaterials.hay, x, 0.42, z));
    group.add(box(0.42, 0.42, 0.42, voxelMaterials.hay, x, 0.86, z));
  });

  [[-10, 7.2, 0.9], [9.5, 8.4, 0.72], [2.8, -13.5, 1.05]].forEach(([x, z, s]) => {
    const cloud = createVoxelCloud(s);
    cloud.position.set(x, 7.2 + s, z);
    group.add(cloud);
  });

  return applyShadows(group);
}

function createFruitTree(scale = 1) {
  const group = new THREE.Group();
  const trunk = cylinder(0.06 * scale, 0.1 * scale, 0.78 * scale, materials.bark, 9);
  trunk.position.y = 0.39 * scale;
  group.add(trunk);
  [[0, 0.95, 0, 0.48], [-0.32, 0.9, 0.06, 0.34], [0.3, 0.93, -0.02, 0.38], [0.02, 1.22, 0, 0.32]].forEach(([x, y, z, r]) => {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(r * scale, 12, 8), materials.leaf);
    leaf.position.set(x * scale, y * scale, z * scale);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    group.add(leaf);
  });
  for (let i = 0; i < 12; i += 1) {
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.045 * scale, 8, 6), materials.grain);
    fruit.position.set((rand() - 0.5) * 0.62 * scale, (0.85 + rand() * 0.48) * scale, (rand() - 0.5) * 0.48 * scale);
    group.add(fruit);
  }
  return applyShadows(group);
}

function createRearWorkingYard() {
  const group = new THREE.Group();
  const uniformConcrete = new THREE.MeshStandardMaterial({ color: '#c8c2b5', roughness: 0.98 });
  const yardGeom = new THREE.BufferGeometry();
  yardGeom.setAttribute('position', new THREE.Float32BufferAttribute([
    -7.5, 0.085, -5.55,
    7.5, 0.085, -5.55,
    7.5, 0.085, -9.28,
    -7.5, 0.085, -9.2
  ], 3));
  yardGeom.setIndex([0, 1, 2, 0, 2, 3]);
  yardGeom.computeVertexNormals();
  const cementYard = new THREE.Mesh(yardGeom, uniformConcrete);
  cementYard.receiveShadow = true;
  group.add(cementYard);
  return group;
}

function createLifeDetails() {
  const group = new THREE.Group();

  function createBucket(material = materials.bluePlastic) {
    const bucket = new THREE.Group();
    const body = cylinder(0.18, 0.22, 0.36, material, 24);
    body.position.y = 0.18;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.014, 8, 24), materials.dark);
    rim.position.y = 0.37;
    rim.rotation.x = Math.PI / 2;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.01, 8, 24, Math.PI), materials.frame);
    handle.position.y = 0.4;
    bucket.add(body, rim, handle);
    return bucket;
  }

  function createTool(angle = -14) {
    const tool = new THREE.Group();
    const handle = cylinder(0.018, 0.018, 1.28, new THREE.MeshStandardMaterial({ color: '#9a6536', roughness: 0.9 }), 8);
    handle.rotation.z = THREE.MathUtils.degToRad(angle);
    handle.position.y = 0.68;
    const head = box(0.34, 0.035, 0.08, materials.dark, Math.sin(THREE.MathUtils.degToRad(angle)) * 0.48, 0.12, 0);
    tool.add(handle, head);
    return tool;
  }

  function createElectricBike() {
    const bike = new THREE.Group();
    const wheelMat = materials.rubber;
    [-0.46, 0.46].forEach(x => {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 10, 28), wheelMat);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(x, 0.2, 0);
      bike.add(wheel);
    });
    const frame = box(0.82, 0.08, 0.08, materials.frame, 0, 0.42, 0);
    const seat = box(0.28, 0.055, 0.2, materials.rubber, 0.12, 0.62, 0);
    const handle = cylinder(0.018, 0.018, 0.48, materials.frame, 8);
    handle.rotation.z = THREE.MathUtils.degToRad(-22);
    handle.position.set(0.5, 0.64, 0);
    const basket = box(0.23, 0.18, 0.24, materials.dark, 0.66, 0.5, 0);
    const shell = box(0.56, 0.2, 0.18, materials.bluePlastic, -0.08, 0.42, 0);
    bike.add(frame, seat, handle, basket, shell);
    bike.rotation.y = THREE.MathUtils.degToRad(-9);
    return bike;
  }

  function createClothesline() {
    const line = new THREE.Group();
    const postA = cylinder(0.035, 0.04, 1.25, materials.wood, 10);
    const postB = postA.clone();
    postA.position.set(-1.4, 0.62, 0);
    postB.position.set(1.4, 0.62, 0);
    const ropeGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.4, 1.18, 0),
      new THREE.Vector3(1.4, 1.18, 0)
    ]);
    const rope = new THREE.Line(ropeGeom, new THREE.LineBasicMaterial({ color: '#d7c08a' }));
    const clothA = box(0.38, 0.42, 0.025, materials.red, -0.55, 0.92, 0.01);
    const clothB = box(0.46, 0.36, 0.025, materials.bluePlastic, 0.22, 0.94, 0.01);
    const clothC = box(0.34, 0.32, 0.025, materials.yellowPlastic, 0.85, 0.96, 0.01);
    line.add(postA, postB, rope, clothA, clothB, clothC);
    return line;
  }

  function createUtilityLine() {
    const utility = new THREE.Group();
    const pole = cylinder(0.07, 0.09, 2.4, materials.wood, 12);
    pole.position.set(-7.55, 1.2, 5.55);
    const crossArm = box(1.0, 0.07, 0.08, materials.wood, -7.55, 2.28, 5.55);
    const wireMat = new THREE.LineBasicMaterial({ color: '#1b2324', transparent: true, opacity: 0.78 });
    const addWire = (points) => {
      const curve = new THREE.CatmullRomCurve3(points);
      const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(28)), wireMat);
      utility.add(wire);
    };
    addWire([
      new THREE.Vector3(-7.95, 2.26, 5.55),
      new THREE.Vector3(-6.8, 2.1, 5.8),
      new THREE.Vector3(-5.08, 3.08, 5.92)
    ]);
    addWire([
      new THREE.Vector3(-7.15, 2.26, 5.55),
      new THREE.Vector3(-6.35, 2.02, 5.55),
      new THREE.Vector3(-4.45, 2.86, 5.98)
    ]);
    utility.add(pole, crossArm);
    return utility;
  }

  function addWeedPatch(cx, cz, count = 12) {
    for (let i = 0; i < count; i += 1) {
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.22 + rand() * 0.18, 5), materials.leaf);
      blade.position.set(cx + (rand() - 0.5) * 0.8, 0.18, cz + (rand() - 0.5) * 0.8);
      blade.rotation.z = (rand() - 0.5) * 0.45;
      blade.castShadow = true;
      group.add(blade);
    }
  }

  const ebike = createElectricBike();
  ebike.position.set(-4.7, 0.22, 6.45);
  group.add(ebike);

  const bucketA = createBucket(materials.bluePlastic);
  bucketA.position.set(-5.65, 0.24, 4.1);
  const bucketB = createBucket(materials.greenPlastic);
  bucketB.scale.set(0.78, 0.78, 0.78);
  bucketB.position.set(-5.2, 0.24, 3.78);
  group.add(bucketA, bucketB);

  const toolA = createTool(-18);
  toolA.position.set(8.8, 0.18, -6.85);
  const toolB = createTool(10);
  toolB.position.set(9.15, 0.18, -7.18);
  group.add(toolA, toolB);

  const stool = new THREE.Group();
  stool.add(box(0.48, 0.08, 0.36, materials.wood, 0, 0.42, 0));
  [-0.18, 0.18].forEach(x => [-0.12, 0.12].forEach(z => stool.add(box(0.055, 0.42, 0.055, materials.wood, x, 0.21, z))));
  stool.position.set(4.8, 0.18, 6.35);
  group.add(stool);

  const line = createClothesline();
  line.position.set(0.4, 0.12, -8.15);
  group.add(line);

  const woodPile = createWoodPile(1.08, 4);
  woodPile.rotation.y = THREE.MathUtils.degToRad(8);
  woodPile.position.set(-4.55, 0.12, -8.0);
  const tarp = box(1.65, 0.04, 0.62, materials.tarp, -4.55, 0.78, -8.02);
  tarp.rotation.z = THREE.MathUtils.degToRad(-3);
  group.add(woodPile, tarp, createUtilityLine());

  const firePit = createFirePit();
  firePit.position.set(-3.35, 0.14, -7.55);
  group.add(firePit);

  const jar = cylinder(0.24, 0.28, 0.58, new THREE.MeshStandardMaterial({ color: '#8b5a38', roughness: 0.9 }), 18);
  jar.position.set(6.75, 0.31, -5.8);
  group.add(jar);

  addWeedPatch(-6.15, 3.1, 14);
  addWeedPatch(8.25, -5.25, 12);
  addWeedPatch(8.2, 7.7, 10);
  addWeedPatch(-6.9, 9.6, 10);

  return applyShadows(group);
}

function addVegetables(sceneGroup, centerX, centerZ, width, depth, rows, cols, topY = 0.12) {
  const group = new THREE.Group();
  group.position.set(centerX, 0, centerZ);
  const bed = roundedPlane(width, depth, 0.12, materials.soil);
  bed.position.y = topY;
  group.add(bed);
  const leafMat = new THREE.MeshStandardMaterial({ color: '#5f9d42', roughness: 0.86, side: THREE.DoubleSide });
  for (let r = 0; r < rows; r += 1) {
    const z = -depth / 2 + (r + 1) * depth / (rows + 1);
    group.add(box(width * 0.9, 0.055, 0.12, new THREE.MeshStandardMaterial({ color: '#4f321b', roughness: 1 }), 0, topY + 0.04, z));
    for (let c = 0; c < cols; c += 1) {
      const x = -width * 0.4 + c * width * 0.8 / Math.max(cols - 1, 1);
      for (let l = 0; l < 3; l += 1) {
        const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), leafMat);
        leaf.scale.set(0.54, 1.45, 1);
        leaf.position.set(x + (l - 1) * 0.045, topY + 0.16, z + (l % 2) * 0.036);
        leaf.rotation.x = -Math.PI / 2.8;
        leaf.rotation.y = THREE.MathUtils.degToRad((l - 1) * 18);
        leaf.castShadow = true;
        group.add(leaf);
      }
    }
  }
  sceneGroup.add(group);
}

function addGround() {
  const ground = roundedPlane(178, 138, 5.8, materials.grass);
  ground.position.set(0, -0.18, 0);
  scene.add(ground);

  scene.add(box(17.8, 0.3, 20.4, materials.concrete, 2.1, 0.07, 4.25));
  const pad = roundedPlane(15.4, 3.05, 0.06, materials.concrete);
  pad.position.set(2.1, 0.26, 7.35);
  scene.add(pad);
  const frontField = box(14.2, 0.12, 3.85, materials.soil, 2.35, 0.19, 10.15);
  scene.add(frontField);

  for (let x = -5.4; x < 9.4; x += 1.2) {
    scene.add(box(0.035, 0.012, 2.72, new THREE.MeshStandardMaterial({ color: '#bbb3a7', roughness: 1 }), x, 0.28, 7.35));
  }
  [6.25, 7.35, 8.45].forEach(z => scene.add(box(14.8, 0.012, 0.035, new THREE.MeshStandardMaterial({ color: '#bbb3a7', roughness: 1 }), 2.1, 0.281, z)));

  addVegetables(scene, 2.35, 10.15, 13.7, 3.55, 5, 13, 0.25);
  addVegetables(scene, -11.9, 2.0, 6.2, 18.0, 10, 6, 0.2);

  const sidePath = roundedPlane(0.68, 12.6, 0.04, materials.concrete);
  sidePath.position.set(-5.95, 0.205, 1.05);
  scene.add(sidePath);

  [[-6.9, 8.4, 1.1], [-4.4, 8.35, 0.78], [11.7, 8.5, 1.05], [-11.4, -5.5, 1.0], [13.4, -4.8, 1.12]].forEach(([x, z, s]) => {
    const tree = createFruitTree(s);
    tree.position.set(x, 0.16, z);
    scene.add(tree);
  });

  scene.add(createLifeDetails());
}

function createMountains() {
  const ridgeGroup = new THREE.Group();
  const hillMats = ['#6f985e', '#5f8955', '#517849'].map(color => new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
  [
    [-72, -42, 15, 2.0, 0], [-53, -47, 13, 1.55, 1], [-30, -50, 17, 1.8, 2],
    [44, -50, 18, 1.65, 1], [69, -42, 15, 1.45, 0], [-80, 34, 13, 1.35, 2],
    [78, 30, 14, 1.25, 1]
  ].forEach(([x, z, radius, scaleY, matIndex]) => {
    const hill = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2), hillMats[matIndex]);
    hill.position.set(x, -radius * 0.42, z);
    hill.scale.set(1.25, scaleY * 0.34, 0.82);
    hill.rotation.y = THREE.MathUtils.degToRad((x + z) % 25);
    hill.castShadow = false;
    hill.receiveShadow = true;
    ridgeGroup.add(hill);
  });
  scene.add(ridgeGroup);
}

function createDistantVillage() {
  const village = new THREE.Group();
  for (let i = 0; i < 42; i += 1) {
    const tree = createVoxelTree(0.72 + rand() * 0.45);
    tree.position.set(-52 + i * 2.65 + (rand() - 0.5) * 0.7, 0.05, -24 - rand() * 7.5);
    tree.rotation.y = rand() * Math.PI;
    village.add(tree);
  }
  village.traverse(child => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });
  scene.add(village);
}

function createAtmosphereVeils() {}

function createMicroPolishDetails() {
  const polish = new THREE.Group();

  const addBench = (x, z, rot = 0) => {
    const bench = new THREE.Group();
    bench.add(box(1.15, 0.12, 0.28, materials.wood, 0, 0.45, 0));
    bench.add(box(1.15, 0.34, 0.08, materials.wood, 0, 0.68, -0.16));
    [-0.42, 0.42].forEach(px => bench.add(box(0.08, 0.36, 0.08, materials.frame, px, 0.24, 0.08)));
    bench.position.set(x, 0.12, z);
    bench.rotation.y = rot;
    polish.add(bench);
  };

  const addLamp = (x, z, color = '#ffd36e') => {
    const lamp = new THREE.Group();
    const pole = cylinder(0.035, 0.045, 1.55, materials.frame, 10);
    pole.position.y = 0.78;
    lamp.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color }));
    bulb.position.y = 0.84;
    const light = new THREE.PointLight(color, useWebGPU ? 0.42 : 0.2, 4.2, 1.8);
    light.position.y = 0.84;
    lamp.add(bulb, light);
    lamp.position.set(x, 0.2, z);
    polish.add(lamp);
    animated.push((elapsed) => {
      const pulse = 0.92 + Math.sin(elapsed * 2.0 + x) * 0.06;
      bulb.scale.setScalar(pulse);
      light.intensity = (useWebGPU ? 0.38 : 0.18) + Math.sin(elapsed * 1.7 + z) * 0.04;
    });
  };

  const addCrosswalk = (x, z, rot = 0, stripes = 5) => {
    for (let i = 0; i < stripes; i += 1) {
      const offset = (i - (stripes - 1) / 2) * 0.38;
      const stripe = box(0.18, 0.035, 1.55, materials.laneMark, x + Math.cos(rot) * offset, 0.155, z - Math.sin(rot) * offset);
      stripe.rotation.y = rot;
      stripe.userData.noShadow = true;
      polish.add(stripe);
    }
  };

  const addRail = (ax, az, bx, bz, posts = 8) => {
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz);
    const angle = -Math.atan2(dz, dx);
    const rail = box(len, 0.06, 0.08, materials.rail, (ax + bx) / 2, 0.72, (az + bz) / 2);
    rail.rotation.y = angle;
    polish.add(rail);
    for (let i = 0; i <= posts; i += 1) {
      const t = i / posts;
      polish.add(box(0.08, 0.82, 0.08, materials.rail, ax + dx * t, 0.42, az + dz * t));
    }
  };

  const addPlanter = (x, z, rot = 0) => {
    const planter = new THREE.Group();
    planter.add(box(0.9, 0.28, 0.42, materials.concrete, 0, 0.26, 0));
    planter.add(box(0.74, 0.08, 0.28, materials.soil, 0, 0.43, 0));
    [-0.24, 0, 0.24].forEach(px => {
      const leaf = cylinder(0.055, 0.025, 0.36, materials.leaf, 7);
      leaf.position.set(px, 0.64, 0);
      leaf.rotation.z = THREE.MathUtils.degToRad(px * 80);
      planter.add(leaf);
    });
    planter.position.set(x, 0.12, z);
    planter.rotation.y = rot;
    polish.add(planter);
  };

  const lake = roundedPlane(32, 17, 4.4, materials.water);
  lake.position.set(4.2, 0.31, 45.5);
  lake.userData.noShadow = true;
  polish.add(lake);
  const waveMat = new THREE.MeshBasicMaterial({ color: '#d4fbff', transparent: true, opacity: 0.2, depthWrite: false });
  const waves = [];
  for (let i = 0; i < 7; i += 1) {
    const wave = box(3.8 + i * 0.35, 0.018, 0.045, waveMat.clone(), -7 + i * 3.4, 0.345, 43.4 + Math.sin(i) * 4.7);
    wave.rotation.y = THREE.MathUtils.degToRad(-8 + i * 3);
    wave.userData.noShadow = true;
    wave.userData.anchorX = wave.position.x;
    polish.add(wave);
    waves.push(wave);
  }
  animated.push((elapsed) => {
    waves.forEach((wave, i) => {
      wave.position.x = wave.userData.anchorX + Math.sin(elapsed * 0.8 + i) * 0.08;
      wave.material.opacity = 0.12 + Math.sin(elapsed * 1.3 + i) * 0.06;
    });
  });

  for (let i = 0; i < 18; i += 1) {
    const paver = box(1.28, 0.035, 0.62, i % 2 ? materials.sidewalk : materials.plazaTile, 7 + i * 1.25, 0.325, 35.8 + Math.sin(i * 0.7) * 0.5);
    paver.rotation.y = THREE.MathUtils.degToRad(-8);
    polish.add(paver);
  }
  addRail(5.0, 37.8, 29.5, 34.8, 12);
  [[8, 39, 0.1], [13, 38.2, -0.15], [18.5, 37.2, 0.1], [24, 36.2, -0.12]].forEach(([x, z, r]) => addBench(x, z, r));
  [[6.2, 36.8], [12.5, 36.1], [19.2, 35.3], [26.4, 34.5], [34.0, 8.4], [48.0, 8.4]].forEach(([x, z]) => addLamp(x, z));

  for (let i = 0; i < 34; i += 1) {
    const reed = cylinder(0.018, 0.012, 0.34 + (i % 4) * 0.07, materials.reed, 5);
    reed.position.set(-8 + i * 1.12, 0.38, 53 + Math.sin(i * 0.9) * 3.2);
    reed.rotation.z = THREE.MathUtils.degToRad((i % 5) * 3 - 6);
    polish.add(reed);
  }

  [[32, 8, 0], [48, 8, 0], [32, -10, Math.PI / 2], [48, -10, Math.PI / 2], [4, -24, 0]].forEach(([x, z, rot]) => addCrosswalk(x, z, rot));
  [[37.5, 4.8, 0], [42.5, 4.8, 0], [37.5, -4.8, 0], [42.5, -4.8, 0]].forEach(([x, z, r]) => addPlanter(x, z, r));
  [[35.8, 2.8, 0.25], [44.2, 2.8, -0.25], [35.8, -2.8, -0.25], [44.2, -2.8, 0.25]].forEach(([x, z, r]) => addBench(x, z, r));

  for (let i = 0; i < 10; i += 1) {
    const tile = box(1.6, 0.03, 0.05, materials.laneMark, 2 + i * 1.42, 0.34, -28.8 - 3.2);
    tile.userData.noShadow = true;
    polish.add(tile);
  }

  return applyShadows(polish);
}

function addSceneLights() {
  [
    [2.1, 3.05, 6.65, '#ffbc66', 0.9],
    [-3.1, 2.15, -7.95, '#ff9f52', 0.72],
    [9.6, 1.15, -6.05, '#69dfce', 0.48]
  ].forEach(([x, y, z, color, intensity]) => {
    const light = new THREE.PointLight(color, useWebGPU ? intensity : intensity * 0.68, 7, 1.7);
    light.position.set(x, y, z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), new THREE.MeshBasicMaterial({ color }));
    bulb.userData.noShadow = true;
    bulb.position.copy(light.position);
    scene.add(light, bulb);
  });
}

function createBlockyVillageHouse(w = 1.8, d = 1.45, h = 1.15) {
  const house = new THREE.Group();
  house.add(box(w, h, d, voxelMaterials.wool, 0, h / 2, 0));
  const roof = createRoof(w + 0.18, d + 0.08, 0.5, 0.12);
  roof.scale.y = 0.7;
  roof.position.y = h - 0.04;
  house.add(roof);
  house.add(box(0.32, 0.62, 0.05, materials.dark, 0, 0.34, d / 2 + 0.03));
  [-0.55, 0.55].forEach(x => {
    const win = box(0.24, 0.22, 0.04, materials.windowGlow, x, 0.72, d / 2 + 0.04);
    win.userData.noShadow = true;
    house.add(win);
  });
  return applyShadows(house);
}

function createVoxelFarmVillage() {
  const district = new THREE.Group();

  const roadMat = new THREE.MeshStandardMaterial({ color: '#a9956d', roughness: 1 });
  district.add(box(0.72, 0.08, 17.5, roadMat, -21.4, 0.12, 2.4));
  district.add(box(9.8, 0.08, 0.72, roadMat, -18.0, 0.13, -4.25));

  for (let i = 0; i < 4; i += 1) {
    const farm = box(3.6, 0.12, 2.1, materials.soil, -26.4 + (i % 2) * 4.2, 0.18, 6.2 + Math.floor(i / 2) * 2.65);
    district.add(farm);
    for (let r = 0; r < 4; r += 1) {
      district.add(box(3.2, 0.05, 0.07, voxelMaterials.water, farm.position.x, 0.28, farm.position.z - 0.78 + r * 0.52));
      for (let c = 0; c < 5; c += 1) {
        district.add(box(0.16, 0.24, 0.16, voxelMaterials.leaves, farm.position.x - 1.28 + c * 0.64, 0.42, farm.position.z - 0.54 + r * 0.52));
      }
    }
  }

  [
    [-23.5, -5.8, 0.95], [-19.9, -6.1, 0.82], [-17.2, -2.2, 0.9],
    [-24.6, 2.2, 0.74], [-18.0, 3.3, 0.78], [-25.8, -1.7, 0.68]
  ].forEach(([x, z, s], i) => {
    const h = createBlockyVillageHouse(1.8 * s, 1.38 * s, 1.1 * s);
    h.position.set(x, 0.16, z);
    h.rotation.y = THREE.MathUtils.degToRad(i % 2 ? 7 : -5);
    district.add(h);
  });

  const barn = createBlockyVillageHouse(2.8, 2.0, 1.55);
  barn.position.set(-26.4, 0.16, -4.8);
  barn.children[0].material = materials.red;
  district.add(barn);

  [[-27.8, -0.2, 0.85], [-17.6, 6.5, 0.78], [-21.2, 8.8, 0.72]].forEach(([x, z, s]) => {
    const tree = createVoxelTree(s);
    tree.position.set(x, 0.12, z);
    district.add(tree);
  });

  district.position.set(0, 0, 0);
  return applyShadows(district);
}

function createPixelWindowTexture(colorA = '#89e4ff', colorB = '#122833') {
  return sharpenTexture(canvasTexture((ctx, w, h) => {
    ctx.fillStyle = colorB;
    ctx.fillRect(0, 0, w, h);
    const cols = 6;
    const rows = 14;
    const cw = w / cols;
    const rh = h / rows;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        ctx.fillStyle = rand() > 0.38 ? colorA : 'rgba(20,38,48,0.9)';
        ctx.fillRect(x * cw + cw * 0.2, y * rh + rh * 0.18, cw * 0.52, rh * 0.44);
      }
    }
  }, 96, 192));
}

const cityWindowTexture = createPixelWindowTexture('#92e6ff', '#162d35');
const cityDarkMaterial = new THREE.MeshStandardMaterial({
  color: '#223a45',
  map: cityWindowTexture,
  roughness: 0.48,
  metalness: 0.18,
  emissive: '#0d3a48',
  emissiveIntensity: 0.22
});
const cityGlassMaterial = new THREE.MeshPhysicalMaterial({
  color: '#5fc8e8',
  roughness: 0.12,
  metalness: 0.22,
  transparent: true,
  opacity: 0.88,
  clearcoat: 0.6
});

function createCityDistrict() {
  const city = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: '#455057', roughness: 0.9 });

  for (let i = 0; i < 18; i += 1) {
    const col = i % 6;
    const row = Math.floor(i / 6);
    const w = 1.2 + (i % 3) * 0.22;
    const d = 1.0 + (i % 2) * 0.34;
    const h = 2.4 + (i % 5) * 0.74 + row * 0.34;
    const tower = box(w, h, d, i % 4 === 0 ? cityGlassMaterial : cityDarkMaterial, 0, h / 2, 0);
    tower.position.set(17.5 + col * 1.7 + (row % 2) * 0.6, 0.18 + h / 2, -18.0 - row * 1.85);
    city.add(tower);
    city.add(box(w * 0.72, 0.16, d * 0.72, baseMat, tower.position.x, 0.28 + h, tower.position.z));
    if (i % 4 === 1) {
      const mast = cylinder(0.035, 0.035, 0.85, materials.accent, 8);
      mast.position.set(tower.position.x, h + 0.82, tower.position.z);
      city.add(mast);
    }
  }

  city.add(box(12.2, 0.08, 0.72, new THREE.MeshBasicMaterial({ color: '#25343b' }), 22.1, 0.22, -15.2));
  city.add(box(0.72, 0.08, 6.5, new THREE.MeshBasicMaterial({ color: '#25343b' }), 22.1, 0.23, -18.8));
  for (let i = 0; i < 9; i += 1) {
    const light = new THREE.PointLight('#8feaff', useWebGPU ? 0.32 : 0.18, 3.8, 1.6);
    light.position.set(16.4 + i * 1.5, 1.0, -15.18);
    city.add(light);
    const post = box(0.04, 0.68, 0.04, materials.frame, light.position.x, 0.52, -15.18);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), materials.accent);
    bulb.userData.noShadow = true;
    bulb.position.copy(light.position);
    city.add(post, bulb);
  }

  return applyShadows(city);
}

function createSciFiDistrict() {
  const sci = new THREE.Group();
  const neonCyan = new THREE.MeshBasicMaterial({ color: '#64dcc7' });
  const neonAmber = new THREE.MeshBasicMaterial({ color: '#ffbe63' });
  const darkMetal = new THREE.MeshStandardMaterial({ color: '#1b252d', roughness: 0.28, metalness: 0.62 });

  const core = cylinder(0.58, 0.82, 5.8, darkMetal, 6);
  core.position.set(0, 3.0, 0);
  sci.add(core);
  for (let i = 0; i < 5; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15 + i * 0.23, 0.025, 8, 48), neonCyan);
    ring.userData.noShadow = true;
    ring.position.y = 1.15 + i * 0.9;
    ring.rotation.x = Math.PI / 2;
    sci.add(ring);
  }
  const beam = cylinder(0.08, 0.22, 7.5, new THREE.MeshBasicMaterial({ color: '#64dcc7', transparent: true, opacity: 0.34, depthWrite: false }), 16);
  beam.userData.noShadow = true;
  beam.position.y = 5.6;
  sci.add(beam);

  for (let i = 0; i < 4; i += 1) {
    const pad = cylinder(0.82, 1.05, 0.24, darkMetal, 6);
    const angle = i * Math.PI / 2 + Math.PI / 4;
    pad.position.set(Math.cos(angle) * 3.2, 0.24, Math.sin(angle) * 2.4);
    sci.add(pad);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.035, 6), i % 2 ? neonAmber : neonCyan);
    glow.userData.noShadow = true;
    glow.position.set(pad.position.x, 0.4, pad.position.z);
    sci.add(glow);
  }

  const route = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5.0, 3.6, 0.2),
    new THREE.Vector3(-2.4, 4.6, -1.1),
    new THREE.Vector3(1.8, 4.15, 0.8),
    new THREE.Vector3(5.3, 3.9, -0.6)
  ]);
  const rail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(route.getPoints(80)), new THREE.LineBasicMaterial({ color: '#64dcc7', transparent: true, opacity: 0.86 }));
  sci.add(rail);
  for (let i = 0; i < 3; i += 1) {
    const pod = box(0.56, 0.24, 0.32, i % 2 ? neonAmber : neonCyan, -4 + i * 3.0, 3.8 + i * 0.2, 0);
    pod.userData.noShadow = true;
    sci.add(pod);
  }

  const pulseLight = new THREE.PointLight('#64dcc7', useWebGPU ? 2.1 : 1.2, 12, 1.5);
  pulseLight.position.set(0, 3.8, 0);
  sci.add(pulseLight);
  animated.push((elapsed) => {
    pulseLight.intensity = (useWebGPU ? 1.8 : 1.0) + Math.sin(elapsed * 2.8) * 0.42;
    sci.children.forEach((child) => {
      if (child.geometry?.type === 'TorusGeometry') child.rotation.z += 0.002;
    });
  });

  sci.position.set(-7.4, 0, -16.6);
  return applyShadows(sci);
}

function addRoadBetween(group, ax, az, bx, bz, width = 1.25) {
  const dx = bx - ax;
  const dz = bz - az;
  const length = Math.hypot(dx, dz);
  const road = box(length, 0.04, width, materials.road, (ax + bx) / 2, 0.055, (az + bz) / 2);
  road.rotation.y = -Math.atan2(dz, dx);
  const edgeA = box(length, 0.05, 0.07, materials.roadEdge, (ax + bx) / 2, 0.082, (az + bz) / 2);
  const edgeB = edgeA.clone();
  edgeA.position.x += Math.sin(road.rotation.y) * width * 0.48;
  edgeA.position.z += Math.cos(road.rotation.y) * width * 0.48;
  edgeB.position.x -= Math.sin(road.rotation.y) * width * 0.48;
  edgeB.position.z -= Math.cos(road.rotation.y) * width * 0.48;
  edgeA.rotation.y = road.rotation.y;
  edgeB.rotation.y = road.rotation.y;
  group.add(road, edgeA, edgeB);
}

function createSignboard(text, x, z) {
  const sign = new THREE.Group();
  sign.add(box(0.08, 1.0, 0.08, materials.wood, 0, 0.5, 0));
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5f3d22';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#d1a66b';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  ctx.fillStyle = '#fff3d0';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const board = box(1.4, 0.52, 0.08, new THREE.MeshBasicMaterial({ map: texture }), 0, 1.02, 0);
  sign.add(board);
  sign.position.set(x, 0.15, z);
  return applyShadows(sign);
}

function createRuralHouse(width = 2.2, depth = 1.6, height = 1.25, wallColor = '#efe8d5') {
  const house = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.94 });
  house.add(box(width, height, depth, wallMat, 0, height / 2, 0));
  const roof = createRoof(width + 0.15, depth + 0.05, 0.55, 0.18);
  roof.scale.y = 0.72;
  roof.position.y = height - 0.02;
  house.add(roof);
  house.add(box(0.36, 0.72, 0.06, materials.dark, 0, 0.38, depth / 2 + 0.04));
  [-0.62, 0.62].forEach(x => {
    const win = box(0.34, 0.26, 0.05, materials.glass, x, 0.78, depth / 2 + 0.05);
    house.add(win);
  });
  house.add(box(0.34, 0.58, 0.05, materials.wood, -width * 0.22, 0.34, -depth / 2 - 0.04));
  [-1, 1].forEach(side => {
    const sideWinA = box(0.05, 0.26, 0.34, materials.glass, side * (width / 2 + 0.04), 0.76, -depth * 0.18);
    const sideWinB = box(0.05, 0.22, 0.28, materials.glass, side * (width / 2 + 0.04), 0.72, depth * 0.26);
    house.add(sideWinA, sideWinB);
  });
  const rearStep = box(0.78, 0.08, 0.42, materials.concrete, -width * 0.22, 0.04, -depth / 2 - 0.28);
  house.add(rearStep);
  return applyShadows(house);
}

function createFusionVillageDistrict() {
  const district = new THREE.Group();
  addRoadBetween(district, -7, 7.4, -31, 4.4, 1.18);
  addRoadBetween(district, -24, -7.5, -24, 12.2, 1.05);
  addRoadBetween(district, -31, 3.2, -16, 3.2, 0.95);

  const plaza = roundedPlane(7.5, 5.2, 0.6, new THREE.MeshStandardMaterial({ color: '#c8baa0', roughness: 0.98 }));
  plaza.position.set(-24, 0.22, 3.2);
  district.add(plaza);
  const well = cylinder(0.48, 0.58, 0.52, materials.concrete, 24);
  well.position.set(-24, 0.48, 3.1);
  district.add(well);
  const water = cylinder(0.38, 0.38, 0.045, materials.water, 24);
  water.position.set(-24, 0.76, 3.1);
  district.add(water);

  [
    [-30.5, -5.6, 0.95, '#efe8d5'], [-26.8, -7.2, 0.82, '#e6dcc4'], [-19.6, -6.2, 0.88, '#f2ead7'],
    [-31.6, 2.1, 0.72, '#e9dfc8'], [-17.0, 0.8, 0.78, '#efe6cf'], [-29.2, 9.3, 0.86, '#f2ead9'],
    [-22.1, 10.8, 0.82, '#e7dbc2'], [-16.6, 7.6, 0.76, '#efe2cc']
  ].forEach(([x, z, s, color], i) => {
    const house = createRuralHouse(2.35 * s, 1.65 * s, 1.25 * s, color);
    house.position.set(x, 0.16, z);
    house.rotation.y = THREE.MathUtils.degToRad(i % 2 ? 8 : -8);
    district.add(house);
  });

  const clinic = createRuralHouse(3.2, 2.0, 1.55, '#f3f0e5');
  clinic.position.set(-22.3, 0.16, -2.2);
  clinic.add(box(0.46, 0.08, 0.06, materials.red, 0, 1.08, 1.04));
  clinic.add(box(0.08, 0.46, 0.06, materials.red, 0, 1.08, 1.045));
  district.add(clinic);

  district.add(createSignboard('村庄', -20.1, 4.35));
  [[-32.5, -1.2, 1.0], [-18.2, 11.0, 0.86], [-29.6, 12.7, 0.82], [-14.8, 4.9, 0.76]].forEach(([x, z, s]) => {
    const tree = createFruitTree(s);
    tree.position.set(x, 0.12, z);
    district.add(tree);
  });
  district.position.set(-12, 0, -4);
  return applyShadows(district);
}

function createModernFarmDistrict() {
  const farm = new THREE.Group();
  addRoadBetween(farm, -13.5, 12.4, -37.5, 12.4, 0.88);
  addRoadBetween(farm, -37.5, 12.4, -37.5, 24.8, 0.82);

  for (let i = 0; i < 8; i += 1) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = -33 + col * 4.2;
    const z = 15.4 + row * 4.0;
    const bed = roundedPlane(3.4, 2.7, 0.18, i % 2 ? materials.soil : new THREE.MeshStandardMaterial({ color: '#7e5b33', roughness: 1 }));
    bed.position.set(x, 0.24, z);
    farm.add(bed);
    for (let r = 0; r < 4; r += 1) {
      farm.add(box(2.95, 0.05, 0.09, r % 2 ? materials.cropGold : materials.crop, x, 0.35, z - 0.9 + r * 0.55));
    }
  }

  const canal = box(17.5, 0.06, 0.42, materials.water, -26.2, 0.34, 21.9);
  farm.add(canal);
  const greenhouse = new THREE.Group();
  greenhouse.add(box(4.2, 1.35, 2.3, materials.tarp, 0, 0.78, 0));
  const greenhouseRoof = createRoof(4.25, 2.35, 0.75, 0.05);
  greenhouseRoof.position.y = 1.68;
  greenhouse.add(greenhouseRoof);
  greenhouse.position.set(-16.4, 0.12, 17.1);
  farm.add(greenhouse);

  const barn = createRuralHouse(4.2, 2.5, 1.9, '#b84b39');
  barn.position.set(-36.2, 0.16, 10.8);
  farm.add(barn);

  for (let i = 0; i < 6; i += 1) {
    const panel = box(1.25, 0.04, 0.76, new THREE.MeshStandardMaterial({ color: '#183b4b', roughness: 0.24, metalness: 0.2 }), -13.2 + i * 1.55, 0.42, 22.7);
    panel.rotation.x = THREE.MathUtils.degToRad(-16);
    farm.add(panel);
  }

  farm.add(createSignboard('智慧农场', -18.0, 13.8));
  farm.position.set(-10, 0, 10);
  return applyShadows(farm);
}

function createIntegratedCityDistrict() {
  const city = new THREE.Group();
  addRoadBetween(city, 10.0, 4.8, 32.0, -4.8, 1.35);
  addRoadBetween(city, 21.2, -12.0, 21.2, 2.2, 1.2);
  addRoadBetween(city, 14.6, -6.7, 35.5, -6.7, 1.2);

  const plaza = roundedPlane(8.5, 6.5, 0.7, new THREE.MeshStandardMaterial({ color: '#6f7b7f', roughness: 0.82 }));
  plaza.position.set(24.8, 0.24, -6.7);
  city.add(plaza);

  for (let i = 0; i < 14; i += 1) {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const w = 1.35 + (i % 3) * 0.24;
    const d = 1.1 + (i % 2) * 0.28;
    const h = 2.2 + (i % 5) * 0.82 + row * 0.55;
    const mat = i % 4 === 0 ? materials.futureGlass : cityDarkMaterial;
    const tower = box(w, h, d, mat, 18.0 + col * 2.35, 0.22 + h / 2, -11.6 - row * 2.3);
    city.add(tower);
    const entrance = box(w * 0.42, 0.46, 0.055, materials.windowGlow, tower.position.x, 0.55, tower.position.z + d / 2 + 0.04);
    entrance.userData.noShadow = true;
    city.add(entrance);
    const roofLight = box(w * 0.55, 0.08, d * 0.55, i % 2 ? materials.neonAmber : materials.neonCyan, tower.position.x, h + 0.29, tower.position.z);
    roofLight.userData.noShadow = true;
    city.add(roofLight);
  }

  for (let i = 0; i < 7; i += 1) {
    const light = new THREE.PointLight('#8feaff', useWebGPU ? 0.34 : 0.18, 4.2, 1.7);
    light.position.set(15.5 + i * 2.6, 1.08, -4.8);
    city.add(light);
    city.add(box(0.05, 0.82, 0.05, materials.frame, light.position.x, 0.55, -4.8));
    const bulb = box(0.14, 0.14, 0.14, materials.neonCyan, light.position.x, 1.0, -4.8);
    bulb.userData.noShadow = true;
    city.add(bulb);
  }

  city.add(createSignboard('未来城市', 17.0, -3.5));
  city.position.set(14, 0, -6);
  return applyShadows(city);
}

function createSciFiRuralHub() {
  const hub = new THREE.Group();
  addRoadBetween(hub, 2.0, -10.2, 1.0, -24.5, 1.05);

  const base = cylinder(2.7, 3.1, 0.36, materials.futureMetal, 32);
  base.position.set(0, 0.32, -27.0);
  hub.add(base);
  const tower = cylinder(0.42, 0.72, 6.2, materials.futureMetal, 16);
  tower.position.set(0, 3.45, -27.0);
  hub.add(tower);
  const beam = cylinder(0.08, 0.22, 8.5, new THREE.MeshBasicMaterial({ color: '#64dcc7', transparent: true, opacity: 0.32, depthWrite: false }), 24);
  beam.userData.noShadow = true;
  beam.position.set(0, 6.0, -27.0);
  hub.add(beam);

  for (let i = 0; i < 5; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0 + i * 0.28, 0.026, 8, 56), materials.neonCyan);
    ring.userData.noShadow = true;
    ring.position.set(0, 1.35 + i * 0.85, -27.0);
    ring.rotation.x = Math.PI / 2;
    hub.add(ring);
  }

  [[-4.2, -25.2], [4.2, -25.2], [-4.6, -29.5], [4.6, -29.5]].forEach(([x, z], i) => {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), materials.futureGlass);
    dome.position.set(x, 0.34, z);
    dome.scale.y = 0.62;
    hub.add(dome);
    const pad = cylinder(1.05, 1.2, 0.16, materials.futureMetal, 20);
    pad.position.set(x, 0.16, z);
    hub.add(pad);
    const glow = new THREE.PointLight(i % 2 ? '#ffbe63' : '#64dcc7', useWebGPU ? 0.5 : 0.25, 5, 1.6);
    glow.position.set(x, 1.2, z);
    hub.add(glow);
  });

  const route = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-6.2, 3.4, -26.5),
    new THREE.Vector3(-2.5, 4.3, -30.4),
    new THREE.Vector3(2.4, 4.1, -24.7),
    new THREE.Vector3(6.0, 3.7, -28.1)
  ], true);
  const rail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(route.getPoints(110)), new THREE.LineBasicMaterial({ color: '#64dcc7', transparent: true, opacity: 0.9 }));
  hub.add(rail);

  const pulseLight = new THREE.PointLight('#64dcc7', useWebGPU ? 2.0 : 1.1, 12, 1.5);
  pulseLight.position.set(0, 4.2, -27.0);
  hub.add(pulseLight);
  animated.push((elapsed) => {
    pulseLight.intensity = (useWebGPU ? 1.8 : 1.0) + Math.sin(elapsed * 2.8) * 0.42;
    hub.children.forEach((child) => {
      if (child.geometry?.type === 'TorusGeometry') child.rotation.z += 0.0025;
    });
  });

  hub.add(createSignboard('科幻农业基地', 3.7, -22.4));
  hub.position.set(0, 0, -8);
  return applyShadows(hub);
}

function createSpecBuilding({ width, depth, floors, color = '#d8ddd5', glass = false, roof = false }) {
  const group = new THREE.Group();
  const height = floorHeight(floors);
  const mat = glass
    ? new THREE.MeshPhysicalMaterial({ color: '#86b7c4', roughness: 0.18, metalness: 0.12, transparent: true, opacity: 0.72, clearcoat: 0.5 })
    : new THREE.MeshStandardMaterial({ color, roughness: 0.86 });
  group.add(box(width, height, depth, mat, 0, height / 2, 0));
  group.add(box(width + 0.16, 0.16, depth + 0.16, glass ? materials.neonCyan : materials.dark, 0, height + 0.08, 0));

  const winMat = glass ? materials.windowGlow : materials.glass;
  const cols = Math.max(2, Math.floor(width / 0.9));
  for (let f = 0; f < floors; f += 1) {
    const y = 0.82 + f * SCALE.floorHeight;
    if (y > height - 0.3) continue;
    for (let c = 0; c < cols; c += 1) {
      if ((f + c) % 5 === 0 && floors > 5) continue;
      const x = -width * 0.38 + c * (width * 0.76 / Math.max(cols - 1, 1));
      const front = box(0.32, 0.38, 0.045, winMat, x, y, depth / 2 + 0.045);
      front.userData.noShadow = true;
      group.add(front);
      if (floors >= 4) {
        const back = front.clone();
        back.position.z = -depth / 2 - 0.045;
        group.add(back);
      }
    }
  }
  group.add(box(Math.min(width * 0.42, 1.3), 0.82, 0.08, materials.windowGlow, 0, 0.48, depth / 2 + 0.075));
  if (roof) {
    const roofMesh = createRoof(width + 0.18, depth + 0.08, 0.55, 0.18);
    roofMesh.scale.y = 0.72;
    roofMesh.position.y = height - 0.02;
    group.add(roofMesh);
  }
  return applyShadows(group);
}

function addRoadNode(group, x, z, radius = 1.4) {
  const node = cylinder(radius, radius, 0.055, materials.road, 32);
  node.position.set(x, 0.095, z);
  group.add(node);
}

function addLaneMarks(group, ax, az, bx, bz, width) {
  if (width < 1.45) return;
  const dx = bx - ax;
  const dz = bz - az;
  const length = Math.hypot(dx, dz);
  const angle = -Math.atan2(dz, dx);
  const count = Math.max(3, Math.floor(length / 5));
  for (let i = 1; i < count; i += 2) {
    const t = i / count;
    const stripe = box(Math.min(1.25, length / count * 0.55), 0.05, 0.06, materials.laneMark || materials.roadEdge, ax + dx * t, 0.14, az + dz * t);
    stripe.rotation.y = angle;
    stripe.userData.noShadow = true;
    group.add(stripe);
  }
  if (width >= SCALE.road.arterial * 0.9) {
    [-width * 0.24, width * 0.24].forEach(offset => {
      const nx = -dz / length;
      const nz = dx / length;
      const line = box(length, 0.04, 0.035, materials.laneMark || materials.roadEdge, (ax + bx) / 2 + nx * offset, 0.13, (az + bz) / 2 + nz * offset);
      line.rotation.y = angle;
      line.userData.noShadow = true;
      group.add(line);
    });
  }
}

function addSpecRoad(group, ax, az, bx, bz, width = SCALE.road.secondary) {
  [ax, az] = snapPoint(ax, az);
  [bx, bz] = snapPoint(bx, bz);
  const visualWidth = Math.max(0.72, width * ROAD_VISUAL_SCALE);
  addRoadBetween(group, ax, az, bx, bz, visualWidth);
  addLaneMarks(group, ax, az, bx, bz, visualWidth);
}

function createSpecRoadNetwork() {
  const roads = new THREE.Group();
  // 清爽主路：一条东西主轴、一条去学校、一条去湖区，避免和老家院落/原小路重叠。
  const segments = [
    [-52, 24, -28, 18, SCALE.road.secondary],
    [-28, 18, -8, 13, SCALE.road.secondary],
    [-8, 13, 14, 13, SCALE.road.arterial],
    [14, 13, 36, 4, SCALE.road.arterial],
    [36, 4, 64, -8, SCALE.road.arterial],
    [4, 8, 4, -42, SCALE.road.secondary],
    [4, 18, 4, 56, SCALE.road.secondary],
    [-20, 12, -54, -26, SCALE.road.rural],
    [18, 14, 40, 30, SCALE.road.secondary]
  ];
  segments.forEach(([ax, az, bx, bz, width]) => addSpecRoad(roads, ax, az, bx, bz, width));
  [[-8, 13, 1.05], [14, 13, 1.25], [36, 4, 1.25], [4, 18, 1.15], [4, 8, 1.05]].forEach(([x, z, r]) => addRoadNode(roads, x, z, r));
  roads.add(createSignboard('清爽主轴：老家 / 学校 / CBD / 湖岸', 12.0, 17.0));
  return applyShadows(roads);
}

function createSpecNaturalBand() {
  const nature = new THREE.Group();
  const hillMat = new THREE.MeshStandardMaterial({ color: '#6f9a5a', roughness: 1 });
  [[-74, 18, 9, 1.4], [-68, 32, 7, 1.1], [68, 32, 8, 1.2], [75, -36, 10, 1.6]].forEach(([x, z, r, sy]) => {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), hillMat);
    hill.position.set(x, -0.05, z);
    hill.scale.y = sy * 0.28;
    hill.receiveShadow = true;
    nature.add(hill);
  });

  const treeAnchors = [[-72, -8], [-48, -18], [-18, -10], [0, 5], [9, 29], [0, 45], [26, 58], [72, 49]];
  for (let i = 0; i < 72; i += 1) {
    const [baseX, baseZ] = treeAnchors[i % treeAnchors.length];
    const tree = createFruitTree(0.55 + (i % 5) * 0.06);
    tree.position.set(baseX + (rand() - 0.5) * 18, 0.1, baseZ + (rand() - 0.5) * 10);
    nature.add(tree);
  }
  return applyShadows(nature);
}

function createSpecResidentialDistrict() {
  const res = new THREE.Group();
  addSpecRoad(res, 14, 27, 50, 27, SCALE.road.secondary);
  addSpecRoad(res, 14, 45, 50, 45, SCALE.road.secondary);
  addSpecRoad(res, 18, 22, 18, 55, SCALE.road.secondary);
  addSpecRoad(res, 38, 24, 38, 55, SCALE.road.secondary);
  [[24, 33], [31, 33], [24, 40], [31, 40], [27.5, 47], [44, 33], [51, 33], [44, 40], [51, 40], [47.5, 47]].forEach(([x, z], i) => {
    const tower = createSpecBuilding({ width: 3.8, depth: 3.0, floors: 11 + (i % 4) * 2, color: i % 2 ? '#d6dedb' : '#c3d0cf' });
    tower.position.set(x, 0.16, z);
    res.add(tower);
  });
  [[27.5, 36.5], [47.5, 36.5]].forEach(([x, z]) => {
    const garden = roundedPlane(10.5, 8.2, 1.2, new THREE.MeshStandardMaterial({ color: '#80aa61', roughness: 0.96 }));
    garden.position.set(x, 0.22, z);
    res.add(garden);
    res.add(box(9.2, 0.04, 0.5, materials.sidewalk || materials.concrete, x, 0.3, z));
  });
  for (let i = 0; i < 8; i += 1) {
    const villa = createRuralHouse(3.2, 2.6, floorHeight(1.2), i % 2 ? '#efe2cc' : '#e9dfc8');
    villa.position.set(15 + (i % 4) * 5.0, 0.16, 52 + Math.floor(i / 4) * 4.2);
    res.add(villa);
  }
  for (let i = 0; i < 6; i += 1) {
    const old = createSpecBuilding({ width: 4.2, depth: 3.2, floors: 5, color: '#d8c7ad' });
    old.position.set(42 + i * 4.5, 0.16, 54);
    res.add(old);
  }
  res.add(createSignboard('现代住宅区', 16, 28.5));
  return applyShadows(res);
}

function createSpecEducationDistrict() {
  const school = new THREE.Group();
  addSpecRoad(school, -10, -24, 22, -24, SCALE.road.secondary);
  addSpecRoad(school, -10, -47, 22, -47, SCALE.road.secondary);
  addSpecRoad(school, -9, -24, -9, -47, SCALE.road.secondary);
  addSpecRoad(school, 22, -24, 22, -47, SCALE.road.secondary);
  const campus = roundedPlane(30, 24, 1.0, new THREE.MeshStandardMaterial({ color: '#d8c69e', roughness: 0.96 }));
  campus.position.set(6, 0.16, -35.5);
  school.add(campus);
  [[3, -45.5, 11, 4, 3, '#f0c768'], [15, -41.5, 7.5, 5, 4, '#e7d6a2'], [-4.5, -35.5, 5.5, 4, 6, '#d9dfd5'], [-4.5, -29.5, 5.5, 4, 6, '#d9dfd5'], [18, -30.2, 7, 5.2, 2, '#d0d8dc']].forEach(([x, z, w, d, f, color]) => {
    const b = createSpecBuilding({ width: w, depth: d, floors: f, color, roof: f <= 3 });
    b.position.set(x, 0.16, z);
    school.add(b);
  });
  const track = roundedPlane(14.5, 9.0, 3.5, new THREE.MeshStandardMaterial({ color: '#bb6645', roughness: 0.92 }));
  track.position.set(9, 0.24, -28.8);
  const field = roundedPlane(11.2, 6.2, 2.3, new THREE.MeshStandardMaterial({ color: '#74a850', roughness: 0.92 }));
  field.position.set(9, 0.28, -28.8);
  school.add(track, field);
  school.add(createSignboard('教育区·校园群', -6.5, -25.6));
  return applyShadows(school);
}

function createSpecHistoricDistrict() {
  const hist = new THREE.Group();
  addSpecRoad(hist, -70, -26, -34, -26, SCALE.road.rural);
  addSpecRoad(hist, -54, -38, -54, -12, SCALE.road.rural);
  const street = roundedPlane(30, 7.5, 0.7, new THREE.MeshStandardMaterial({ color: '#9b9282', roughness: 0.98 }));
  street.position.set(-53, 0.18, -26);
  hist.add(street);
  for (let i = 0; i < 14; i += 1) {
    const side = i % 2 ? 1 : -1;
    const shop = createRuralHouse(3.2, 2.4, floorHeight(1), '#efe8d5');
    shop.position.set(-67 + Math.floor(i / 2) * 4.4, 0.16, -26 + side * 4.6);
    shop.rotation.y = side > 0 ? Math.PI : 0;
    hist.add(shop);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), materials.red);
    lantern.position.set(shop.position.x + (i % 2 ? -0.9 : 0.9), 1.8, shop.position.z - side * 1.35);
    hist.add(lantern);
  }
  const paifang = new THREE.Group();
  [-1.4, 1.4].forEach(x => paifang.add(box(0.28, 3.2, 0.28, materials.wood, x, 1.6, 0)));
  paifang.add(box(3.7, 0.32, 0.32, materials.wood, 0, 2.75, 0));
  paifang.add(createSignboard('古镇', 0, 0));
  paifang.children[paifang.children.length - 1].position.set(0, 0.0, 0.2);
  paifang.position.set(-69, 0.1, -26);
  hist.add(paifang);
  const temple = createRuralHouse(7, 4.4, floorHeight(1.2), '#eadfca');
  temple.position.set(-41, 0.16, -35);
  hist.add(temple);
  const tower = new THREE.Group();
  for (let level = 0; level < 7; level += 1) {
    const size = 3.2 - level * 0.28;
    tower.add(box(size, 0.8, size, new THREE.MeshStandardMaterial({ color: '#d7c7a4', roughness: 0.88 }), 0, 0.4 + level * 1.05, 0));
    tower.add(box(size + 0.55, 0.18, size + 0.55, materials.red, 0, 0.88 + level * 1.05, 0));
  }
  tower.position.set(-37, 0.16, -25);
  hist.add(tower);
  const garden = roundedPlane(13, 9, 1.2, new THREE.MeshStandardMaterial({ color: '#789e65', roughness: 1 }));
  garden.position.set(-62, 0.18, -38);
  hist.add(garden);
  const pond = roundedPlane(4.1, 2.6, 0.9, materials.water);
  pond.position.set(-58.3, 0.25, -36.8);
  hist.add(pond);
  hist.add(createSignboard('文旅古建区', -43.5, -18));
  return applyShadows(hist);
}

function createSpecLeisureDistrict() {
  const park = new THREE.Group();
  const shore = roundedPlane(32, 22, 4.8, new THREE.MeshStandardMaterial({ color: '#74a850', roughness: 1 }));
  shore.position.set(0, 0.12, 45);
  park.add(shore);
  const wheel = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.055, 8, 64), new THREE.MeshStandardMaterial({ color: '#f5d26a', roughness: 0.55 }));
  ring.position.y = 5.0;
  ring.rotation.y = Math.PI / 2;
  wheel.add(ring);
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    wheel.add(box(0.48, 0.34, 0.38, i % 2 ? materials.neonCyan : materials.neonAmber, 0, 5.0 + Math.sin(angle) * 4.2, Math.cos(angle) * 4.2));
  }
  wheel.add(box(0.22, 7.2, 0.22, materials.frame, 0, 2.5, 0.7));
  wheel.add(box(0.22, 7.2, 0.22, materials.frame, 0, 2.5, -0.7));
  wheel.position.set(18, 0.2, 42);
  park.add(wheel);
  const carousel = cylinder(1.4, 1.6, 0.24, materials.red, 24);
  carousel.position.set(13, 0.22, 52);
  park.add(carousel);
  for (let i = 0; i < 16; i += 1) {
    const bench = box(0.9, 0.16, 0.28, materials.wood, Math.cos(i / 16 * Math.PI * 2) * 14, 0.24, 45 + Math.sin(i / 16 * Math.PI * 2) * 9.5);
    bench.rotation.y = -i / 16 * Math.PI * 2;
    park.add(bench);
  }
  park.add(createSignboard('休闲游乐区', 11, 35));
  return applyShadows(park);
}

function createSpecFarmExpansion() {
  const farm = new THREE.Group();
  addSpecRoad(farm, -55, 40, -25, 40, SCALE.road.rural);
  addSpecRoad(farm, -55, 40, -55, 58, SCALE.road.rural);
  for (let i = 0; i < 12; i += 1) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = -51 + col * 7.2;
    const z = 27 + row * 5.4;
    const bed = roundedPlane(5.8, 3.8, 0.18, i % 2 ? materials.soil : new THREE.MeshStandardMaterial({ color: '#7e5b33', roughness: 1 }));
    bed.position.set(x, 0.22, z);
    farm.add(bed);
    for (let r = 0; r < 5; r += 1) farm.add(box(5.1, 0.055, 0.11, r % 2 ? materials.cropGold : materials.crop, x, 0.34, z - 1.35 + r * 0.66));
  }
  for (let i = 0; i < 4; i += 1) {
    const greenhouse = new THREE.Group();
    greenhouse.add(box(5.6, 0.95, 3.2, materials.tarp, 0, 0.58, 0));
    greenhouse.add(box(5.8, 0.08, 3.35, materials.frame, 0, 1.1, 0));
    for (let rib = -2; rib <= 2; rib += 1) {
      greenhouse.add(box(0.08, 1.15, 3.45, materials.frame, rib * 1.25, 0.72, 0));
    }
    greenhouse.position.set(-25 + i * 6.4, 0.12, 33.5);
    farm.add(greenhouse);
  }
  const cafe = createRuralHouse(5.2, 3.4, floorHeight(1), '#d8a96b');
  cafe.position.set(-27, 0.16, 20.5);
  farm.add(cafe);
  for (let x = -58; x <= -26; x += 4) for (let z = 48; z <= 58; z += 4) {
    const tree = createFruitTree(0.7);
    tree.position.set(x, 0.12, z);
    farm.add(tree);
  }
  farm.add(createSignboard('乡村农业区', -30, 24));
  return applyShadows(farm);
}

function createSpecCbdExpansion() {
  const cbd = new THREE.Group();
  addSpecRoad(cbd, 25, 8, 72, 8, SCALE.road.arterial);
  addSpecRoad(cbd, 32, 18, 32, -34, SCALE.road.arterial);
  addSpecRoad(cbd, 48, 18, 48, -34, SCALE.road.secondary);
  addSpecRoad(cbd, 64, 14, 64, -30, SCALE.road.secondary);
  addSpecRoad(cbd, 25, -10, 72, -10, SCALE.road.secondary);
  addSpecRoad(cbd, 28, -25, 69, -25, SCALE.road.secondary);
  const plaza = roundedPlane(13, 10, 0.8, new THREE.MeshStandardMaterial({ color: '#79868a', roughness: 0.82 }));
  plaza.position.set(40, 0.2, 0);
  cbd.add(plaza);
  const fountain = cylinder(1.15, 1.35, 0.28, materials.concrete, 32);
  fountain.position.set(40, 0.42, 0);
  cbd.add(fountain);
  const water = cylinder(0.92, 0.92, 0.05, materials.water, 32);
  water.position.set(40, 0.6, 0);
  cbd.add(water);
  [[36, -16, 28, 4.2, 3.4, true], [43, -17, 34, 4.5, 3.6, true], [54, -18, 22, 4.0, 3.2, false], [61, -17, 30, 4.6, 3.8, true], [36, -30, 18, 4.4, 3.2, false], [44, -31, 24, 4.0, 3.5, false], [53, -31, 40, 5.0, 4.0, true], [65, -30, 26, 4.6, 3.4, true], [57, 0, 20, 4.2, 3.4, false], [67, 0, 16, 4.0, 3.2, false], [72, -14, 32, 4.4, 3.6, true], [28, -18, 14, 4.2, 3.4, false]].forEach(([x, z, floors, w, d, glass], i) => {
    const tower = createSpecBuilding({ width: w, depth: d, floors, glass, color: i % 2 ? '#b9c5c2' : '#8ea0a4' });
    tower.position.set(x, 0.16, z);
    cbd.add(tower);
  });
  const mall = createSpecBuilding({ width: 10, depth: 7, floors: 4, color: '#d9c7a6' });
  mall.position.set(56, 0.16, 10.8);
  cbd.add(mall);
  cbd.add(createSignboard('城市核心商务区 CBD', 27, 13.5));
  return applyShadows(cbd);
}

function createSpecScaleOverlay() {
  const grid = new THREE.GridHelper(160, 80, '#ffbe63', '#5f776f');
  grid.position.set(0, 0.36, 0);
  const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
  gridMaterials.forEach((material) => { material.transparent = true; material.opacity = 0.18; });
  planOverlay.add(grid);
  const points = [[12.5, 7.8, '老家'], [-40.5, -4.5, '村庄'], [12, -32, '学校'], [33.5, 33.5, '住宅'], [44.5, -12.5, 'CBD'], [15, 39, '游乐']];
  points.forEach(([x, z, name]) => {
    const ref = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: '#ff3d2e' });
    const body = cylinder(0.055, 0.065, SCALE.adultHeight * 0.68, mat, 10);
    body.position.y = SCALE.adultHeight * 0.34;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), mat);
    head.position.y = SCALE.adultHeight * 0.78;
    ref.add(body, head);
    ref.position.set(x, 0.38, z);
    planOverlay.add(ref);
    addLabel(`1.8m比例尺-${name}`, x, 1.7, z);
  });
}

function createGisDreamOverlay() {
  const poiLayer = gisLayers.poi;
  const heatLayer = gisLayers.heat;
  const storyLayer = gisLayers.story;
  const heatDefs = [
    [8, 45, 16, 8, '#78d7ff', 0],
    [-54, -28, 14, 7, '#ff9a72', 1.2],
    [50, -12, 20, 12, '#78f1d6', 2.1],
    [34, 40, 18, 10, '#c2ffe1', 2.8]
  ];
  heatDefs.forEach(([x, z, w, d, color, phase]) => {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const heat = roundedPlane(w, d, 3, material);
    heat.position.set(x, 0.56, z);
    heatLayer.add(heat);
    animated.push((elapsed) => {
      const pulse = 1 + Math.sin(elapsed * 1.6 + phase) * 0.07;
      heat.scale.set(pulse, pulse, 1);
      material.opacity = 0.08 + Math.sin(elapsed * 1.6 + phase) * 0.04;
    });
  });

  const poiDefs = [
    ['家园入口', 2, 7, '#ffd36e'],
    ['湖岸乐园', 14, 48, '#78d7ff'],
    ['古镇市集', -54, -26, '#ff9a72'],
    ['校园主楼', 7, -36, '#fff07c'],
    ['星庭住宅', 36, 42, '#c2ffe1'],
    ['晶体塔群', 52, -12, '#78f1d6']
  ];
  poiDefs.forEach(([name, x, z, color], index) => {
    const beacon = new THREE.Group();
    const beam = cylinder(0.08, 0.22, 5.8, new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.28,
      depthWrite: false
    }), 18);
    beam.userData.noShadow = true;
    beam.position.y = 3.1;
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.025, 8, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78, depthWrite: false }));
    halo.userData.noShadow = true;
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.82;
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), new THREE.MeshBasicMaterial({ color }));
    star.userData.noShadow = true;
    star.position.y = 6.0;
    beacon.add(beam, halo, star);
    beacon.position.set(x, 0.2, z);
    poiLayer.add(beacon);
    addLabel(name, x, 6.8, z);
    animated.push((elapsed) => {
      halo.scale.setScalar(0.82 + Math.sin(elapsed * 2.2 + index) * 0.12);
      halo.rotation.z += 0.008;
      star.rotation.y += 0.018;
      star.position.y = 5.8 + Math.sin(elapsed * 2.5 + index) * 0.25;
    });
  });

  const storyMat = new THREE.MeshBasicMaterial({
    color: '#ffd36e',
    transparent: true,
    opacity: 0.68,
    depthWrite: false
  });
  const storyNodes = [
    ['年味灯会', -56, -21, '#ffd36e'],
    ['湖岸烟花', 8, 51, '#ff8c9a'],
    ['归家故事', 1.2, 8.5, '#fff2a6'],
    ['校园晚读', 9, -34, '#78f1d6']
  ];
  storyNodes.forEach(([name, x, z, color], index) => {
    const node = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.035, 8, 54),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72, depthWrite: false })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.08;
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.34, 0),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.94, depthWrite: false })
    );
    core.position.y = 1.16;
    node.add(ring, core);
    node.position.set(x, 0.18, z);
    node.userData.noShadow = true;
    storyLayer.add(node);
    addLabel(name, x, 3.0, z);
    animated.push((elapsed) => {
      ring.rotation.z -= 0.01;
      ring.scale.setScalar(0.9 + Math.sin(elapsed * 2.0 + index) * 0.12);
      core.position.y = 1.14 + Math.sin(elapsed * 2.6 + index) * 0.18;
    });
  });

  const fireflies = [];
  const fireflyGeometry = new THREE.SphereGeometry(0.09, 8, 6);
  for (let i = 0; i < 42; i += 1) {
    const fly = new THREE.Mesh(fireflyGeometry, storyMat.clone());
    fly.userData.noShadow = true;
    fly.userData.anchor = new THREE.Vector3(-18 + rand() * 58, 1.0 + rand() * 2.2, 14 + rand() * 42);
    fly.userData.phase = rand() * Math.PI * 2;
    fly.position.copy(fly.userData.anchor);
    storyLayer.add(fly);
    fireflies.push(fly);
  }
  animated.push((elapsed) => {
    fireflies.forEach((fly, i) => {
      const phase = elapsed * 1.4 + fly.userData.phase;
      fly.position.set(
        fly.userData.anchor.x + Math.sin(phase * 0.9) * (0.8 + (i % 4) * 0.2),
        fly.userData.anchor.y + Math.sin(phase * 1.7) * 0.18,
        fly.userData.anchor.z + Math.cos(phase * 0.7) * (0.7 + (i % 5) * 0.12)
      );
      fly.material.opacity = 0.35 + Math.sin(phase * 2.1) * 0.28;
    });
  });
}


function createWalker(color = '#4c8f6a') {
  const person = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.68 });
  const skinMat = new THREE.MeshStandardMaterial({ color: '#d8aa7e', roughness: 0.78 });
  const hairMat = new THREE.MeshStandardMaterial({ color: '#2b211b', roughness: 0.86 });
  const legMat = new THREE.MeshStandardMaterial({ color: '#2e3d49', roughness: 0.78 });

  const torso = cylinder(0.14, 0.21, 0.58, bodyMat, 14);
  torso.position.y = 0.78;
  const shoulders = box(0.48, 0.16, 0.18, bodyMat, 0, 1.03, 0);
  const neck = cylinder(0.055, 0.06, 0.12, skinMat, 10);
  neck.position.y = 1.13;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), skinMat);
  head.scale.set(0.9, 1.08, 0.86);
  head.position.y = 1.29;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.174, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat);
  hair.position.set(0, 1.35, -0.018);
  const faceMat = new THREE.MeshBasicMaterial({ color: '#1f2528' });
  const leftEye = box(0.026, 0.018, 0.012, faceMat, -0.055, 1.3, 0.145);
  const rightEye = box(0.026, 0.018, 0.012, faceMat, 0.055, 1.3, 0.145);
  const scarf = box(0.24, 0.045, 0.18, materials.neonAmber, 0, 1.08, 0.025);

  const leftLeg = cylinder(0.038, 0.045, 0.48, legMat, 8);
  const rightLeg = leftLeg.clone();
  leftLeg.position.set(-0.075, 0.34, 0);
  rightLeg.position.set(0.075, 0.34, 0);
  const leftFoot = box(0.09, 0.045, 0.18, materials.rubber, -0.075, 0.085, 0.045);
  const rightFoot = leftFoot.clone();
  rightFoot.position.x = 0.075;

  const leftArm = cylinder(0.032, 0.038, 0.5, skinMat, 8);
  const rightArm = leftArm.clone();
  leftArm.position.set(-0.27, 0.82, 0);
  rightArm.position.set(0.27, 0.82, 0);
  leftArm.rotation.z = THREE.MathUtils.degToRad(-8);
  rightArm.rotation.z = THREE.MathUtils.degToRad(8);

  person.add(torso, shoulders, neck, head, hair, leftEye, rightEye, scarf, leftLeg, rightLeg, leftFoot, rightFoot, leftArm, rightArm);
  person.userData.limbs = { leftLeg, rightLeg, leftArm, rightArm };
  return applyShadows(person);
}

function createSmallCar(color = '#4aa6c8') {
  const car = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.14 });
  car.add(box(0.82, 0.28, 0.46, mat, 0, 0.34, 0));
  car.add(box(0.42, 0.2, 0.38, materials.glass, -0.08, 0.56, 0));
  [-0.28, 0.28].forEach(x => [-0.24, 0.24].forEach(z => {
    const wheel = cylinder(0.09, 0.09, 0.08, materials.rubber, 12);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.18, z);
    car.add(wheel);
  }));
  return applyShadows(car);
}

function createDrone(color = '#64dcc7') {
  const drone = new THREE.Group();
  const glowMat = new THREE.MeshBasicMaterial({ color });
  drone.add(box(0.42, 0.16, 0.28, materials.futureMetal, 0, 0, 0));
  [-0.34, 0.34].forEach(x => [-0.25, 0.25].forEach(z => {
    const rotor = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 18), glowMat);
    rotor.userData.noShadow = true;
    rotor.position.set(x, 0.02, z);
    drone.add(rotor);
  }));
  const light = new THREE.PointLight(color, useWebGPU ? 0.42 : 0.2, 3, 1.5);
  light.position.y = 0.05;
  drone.add(light);
  return drone;
}

function animateAlongPath(object, points, speed, offset = 0, options = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), options.closed || false);
  animated.push((elapsed) => {
    const t = (elapsed * speed + offset) % 1;
    const pos = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    object.position.copy(pos);
    object.rotation.y = Math.atan2(tangent.x, tangent.z);
    const limbs = object.userData.limbs;
    if (limbs) {
      const swing = Math.sin(elapsed * 8 + offset * 10) * 0.35;
      limbs.leftLeg.rotation.x = swing;
      limbs.rightLeg.rotation.x = -swing;
      limbs.leftArm.rotation.x = -swing;
      limbs.rightArm.rotation.x = swing;
      object.position.y = pos.y + Math.abs(Math.sin(elapsed * 8 + offset * 10)) * 0.025;
    }
    object.children.forEach(child => {
      if (child.geometry?.type === 'TorusGeometry') child.rotation.z += 0.18;
    });
  });
}

function createPlayerAvatar() {
  const avatar = createWalker('#64dcc7');
  avatar.scale.set(1.08, 1.08, 1.08);
  avatar.visible = false;
  return avatar;
}

function createLivingWorldActors() {
  const actors = new THREE.Group();

  [
    { color: '#6fab43', offset: 0, path: [[-42, 0.02, -1], [-36, 0.02, 2], [-29, 0.02, -1], [-35, 0.02, -6]] },
    { color: '#c58b46', offset: 0.34, path: [[-45, 0.02, -9], [-37, 0.02, -11], [-31, 0.02, -7], [-36, 0.02, -2]] },
    { color: '#4d83b6', offset: 0.68, path: [[-30, 0.02, 4], [-36, 0.02, 7], [-43, 0.02, 4], [-38, 0.02, -1]] }
  ].forEach(({ color, offset, path }) => {
    const npc = createWalker(color);
    actors.add(npc);
    animateAlongPath(npc, path, 0.035, offset, { closed: true });
  });

  const farmer = createWalker('#8b6f37');
  actors.add(farmer);
  animateAlongPath(farmer, [[-46, 0.02, 25], [-34, 0.02, 25], [-30, 0.02, 35], [-46, 0.02, 35]], 0.026, 0.2, { closed: true });

  ['#e36b4f', '#4aa6c8', '#e0b44c'].forEach((color, i) => {
    const car = createSmallCar(color);
    actors.add(car);
    animateAlongPath(car, [[29, 0.02, -10.8], [48, 0.02, -10.8], [48, 0.02, -19.5], [35, 0.02, -19.5], [29, 0.02, -10.8]], 0.055 + i * 0.008, i * 0.28, { closed: true });
  });

  ['#64dcc7', '#ffbe63'].forEach((color, i) => {
    const drone = createDrone(color);
    actors.add(drone);
    animateAlongPath(drone, [[-6, 3.8, -34], [-2, 4.8, -39], [4, 4.2, -33], [6, 3.6, -37]], 0.05 + i * 0.015, i * 0.44, { closed: true });
  });

  return actors;
}

function createWorldRoadNetwork() {
  const roads = new THREE.Group();
  // 中心只保留一条清晰的丁字主路，避开老家主体、院坝和菜地。
  const mainWidth = 1.06;
  const branchWidth = 0.92;
  [
    [-6.6, 6.85, -18.0, 6.85, mainWidth],
    [-18.0, 6.85, -33.0, 1.4, mainWidth],
    [-33.0, 1.4, -45.0, 1.4, branchWidth],
    [-18.0, 6.85, -27.0, 18.8, branchWidth],
    [-27.0, 18.8, -47.0, 24.8, branchWidth],
    [9.6, 6.1, 22.0, 6.1, mainWidth],
    [22.0, 6.1, 31.5, -3.2, mainWidth],
    [31.5, -3.2, 48.0, -11.2, branchWidth],
    [-4.8, -6.0, -4.8, -19.5, branchWidth],
    [-4.8, -19.5, 0.0, -34.0, branchWidth]
  ].forEach(([ax, az, bx, bz, width]) => addRoadBetween(roads, ax, az, bx, bz, width));

  [[-18, 6.85, 1.0], [22, 6.1, 0.96], [-4.8, -19.5, 0.88]].forEach(([x, z, r]) => addRoadNode(roads, x, z, r));
  roads.add(createSignboard('老家起点', -7.8, 8.35));
  roads.add(createSignboard('村庄 / 农场 / CBD / 学校', -1.8, 6.55));
  return roads;
}

function addLabel(text, x, y, z) {
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(7,17,22,0.78)';
  ctx.beginPath();
  ctx.roundRect(18, 18, 284, 54, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(100,220,199,0.32)';
  ctx.stroke();
  ctx.fillStyle = '#eef7f3';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 160, 46);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.position.set(x, y, z);
  sprite.scale.set(2.4, 0.72, 1);
  labels.add(sprite);
}

function createPlanOverlay() {
  const slab = roundedPlane(8.45, 7.3, 0.28, new THREE.MeshBasicMaterial({ color: '#0d2127', transparent: true, opacity: 0.72, side: THREE.DoubleSide }));
  slab.position.set(2.1, 0.42, 0.0);
  planOverlay.add(slab);
  const kitchenSlab = roundedPlane(2.15, 2.25, 0.12, new THREE.MeshBasicMaterial({ color: '#173238', transparent: true, opacity: 0.76, side: THREE.DoubleSide }));
  kitchenSlab.position.set(-3.0, 0.43, -4.55);
  planOverlay.add(kitchenSlab);
  const lineMat = new THREE.LineBasicMaterial({ color: '#7ae2d1', transparent: true, opacity: 0.9 });
  const wallLineMat = new THREE.LineBasicMaterial({ color: '#ff6a62', transparent: true, opacity: 0.95 });
  const lines = [
    [[-4.2, -3.55], [4.2, -3.55], [4.2, 3.55], [-4.2, 3.55], [-4.2, -3.55]],
    [[-4.05, -3.55], [-4.05, -5.55], [-1.95, -5.55], [-1.95, -3.55]],
    [[-1.9, -3.55], [-1.9, 3.55]], [[1.1, -3.55], [1.1, 3.55]],
    [[-4.2, 1.2], [4.2, 1.2]], [[-4.2, -1.0], [4.2, -1.0]], [[1.1, -2.3], [4.2, -2.3]]
  ];
  lines.forEach(points => {
    const geom = new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) => new THREE.Vector3(x + 2.1, 0.48, z)));
    planOverlay.add(new THREE.Line(geom, lineMat));
  });
  const wallPaths = [
    [[-7.5, -5.55], [-7.5, -9.2], [-4.45, -9.24]],
    [[-3.15, -9.25], [7.5, -9.28], [7.5, -6.65]],
    [[7.5, -5.45], [7.5, -5.55]]
  ];
  wallPaths.forEach(path => {
    const geom = new THREE.BufferGeometry().setFromPoints(path.map(([x, z]) => new THREE.Vector3(x + 2.1, 0.54, z)));
    planOverlay.add(new THREE.Line(geom, wallLineMat));
  });
  const gateLineMat = new THREE.LineBasicMaterial({ color: '#ffbe63', transparent: true, opacity: 1 });
  const gateGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(7.5 + 2.1, 0.58, -6.65),
    new THREE.Vector3(7.5 + 2.1, 0.58, -5.45)
  ]);
  planOverlay.add(new THREE.Line(gateGeom, gateLineMat));

  [
    { x: -36, z: -1, w: 24, d: 22, color: '#ffbe63' },
    { x: -42, z: 38, w: 40, d: 38, color: '#9ae87f' },
    { x: 50, z: -12, w: 52, d: 52, color: '#64dcc7' },
    { x: 6, z: -36, w: 36, d: 30, color: '#ffcf6b' },
    { x: 36, z: 42, w: 46, d: 34, color: '#7ae2d1' },
    { x: -54, z: -28, w: 42, d: 30, color: '#e9b36a' },
    { x: 8, z: 46, w: 48, d: 32, color: '#8ac6ff' },
    { x: -6, z: 44, w: 70, d: 22, color: '#5fc9e6' }
  ].forEach(({ x, z, w, d, color }) => {
    const region = roundedPlane(w, d, 0.7, new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false
    }));
    region.position.set(x, 0.38, z);
    planOverlay.add(region);
  });
}

function buildScene() {
  addGround();
  scene.add(createSpecNaturalBand());
  scene.add(createWorldRoadNetwork());
  scene.add(createFusionVillageDistrict());
  scene.add(createModernFarmDistrict());
  scene.add(createSpecFarmExpansion());
  scene.add(createSpecHistoricDistrict());
  scene.add(createSpecLeisureDistrict());
  scene.add(createSpecResidentialDistrict());
  scene.add(createSpecEducationDistrict());
  scene.add(createIntegratedCityDistrict());
  scene.add(createSpecCbdExpansion());
  scene.add(createLivingWorldActors());
  scene.add(createMicroPolishDetails());
  playerAvatar = createPlayerAvatar();
  scene.add(playerAvatar);
  const compound = new THREE.Group();
  compound.position.set(2.1, 0, 0);
  compound.add(createCourtyardWall());
  compound.add(createMainHouse());
  compound.add(createRearAnnex());
  compound.add(createRearWorkingYard());
  scene.add(compound);
  createMountains();
  createDistantVillage();
  createAtmosphereVeils();
  addSceneLights();
  createPlanOverlay();
  createSpecScaleOverlay();
  createGisDreamOverlay();
  addLabel('正中门厅', 2.1, 4.0, 7.1);
  addLabel('二层前挑', 2.1, 5.2, 6.7);
  addLabel('原双坡屋顶', 2.1, 6.9, 0.5);
  addLabel('背面右侧凸出厨房', -3.1, 3.3, -7.8);
  addLabel('菜地与晾晒', 2.1, 1.2, 11.5);
  addLabel('四角不规则后院墙', -2.2, 1.5, -9.6);
  addLabel('后院门', 9.6, 1.35, -6.05);
  addLabel('村庄生活区', -36.0, 2.8, -1.0);
  addLabel('智慧农场', -36.0, 2.3, 30.5);
  addLabel('未来城市', 40.0, 5.4, -15.0);
  addLabel('CBD 核心商务区', 50.0, 36.0, -12.0);
  addLabel('现代住宅区', 36.0, 11.5, 42.0);
  addLabel('教育区·校园群', 6.0, 8.5, -36.0);
  addLabel('文旅古建区', -54.0, 5.0, -28.0);
  addLabel('休闲游乐区', 8.0, 7.0, 46.0);
  addLabel('自然景观带', -6.0, 2.0, 44.0);
}

function currentMode() {
  return viewMode;
}

function updateUi() {
  const activeMode = currentMode();
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === activeMode);
  });
  const [title, text] = modeCopy[activeMode];
  detailTitle.textContent = title;
  detailText.textContent = text;
  document.body.classList.toggle('walking', activeMode === 'walk');
  document.body.classList.toggle('guiding', activeMode === 'guided');
}

function syncGisLayers() {
  layerButtons.forEach((button) => {
    const key = button.dataset.layer;
    const isActive = Boolean(gisLayerState[key]);
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
    if (gisLayers[key]) gisLayers[key].visible = isActive;
  });
}

function updateOpsPanel(elapsed) {
  if (opsHeartbeat) opsHeartbeat.textContent = ecologyRunning ? '运行中' : '已暂停';
  if (opsDream) {
    const storyBoost = gisLayerState.story ? 10 : 0;
    const intensity = Math.round(70 + storyBoost + Math.sin(elapsed * 0.8) * 6);
    opsDream.textContent = `梦境强度 ${intensity}%`;
  }
  if (opsHeat) {
    if (!gisLayerState.heat) opsHeat.textContent = '热力已关闭';
    else if (gisLayerState.story) opsHeat.textContent = '灯会 / 湖岸最高';
    else opsHeat.textContent = '湖岸 / 古镇最高';
  }
}

function setMode(mode) {
  if (mode === 'eco') {
    ecologyRunning = !ecologyRunning;
    viewMode = 'eco';
    labels.visible = false;
    planOverlay.visible = false;
    activeCamera = camera;
    controls.enabled = true;
    if (playerAvatar) playerAvatar.visible = false;
    updateUi();
    setTimeout(() => {
      if (viewMode === 'eco') {
        viewMode = 'overview';
        updateUi();
      }
    }, 850);
    return;
  }

  viewMode = mode;
  labels.visible = mode === 'map';
  planOverlay.visible = mode === 'map';
  if (mode === 'walk') {
    activeCamera = walkCamera;
    controls.enabled = false;
    if (playerAvatar) playerAvatar.visible = personView === 'third';
  } else if (mode === 'guided') {
    activeCamera = walkCamera;
    controls.enabled = false;
    if (playerAvatar) playerAvatar.visible = false;
  } else {
    activeCamera = camera;
    controls.enabled = true;
    if (playerAvatar) playerAvatar.visible = false;
  }
  updateUi();
}

document.querySelectorAll('[data-mode]').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
layerButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const key = button.dataset.layer;
    gisLayerState[key] = !gisLayerState[key];
    syncGisLayers();
  });
});

window.addEventListener('keydown', (event) => {
  keyState.add(event.code);
  if (event.code === 'KeyM') setMode('map');
  if (event.code === 'KeyV') setMode(viewMode === 'walk' ? 'overview' : 'walk');
});

window.addEventListener('keyup', (event) => keyState.delete(event.code));

let lookPointerId = null;
let lastLookX = 0;
let lastLookY = 0;
canvas.addEventListener('pointerdown', (event) => {
  if (viewMode !== 'walk') return;
  if (event.clientX < window.innerWidth * 0.42) return;
  lookPointerId = event.pointerId;
  lastLookX = event.clientX;
  lastLookY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (viewMode !== 'walk' || lookPointerId !== event.pointerId) return;
  const dx = event.clientX - lastLookX;
  const dy = event.clientY - lastLookY;
  lastLookX = event.clientX;
  lastLookY = event.clientY;
  walkState.yaw -= dx * 0.0042;
  walkState.pitch = THREE.MathUtils.clamp(walkState.pitch - dy * 0.0036, -0.95, 0.55);
});
canvas.addEventListener('pointerup', (event) => {
  if (lookPointerId === event.pointerId) lookPointerId = null;
});

let joyPointerId = null;
function resetJoystick() {
  walkInput.x = 0;
  walkInput.y = 0;
  joyKnob.style.transform = 'translate(-50%, -50%)';
}
joyZone.addEventListener('pointerdown', (event) => {
  joyPointerId = event.pointerId;
  joyZone.setPointerCapture(event.pointerId);
});
joyZone.addEventListener('pointermove', (event) => {
  if (joyPointerId !== event.pointerId) return;
  const rect = joyZone.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const max = rect.width * 0.34;
  const dx = THREE.MathUtils.clamp(event.clientX - cx, -max, max);
  const dy = THREE.MathUtils.clamp(event.clientY - cy, -max, max);
  walkInput.x = dx / max;
  walkInput.y = -dy / max;
  joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
});
joyZone.addEventListener('pointerup', (event) => {
  if (joyPointerId === event.pointerId) {
    joyPointerId = null;
    resetJoystick();
  }
});
joyZone.addEventListener('pointercancel', resetJoystick);

viewToggle.addEventListener('click', () => {
  personView = personView === 'first' ? 'third' : 'first';
  viewToggle.textContent = personView === 'first' ? '第三视角' : '第一视角';
  if (playerAvatar) playerAvatar.visible = viewMode === 'walk' && personView === 'third';
});

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 760 ? 1.15 : 1.65));
  renderer.setSize(width, height);
  const aspect = width / height;
  const size = width < 760 ? 92 : 116;
  camera.left = -size * aspect / 2;
  camera.right = size * aspect / 2;
  camera.top = size / 2;
  camera.bottom = -size / 2;
  camera.updateProjectionMatrix();
  walkCamera.aspect = aspect;
  walkCamera.updateProjectionMatrix();
});

let lastFrameTime = performance.now();

function updateWalkCamera(delta) {
  const forward = (keyState.has('KeyW') || keyState.has('ArrowUp') ? 1 : 0) - (keyState.has('KeyS') || keyState.has('ArrowDown') ? 1 : 0);
  const strafe = (keyState.has('KeyD') || keyState.has('ArrowRight') ? 1 : 0) - (keyState.has('KeyA') || keyState.has('ArrowLeft') ? 1 : 0);
  const inputForward = THREE.MathUtils.clamp(forward + walkInput.y, -1, 1);
  const inputStrafe = THREE.MathUtils.clamp(strafe + walkInput.x, -1, 1);
  const moveSpeed = walkState.speed * (keyState.has('ShiftLeft') || keyState.has('ShiftRight') ? 1.7 : 1);

  const sin = Math.sin(walkState.yaw);
  const cos = Math.cos(walkState.yaw);
  const dx = (sin * inputForward + cos * inputStrafe) * moveSpeed * delta;
  const dz = (cos * inputForward - sin * inputStrafe) * moveSpeed * delta;
  playerState.position.x = THREE.MathUtils.clamp(playerState.position.x + dx, walkBounds.minX, walkBounds.maxX);
  playerState.position.z = THREE.MathUtils.clamp(playerState.position.z + dz, walkBounds.minZ, walkBounds.maxZ);
  const bob = Math.sin(performance.now() * 0.006) * 0.018 * Math.min(1, Math.abs(inputForward) + Math.abs(inputStrafe));

  if (playerAvatar) {
    playerAvatar.position.set(playerState.position.x, 0.02, playerState.position.z);
    playerAvatar.rotation.y = walkState.yaw;
    playerAvatar.visible = viewMode === 'walk' && personView === 'third';
    const limbs = playerAvatar.userData.limbs;
    if (limbs) {
      const swing = Math.sin(performance.now() * 0.008) * 0.32 * Math.min(1, Math.abs(inputForward) + Math.abs(inputStrafe));
      limbs.leftLeg.rotation.x = swing;
      limbs.rightLeg.rotation.x = -swing;
      limbs.leftArm.rotation.x = -swing;
      limbs.rightArm.rotation.x = swing;
    }
  }

  if (personView === 'first') {
    walkCamera.position.set(playerState.position.x, 2.0 + bob, playerState.position.z);
    walkCamera.rotation.set(walkState.pitch, walkState.yaw, 0);
  } else {
    const behind = new THREE.Vector3(-Math.sin(walkState.yaw) * 8.2, 6.2, -Math.cos(walkState.yaw) * 8.2);
    walkCamera.position.set(playerState.position.x + behind.x, 6.2, playerState.position.z + behind.z);
    walkCamera.lookAt(playerState.position.x, 1.35, playerState.position.z);
  }
}

function updateGuidedCamera(elapsed) {
  const t = (elapsed % guideState.duration) / guideState.duration;
  const pos = guidedRoute.getPointAt(t);
  const look = guidedRoute.getPointAt((t + 0.025) % 1);
  if (playerAvatar) playerAvatar.visible = false;
  walkCamera.position.copy(pos);
  walkCamera.lookAt(look.x, look.y + 0.25, look.z);
}

function animate() {
  const now = performance.now();
  const delta = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;
  const elapsed = (performance.now() - startTime) / 1000;
  if (viewMode === 'walk') {
    updateWalkCamera(delta);
  } else if (viewMode === 'guided') {
    updateGuidedCamera(elapsed);
  }
  if (ecologyRunning || viewMode === 'guided') animated.forEach(update => update(elapsed));
  updateOpsPanel(elapsed);
  controls.update();
  renderer.render(scene, activeCamera);
}

buildScene();
window.dispatchEvent(new Event('resize'));
syncGisLayers();
updateUi();
renderer.setAnimationLoop(animate);
