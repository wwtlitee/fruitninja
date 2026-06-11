import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const ui = {
  totalCount: document.getElementById("totalCount"),
  visibleCount: document.getElementById("visibleCount"),
  favoriteCount: document.getElementById("favoriteCount"),
  searchInput: document.getElementById("searchInput"),
  favoritesOnlyButton: document.getElementById("favoritesOnlyButton"),
  copyFavoritesButton: document.getElementById("copyFavoritesButton"),
  gallery: document.getElementById("gallery"),
  canvas: document.getElementById("previewCanvas"),
  viewerEmpty: document.getElementById("viewerEmpty"),
  selectedName: document.getElementById("selectedName"),
  selectedPack: document.getElementById("selectedPack"),
  selectedRole: document.getElementById("selectedRole"),
  selectedSize: document.getElementById("selectedSize"),
  selectedLicense: document.getElementById("selectedLicense"),
  selectedPath: document.getElementById("selectedPath"),
};

const state = {
  models: [],
  filtered: [],
  selectedId: null,
  filters: {
    pack: "all",
    role: "all",
    search: "",
    favoritesOnly: false,
  },
  favorites: new Set(JSON.parse(localStorage.getItem("fruit-model-favorites") || "[]")),
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x102017);

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
camera.position.set(0, 1.6, 5.2);

const renderer = new THREE.WebGLRenderer({
  canvas: ui.canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

const previewRoot = new THREE.Group();
scene.add(previewRoot);

scene.add(new THREE.HemisphereLight(0xfff7df, 0x17382d, 2.4));

const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(3, 4, 5);
scene.add(key);

const fill = new THREE.PointLight(0x56d5f5, 10, 10);
fill.position.set(-3, 1.6, 3);
scene.add(fill);

const loader = new GLTFLoader();
let activeModel = null;
let loadingToken = 0;

async function boot() {
  const response = await fetch("./assets/preview/model-manifest.json");
  state.models = await response.json();
  state.filtered = [...state.models];
  bindEvents();
  renderGallery();
  selectModel(state.models.find((model) => model.role === "可切目标") || state.models[0]);
  animate();
}

function bindEvents() {
  ui.searchInput.addEventListener("input", () => {
    state.filters.search = ui.searchInput.value.trim().toLowerCase();
    applyFilters();
  });

  document.querySelectorAll("[data-filter-group]").forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.dataset.filterGroup;
      state.filters[group] = button.dataset.filterValue;
      document.querySelectorAll(`[data-filter-group="${group}"]`).forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      applyFilters();
    });
  });

  ui.favoritesOnlyButton.addEventListener("click", () => {
    state.filters.favoritesOnly = !state.filters.favoritesOnly;
    ui.favoritesOnlyButton.classList.toggle("active", state.filters.favoritesOnly);
    applyFilters();
  });

  ui.copyFavoritesButton.addEventListener("click", copyFavorites);
  window.addEventListener("resize", resize);
  resize();
}

function applyFilters() {
  const query = state.filters.search;
  state.filtered = state.models.filter((model) => {
    if (state.filters.pack !== "all" && model.pack !== state.filters.pack) return false;
    if (state.filters.role !== "all" && model.role !== state.filters.role) return false;
    if (state.filters.favoritesOnly && !state.favorites.has(model.id)) return false;
    if (!query) return true;
    const haystack = `${model.name} ${model.packLabel} ${model.role} ${model.tags.join(" ")}`.toLowerCase();
    return haystack.includes(query);
  });
  renderGallery();
}

function renderGallery() {
  ui.totalCount.textContent = `全部 ${state.models.length}`;
  ui.visibleCount.textContent = `当前 ${state.filtered.length}`;
  ui.favoriteCount.textContent = `收藏 ${state.favorites.size}`;

  if (state.filtered.length === 0) {
    ui.gallery.innerHTML = `<div class="empty-state">没有找到匹配模型，换个关键词试试。</div>`;
    return;
  }

  ui.gallery.innerHTML = state.filtered.map((model) => {
    const favorite = state.favorites.has(model.id);
    const selected = model.id === state.selectedId;
    return `
      <article class="model-card ${selected ? "selected" : ""}" data-model-id="${model.id}">
        <button class="favorite-toggle ${favorite ? "active" : ""}" type="button" data-favorite-id="${model.id}" aria-label="收藏 ${model.name}">
          ${favorite ? "★" : "☆"}
        </button>
        <img src="${model.thumbnail}" alt="${model.name}" loading="lazy" />
        <div class="card-body">
          <div class="model-name" title="${model.name}">${model.name}</div>
          <div class="card-meta">
            <span class="pill">${model.role}</span>
            <span class="pill">${model.sizeKb} KB</span>
          </div>
        </div>
      </article>
    `;
  }).join("");

  ui.gallery.querySelectorAll(".model-card").forEach((card) => {
    card.addEventListener("click", () => {
      const model = state.models.find((item) => item.id === card.dataset.modelId);
      if (model) selectModel(model);
    });
  });

  ui.gallery.querySelectorAll(".favorite-toggle").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavorite(button.dataset.favoriteId);
    });
  });
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  localStorage.setItem("fruit-model-favorites", JSON.stringify([...state.favorites]));
  renderGallery();
}

function selectModel(model) {
  if (!model) return;
  state.selectedId = model.id;
  ui.viewerEmpty.classList.add("hidden");
  ui.selectedName.textContent = model.name;
  ui.selectedPack.textContent = model.packLabel;
  ui.selectedRole.textContent = model.role;
  ui.selectedSize.textContent = `${model.sizeKb} KB`;
  ui.selectedLicense.textContent = model.license;
  ui.selectedPath.textContent = model.model;
  renderGallery();
  loadModel(model);
}

function loadModel(model) {
  const token = ++loadingToken;
  clearPreview();

  loader.load(
    model.model,
    (gltf) => {
      if (token !== loadingToken) return;
      activeModel = gltf.scene;
      fitModel(activeModel);
      previewRoot.add(activeModel);
    },
    undefined,
    () => {
      ui.viewerEmpty.classList.remove("hidden");
      ui.viewerEmpty.querySelector("strong").textContent = "加载失败";
      ui.viewerEmpty.querySelector("span").textContent = model.model;
    },
  );
}

function clearPreview() {
  if (!activeModel) return;
  previewRoot.remove(activeModel);
  activeModel.traverse((node) => {
    if (!node.isMesh) return;
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => material?.dispose?.());
  });
  activeModel = null;
}

function fitModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  model.position.sub(center);
  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  model.scale.setScalar(2.35 / maxAxis);
  model.rotation.set(0, -0.35, 0);
}

async function copyFavorites() {
  const favorites = state.models
    .filter((model) => state.favorites.has(model.id))
    .map((model) => `${model.name} | ${model.role} | ${model.model}`);

  const text = favorites.length > 0
    ? favorites.join("\n")
    : "还没有收藏模型。";

  try {
    await navigator.clipboard.writeText(text);
    ui.copyFavoritesButton.textContent = "已复制";
  } catch {
    ui.copyFavoritesButton.textContent = "复制失败";
  }

  window.setTimeout(() => {
    ui.copyFavoritesButton.textContent = "复制收藏清单";
  }, 1100);
}

function resize() {
  const rect = ui.canvas.parentElement.getBoundingClientRect();
  const size = Math.max(220, Math.floor(Math.min(rect.width, rect.height)));
  renderer.setSize(size, size, false);
  camera.aspect = 1;
  camera.updateProjectionMatrix();
}

function animate() {
  if (activeModel) {
    activeModel.rotation.y += 0.01;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

boot().catch((error) => {
  ui.gallery.innerHTML = `<div class="empty-state">模型清单加载失败：${error.message}</div>`;
});
