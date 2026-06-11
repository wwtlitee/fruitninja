import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const ui = {
  canvas: document.getElementById("builderCanvas"),
  assetSelect: document.getElementById("assetSelect"),
  addButton: document.getElementById("addButton"),
  directorButton: document.getElementById("directorButton"),
  guideToggleButton: document.getElementById("guideToggleButton"),
  resetButton: document.getElementById("resetButton"),
  copyButton: document.getElementById("copyButton"),
  removeButton: document.getElementById("removeButton"),
  itemList: document.getElementById("itemList"),
  selectedTitle: document.getElementById("selectedTitle"),
};

const CAMERA_GUIDE = {
  height: 10.8,
  designWidth: 9.6,
  actionWidth: 8.9,
  actionHeight: 8.35,
  actionY: -0.55,
  hud: { x: -3.25, y: 4.15, width: 2.75, height: 1.75 },
  counterY: -3.15,
};

const DEFAULT_LAYOUT = [
  { name: "wallHalf", x: -3.85, y: 3.2, z: -2.08, scale: 0.95, ry: 0 },
  { name: "wallWindow", x: -2.55, y: 3.18, z: -2.08, scale: 0.98, ry: 0 },
  { name: "wall", x: -1.15, y: 3.2, z: -2.08, scale: 0.95, ry: 0 },
  { name: "wallHalf", x: 0.15, y: 3.2, z: -2.08, scale: 0.95, ry: 0 },
  { name: "wallWindowSlide", x: 1.55, y: 3.17, z: -2.08, scale: 0.9, ry: 0 },
  { name: "wallDoorwayWide", x: 3.25, y: 3.14, z: -2.08, scale: 0.95, ry: 0 },
  { name: "floorFull", x: -2.85, y: -4.75, z: -1.62, scale: 1.65, ry: 0 },
  { name: "floorFull", x: -0.95, y: -4.75, z: -1.62, scale: 1.65, ry: 0 },
  { name: "floorFull", x: 0.95, y: -4.75, z: -1.62, scale: 1.65, ry: 0 },
  { name: "floorFull", x: 2.85, y: -4.75, z: -1.62, scale: 1.65, ry: 0 },
  { name: "kitchenFridgeLarge", x: -4.0, y: -2.28, z: -0.95, scale: 1.28, ry: 0 },
  { name: "kitchenCabinet", x: -2.45, y: -2.78, z: -0.8, scale: 1.32, ry: 0 },
  { name: "kitchenSink", x: -1.12, y: -2.74, z: -0.78, scale: 1.3, ry: 0 },
  { name: "kitchenCabinetDrawer", x: 0.25, y: -2.74, z: -0.78, scale: 1.3, ry: 0 },
  { name: "kitchenStoveElectric", x: 1.62, y: -2.7, z: -0.78, scale: 1.3, ry: 0 },
  { name: "kitchenBarEnd", x: 3.0, y: -2.7, z: -0.8, scale: 1.22, ry: 0 },
  { name: "kitchenCabinetUpperDouble", x: -1.65, y: 0.92, z: -0.92, scale: 1.05, ry: 0 },
  { name: "kitchenCabinetUpper", x: -0.38, y: 0.92, z: -0.92, scale: 1.0, ry: 0 },
  { name: "kitchenMicrowave", x: 0.75, y: 0.78, z: -0.85, scale: 0.98, ry: 0 },
  { name: "hoodModern", x: 1.68, y: 0.9, z: -0.84, scale: 1.0, ry: 0 },
  { name: "kitchenCoffeeMachine", x: -2.15, y: -1.52, z: -0.36, scale: 0.8, ry: 0 },
  { name: "kitchenBlender", x: -0.1, y: -1.46, z: -0.36, scale: 0.72, ry: 0 },
  { name: "lampSquareCeiling", x: 0.05, y: 4.28, z: -0.55, scale: 1.1, ry: 0 },
  { name: "plantSmall2", x: 3.9, y: -3.45, z: -0.6, scale: 0.98, ry: 0 },
  { name: "rugRectangle", x: 0.35, y: -4.15, z: -0.22, scale: 1.65, ry: 0 },
];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101d16);

const camera = new THREE.OrthographicCamera(-4.8, 4.8, 5.4, -5.4, 0.1, 50);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  canvas: ui.canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

const environment = new THREE.Group();
const root = new THREE.Group();
const guide = new THREE.Group();
const selectionGroup = new THREE.Group();
scene.add(environment, guide, root, selectionGroup);

scene.add(new THREE.HemisphereLight(0xfff4d8, 0x142e25, 2.0));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(2.6, 5, 6);
scene.add(key);

const loader = new GLTFLoader();
const cache = new Map();
const state = {
  assets: [],
  layout: structuredClone(DEFAULT_LAYOUT),
  selectedIndex: 0,
  rebuildToken: 0,
  guideVisible: true,
};

async function boot() {
  const response = await fetch("./assets/preview/model-manifest.json");
  const manifest = await response.json();
  state.assets = manifest
    .filter((asset) => asset.pack === "kenney-furniture-kit" && asset.role === "厨房背景")
    .sort((a, b) => a.name.localeCompare(b.name));

  populateAssetSelect();
  bindEvents();
  buildEnvironment();
  buildGuide();
  await rebuildScene();
  resize();
  animate();
}

function populateAssetSelect() {
  ui.assetSelect.innerHTML = state.assets.map((asset) => (
    `<option value="${asset.name}">${asset.name} · ${asset.sizeKb}KB</option>`
  )).join("");
  ui.assetSelect.value = "kitchenCabinet";
}

function bindEvents() {
  ui.addButton.addEventListener("click", async () => {
    state.layout.push({ name: ui.assetSelect.value, x: 0, y: CAMERA_GUIDE.counterY, z: -0.75, scale: 1, ry: 0 });
    state.selectedIndex = state.layout.length - 1;
    await rebuildScene();
  });

  ui.directorButton.addEventListener("click", async () => {
    state.layout = structuredClone(DEFAULT_LAYOUT);
    state.selectedIndex = 10;
    await rebuildScene();
  });

  ui.guideToggleButton.addEventListener("click", () => {
    state.guideVisible = !state.guideVisible;
    guide.visible = state.guideVisible;
    ui.guideToggleButton.textContent = state.guideVisible ? "隐藏参考线" : "显示参考线";
  });

  ui.resetButton.addEventListener("click", async () => {
    state.layout = structuredClone(DEFAULT_LAYOUT);
    state.selectedIndex = 0;
    await rebuildScene();
  });

  ui.removeButton.addEventListener("click", async () => {
    if (state.layout.length === 0 || state.selectedIndex < 0) return;
    state.layout.splice(state.selectedIndex, 1);
    state.selectedIndex = Math.min(state.selectedIndex, state.layout.length - 1);
    await rebuildScene();
  });

  ui.copyButton.addEventListener("click", copyLayout);

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = state.layout[state.selectedIndex];
      if (!item) return;
      const delta = Number(button.dataset.delta);
      if (button.dataset.action === "move") item[button.dataset.axis] += delta;
      if (button.dataset.action === "rotate") item.ry += delta;
      if (button.dataset.action === "scale") item.scale = Math.max(0.2, item.scale + delta);
      await rebuildScene();
    });
  });

  window.addEventListener("resize", resize);
}

function buildEnvironment() {
  environment.clear();

  addPanel(9.35, 6.25, 0, 1.4, -2.52, 0x18342a, 0.95);
  addPanel(9.35, 1.85, 0, -4.45, -2.5, 0x1f4a3d, 0.92);
  addPanel(9.1, 0.22, 0, -2.08, -1.32, 0xffd79a, 0.88);
  addPanel(9.1, 0.13, 0, -1.88, -1.34, 0x7f5a37, 0.92);
  addPanel(9.15, 0.52, 0, -2.42, -1.45, 0x2f5c4a, 0.86);

  for (let x = -4.1; x <= 4.1; x += 0.9) {
    addPanel(0.025, 0.52, x, -2.42, -1.28, 0xffffff, 0.08);
  }
  for (let y = 1.0; y <= 4.7; y += 0.85) {
    addPanel(9.15, 0.025, 0, y, -2.3, 0xffffff, 0.05);
  }
}

function addPanel(width, height, x, y, z, color, opacity) {
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.035),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity }),
  );
  panel.position.set(x, y, z);
  environment.add(panel);
}

function buildGuide() {
  guide.clear();

  const backPlane = new THREE.Mesh(
    new THREE.BoxGeometry(CAMERA_GUIDE.designWidth, CAMERA_GUIDE.height, 0.04),
    new THREE.MeshBasicMaterial({ color: 0x1b3429, transparent: true, opacity: 0.46 }),
  );
  backPlane.position.set(0, 0, -2.35);
  guide.add(backPlane);

  addGridLines();
  addFrame(CAMERA_GUIDE.designWidth, CAMERA_GUIDE.height, 0, 0, -1.96, 0x35dd8f, 0.95);
  addFrame(CAMERA_GUIDE.actionWidth, CAMERA_GUIDE.actionHeight, 0, CAMERA_GUIDE.actionY, -1.9, 0xffd763, 0.78);
  addRect(CAMERA_GUIDE.hud.width, CAMERA_GUIDE.hud.height, CAMERA_GUIDE.hud.x, CAMERA_GUIDE.hud.y, -1.88, 0xff695f, 0.16);
  addFrame(CAMERA_GUIDE.hud.width, CAMERA_GUIDE.hud.height, CAMERA_GUIDE.hud.x, CAMERA_GUIDE.hud.y, -1.86, 0xff695f, 0.9);
  addLine(-CAMERA_GUIDE.designWidth / 2, CAMERA_GUIDE.counterY, CAMERA_GUIDE.designWidth / 2, CAMERA_GUIDE.counterY, -1.82, 0x55d5ff, 0.82, 0.045);
  addLine(0, -CAMERA_GUIDE.height / 2, 0, CAMERA_GUIDE.height / 2, -1.82, 0x55d5ff, 0.52, 0.032);

  addLabel("主游戏镜头范围 16:9", -2.25, 5.12, -1.72, "#35dd8f");
  addLabel("水果飞行/切割区", 2.05, 3.65, -1.72, "#ffd763");
  addLabel("HUD 遮挡区", -3.25, 4.95, -1.72, "#ff695f");
  addLabel("柜台参考线", -3.3, CAMERA_GUIDE.counterY + 0.25, -1.72, "#55d5ff");
}

function addGridLines() {
  for (let x = -4; x <= 4; x += 1) {
    addLine(x, -CAMERA_GUIDE.height / 2, x, CAMERA_GUIDE.height / 2, -2.08, 0xffffff, 0.09, 0.012);
  }
  for (let y = -5; y <= 5; y += 1) {
    addLine(-CAMERA_GUIDE.designWidth / 2, y, CAMERA_GUIDE.designWidth / 2, y, -2.08, 0xffffff, 0.09, 0.012);
  }
}

function addRect(width, height, x, y, z, color, opacity) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.025),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity }),
  );
  mesh.position.set(x, y, z);
  guide.add(mesh);
}

function addFrame(width, height, x, y, z, color, opacity) {
  const halfW = width / 2;
  const halfH = height / 2;
  addLine(x - halfW, y + halfH, x + halfW, y + halfH, z, color, opacity, 0.045);
  addLine(x - halfW, y - halfH, x + halfW, y - halfH, z, color, opacity, 0.045);
  addLine(x - halfW, y - halfH, x - halfW, y + halfH, z, color, opacity, 0.045);
  addLine(x + halfW, y - halfH, x + halfW, y + halfH, z, color, opacity, 0.045);
}

function addLine(x1, y1, x2, y2, z, color, opacity, thickness) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(length, thickness, 0.03),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity }),
  );
  mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, z);
  mesh.rotation.z = Math.atan2(dy, dx);
  guide.add(mesh);
}

function addLabel(text, x, y, z, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(8, 15, 12, 0.78)";
  ctx.roundRect(0, 0, canvas.width, canvas.height, 24);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = "700 34px Microsoft YaHei, Segoe UI, sans-serif";
  ctx.fillText(text, 28, 78);

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.position.set(x, y, z);
  sprite.scale.set(2.1, 0.52, 1);
  guide.add(sprite);
}

async function rebuildScene() {
  const token = ++state.rebuildToken;
  root.clear();
  selectionGroup.clear();
  renderItemList();

  for (const [index, item] of state.layout.entries()) {
    const asset = state.assets.find((entry) => entry.name === item.name);
    if (!asset) continue;
    const model = await getModel(asset);
    if (token !== state.rebuildToken) return;
    const clone = model.clone(true);
    clone.position.set(item.x, item.y, item.z);
    clone.rotation.y = item.ry;
    clone.scale.setScalar(item.scale);
    root.add(clone);
    if (index === state.selectedIndex) {
      addSelectionMarker(clone);
    }
  }
}

function addSelectionMarker(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const geometry = new THREE.BoxGeometry(Math.max(size.x, 0.2), Math.max(size.y, 0.2), Math.max(size.z, 0.2));
  const edges = new THREE.EdgesGeometry(geometry);
  const marker = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0xffd763, transparent: true, opacity: 0.95 }),
  );
  marker.position.copy(center);
  selectionGroup.add(marker);
}

function renderItemList() {
  const selected = state.layout[state.selectedIndex];
  ui.selectedTitle.textContent = selected ? selected.name : "未选择";
  ui.itemList.innerHTML = state.layout.map((item, index) => `
    <button class="item-button ${index === state.selectedIndex ? "active" : ""}" data-index="${index}" type="button">
      <strong>${index + 1}. ${item.name}</strong>
      <span>x:${item.x.toFixed(2)} y:${item.y.toFixed(2)} z:${item.z.toFixed(2)} s:${item.scale.toFixed(2)}</span>
    </button>
  `).join("");

  ui.itemList.querySelectorAll(".item-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedIndex = Number(button.dataset.index);
      renderItemList();
    });
  });
}

async function getModel(asset) {
  if (cache.has(asset.name)) return cache.get(asset.name);
  const gltf = await loader.loadAsync(asset.model);
  const sceneRoot = gltf.scene;
  sceneRoot.traverse((node) => {
    if (node.isMesh) {
      node.frustumCulled = false;
    }
  });
  cache.set(asset.name, sceneRoot);
  return sceneRoot;
}

async function copyLayout() {
  const payload = {
    version: "v1.1.0",
    source: "Kenney Furniture Kit CC0",
    camera: "fixed-orthographic-front",
    proceduralSurfaces: {
      wall: { width: 9.35, height: 6.25, position: [0, 1.4, -2.52], color: "#18342a" },
      floor: { width: 9.35, height: 1.85, position: [0, -4.45, -2.5], color: "#1f4a3d" },
      counter: { width: 9.1, height: 0.22, position: [0, -2.08, -1.32], color: "#ffd79a" },
      backsplash: { width: 9.15, height: 0.52, position: [0, -2.42, -1.45], color: "#2f5c4a" },
    },
    cameraGuide: {
      visibleWidth: CAMERA_GUIDE.designWidth,
      visibleHeight: CAMERA_GUIDE.height,
      actionWidth: CAMERA_GUIDE.actionWidth,
      actionHeight: CAMERA_GUIDE.actionHeight,
      actionY: CAMERA_GUIDE.actionY,
      hud: CAMERA_GUIDE.hud,
      counterY: CAMERA_GUIDE.counterY,
    },
    items: state.layout.map((item) => ({
      name: item.name,
      model: `./assets/preview/kenney-furniture-kit/models/${item.name}.glb`,
      position: [round(item.x), round(item.y), round(item.z)],
      rotationY: round(item.ry),
      scale: round(item.scale),
    })),
  };
  try {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    ui.copyButton.textContent = "已复制";
  } catch {
    ui.copyButton.textContent = "复制失败";
  }
  window.setTimeout(() => {
    ui.copyButton.textContent = "复制背景 JSON";
  }, 1200);
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function resize() {
  const rect = ui.canvas.parentElement.getBoundingClientRect();
  renderer.setSize(Math.floor(rect.width), Math.floor(rect.height), false);
  const aspect = rect.width / Math.max(1, rect.height);
  const halfHeight = CAMERA_GUIDE.height / 2;
  camera.left = -halfHeight * aspect;
  camera.right = halfHeight * aspect;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
}

function animate() {
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

boot().catch((error) => {
  ui.itemList.innerHTML = `<div class="item-button">加载失败：${error.message}</div>`;
});
