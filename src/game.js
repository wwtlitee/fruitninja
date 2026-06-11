import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.getElementById("gameCanvas");
const slashLayer = document.getElementById("slashLayer");

const ui = {
  root: document.getElementById("gameRoot"),
  penalty: document.getElementById("penaltyValue"),
  score: document.getElementById("scoreValue"),
  timer: document.getElementById("timerValue"),
  combo: document.getElementById("comboValue"),
  flow: document.getElementById("flowValue"),
  level: document.getElementById("levelValue"),
  xpBar: document.getElementById("xpBar"),
  startOverlay: document.getElementById("startOverlay"),
  levelOverlay: document.getElementById("levelOverlay"),
  resultOverlay: document.getElementById("resultOverlay"),
  bossWarningLayer: document.getElementById("bossWarningLayer"),
  bossWarningTag: document.getElementById("bossWarningTag"),
  bossWarningTitle: document.getElementById("bossWarningTitle"),
  bossWarningCount: document.getElementById("bossWarningCount"),
  bossWarningHint: document.getElementById("bossWarningHint"),
  levelKicker: document.getElementById("levelKicker"),
  levelTitle: document.getElementById("levelTitle"),
  levelChoices: document.getElementById("levelChoices"),
  resultTitle: document.getElementById("resultTitle"),
  resultScore: document.getElementById("resultScore"),
  resultCombo: document.getElementById("resultCombo"),
  resultFlow: document.getElementById("resultFlow"),
  resultReason: document.getElementById("resultReason"),
  resultCompare: document.getElementById("resultCompare"),
  startButton: document.getElementById("startButton"),
  retryButton: document.getElementById("retryButton"),
  copyButton: document.getElementById("copyButton"),
};

const ROUND_SECONDS = 60;
const BOSS_SECONDS = 5;
const BOSS_CRACK_SECONDS = 4.2;
const BOSS_CRACK_HITS = 20;
const BOSS_BASE_SCORE = 28;
const BOSS_CRACK_BONUS = 60;
const BOSS_FINAL_BONUS = 90;
const BOSS_WARNING_COUNTDOWN = 3;
const MID_EVENT_ELAPSED = 30;
const MID_EVENT_SECONDS = 3.2;
const MID_EVENT_BOMB_MIN = 5;
const MID_EVENT_BOMB_MAX = 10;
const FRENZY_SECONDS = 5;
const FRENZY_PACK_INTERVAL = 0.25;
const FRENZY_PACKS = 20;
const FRENZY_FRUITS_PER_PACK = 5;
const FRENZY_FRUIT_STAGGER = 0.05;
const FRENZY_FINISHER_PACKS = 3;
const MAX_ACTIVE_OBJECTS = 14;
const MIN_SWIPE_COMBO = 3;
const CUTTABLE_ASSET_URL = "./assets/preview/cuttable-pairs.json";
const DANGER_MODEL_URL = "./assets/preview/kenney-food-kit/models/barrel.glb";
const STRAWBERRY_MODEL_URL = "./assets/preview/kenney-food-kit/models/strawberry.glb";
const VIEW = {
  height: 10.8,
  sidePadding: 0.72,
};
const WORLD = {
  left: -4.2,
  right: 4.2,
  bottom: -5.35,
  top: 5.0,
  depthNear: 0.45,
  depthFar: -0.75,
};

const FRUITS = {
  apple: { label: "苹果", color: 0xff4d5e, score: 10, size: 0.58, assetName: "apple" },
  pear: { label: "梨", color: 0xa7df64, score: 12, size: 0.6, assetName: "pear" },
  lemon: { label: "柠檬", color: 0xffd84d, score: 13, size: 0.55, assetName: "lemon" },
  egg: { label: "咕咕蛋", color: 0xfff1c4, score: 16, size: 0.56, assetName: "egg" },
  avocado: { label: "牛油果", color: 0x67c47f, score: 18, size: 0.62, assetName: "avocado" },
  coconut: { label: "椰壳", color: 0xa8744f, score: 24, size: 0.66, assetName: "coconut" },
  mushroom: { label: "蘑菇", color: 0xff766f, score: 19, size: 0.58, assetName: "mushroom" },
  onion: { label: "洋葱", color: 0xd0a4ff, score: 20, size: 0.58, assetName: "onion" },
  sausage: { label: "香肠", color: 0xff5a1f, score: 14, size: 0.6, assetName: "sausage", fullScale: 1.45, tintModel: true },
  strawberry: { label: "狂暴草莓", color: 0xff2f55, score: 80, size: 0.44, assetName: "strawberry", frenzyTarget: true },
  durian: { label: "蜂巢桶", color: 0x9a6a3a, score: 0, size: 0.64, assetName: "barrel", danger: true },
};

const NORMAL_FRUIT_POOL = ["apple", "pear", "lemon", "egg", "avocado", "coconut", "mushroom", "onion", "sausage"];

const TALENTS = [
  {
    id: "combo_window",
    tag: "combo",
    name: "连斩达人",
    desc: "连击窗口更长。",
    apply: () => {
      state.mods.comboWindow += 0.22;
      state.flow.combo += 1;
    },
  },
  {
    id: "combo_score",
    tag: "combo",
    name: "连击爆分",
    desc: "连击分数成长更快。",
    apply: () => {
      state.mods.comboBonus += 0.16;
      state.flow.combo += 1;
    },
  },
  {
    id: "afterimage",
    tag: "combo",
    name: "残影刀痕",
    desc: "划切后追加残影命中。",
    apply: () => {
      state.mods.afterimage = true;
      state.flow.combo += 2;
    },
  },
  {
    id: "wider_cut",
    tag: "combo",
    name: "疾风追切",
    desc: "切割判定稍微变宽。",
    apply: () => {
      state.mods.hitPadding += 0.08;
      state.flow.combo += 1;
    },
  },
  {
    id: "precision_focus",
    tag: "precision",
    name: "刀心校准",
    desc: "GOOD/GREAT/PERFECT 得分倍率提高。",
    apply: () => {
      state.mods.gradeBonus += 0.12;
      state.flow.precision += 2;
    },
  },
  {
    id: "splash",
    tag: "burst",
    name: "果汁四溅",
    desc: "命中会炸到附近目标。",
    apply: () => {
      state.mods.splashRadius += 0.92;
      state.mods.splashTargets += 1;
      state.flow.burst += 2;
    },
  },
  {
    id: "splash_big",
    tag: "burst",
    name: "爆汁扩散",
    desc: "爆汁范围扩大。",
    apply: () => {
      state.mods.splashRadius += 0.72;
      state.flow.burst += 1;
    },
  },
  {
    id: "coconut_blast",
    tag: "burst",
    name: "椰壳热浪",
    desc: "椰壳触发额外爆汁。",
    apply: () => {
      state.mods.coconutBonus += 18;
      state.mods.splashTargets += 1;
      state.flow.burst += 1;
    },
  },
  {
    id: "pulse",
    tag: "burst",
    name: "清屏脉冲",
    desc: "18 连击清掉几个目标。",
    apply: () => {
      state.mods.pulse = true;
      state.flow.burst += 2;
    },
  },
  {
    id: "chain",
    tag: "lightning",
    name: "雷霆果刀",
    desc: "命中后连锁附近水果。",
    apply: () => {
      state.mods.chainCount += 1;
      state.flow.lightning += 2;
    },
  },
  {
    id: "chain_plus",
    tag: "lightning",
    name: "静电增幅",
    desc: "雷电多跳一次。",
    apply: () => {
      state.mods.chainCount += 1;
      state.mods.chainRadius += 0.4;
      state.flow.lightning += 1;
    },
  },
  {
    id: "beam",
    tag: "lightning",
    name: "天罚刀光",
    desc: "净切落下一道纵向刀光。",
    apply: () => {
      state.mods.beam = true;
      state.flow.lightning += 2;
    },
  },
  {
    id: "overload",
    tag: "lightning",
    name: "雷暴过载",
    desc: "连锁命中额外给分。",
    apply: () => {
      state.mods.lightningScore += 9;
      state.flow.lightning += 1;
    },
  },
  {
    id: "boss_score",
    tag: "boss",
    name: "破核手速",
    desc: "Boss 狂切得分提高。",
    apply: () => {
      state.mods.bossScoreBonus += 0.25;
      state.flow.boss += 2;
    },
  },
  {
    id: "boss_time",
    tag: "boss",
    name: "多一口气",
    desc: "Boss 时间延长 0.8 秒。",
    apply: () => {
      state.mods.bossTimeBonus += 0.8;
      state.flow.boss += 1;
    },
  },
  {
    id: "steady_hand",
    tag: "survival",
    name: "稳手围裙",
    desc: "漏切和危险桶扣分降低。",
    apply: () => {
      state.mods.penaltyReduction += 0.22;
      state.flow.survival += 2;
    },
  },
];

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
renderer.shadowMap.enabled = false;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.background = null;
scene.fog = null;

const camera = new THREE.OrthographicCamera(-4.8, 4.8, 5.4, -5.4, 0.1, 50);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const clock = new THREE.Clock();
const gltfLoader = new GLTFLoader();
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const screenProjection = new THREE.Vector3();

const worldGroup = new THREE.Group();
const entityGroup = new THREE.Group();
const fxGroup = new THREE.Group();
scene.add(worldGroup, entityGroup, fxGroup);

const materials = createMaterials();
const reusable = {
  box: new THREE.BoxGeometry(1, 1, 1),
  shard: new THREE.TetrahedronGeometry(0.08, 0),
  spike: new THREE.ConeGeometry(0.055, 0.18, 5),
  plane: new THREE.PlaneGeometry(1, 1),
};

const state = createInitialState();
const assetState = {
  ready: false,
  loading: false,
  error: null,
  cutPairs: [],
  full: new Map(),
  half: new Map(),
  danger: new Map(),
};

function createInitialState() {
  return {
    running: false,
    paused: false,
    over: false,
    phase: "normal",
    timeLeft: ROUND_SECONDS,
    score: 0,
    stage: 1,
    stageScore: 0,
    stageTarget: getStageTarget(1),
    stageClears: 0,
    stageTimedUpgradeTaken: false,
    stageXpUpgradeTaken: false,
    upgradePoints: 0,
    midEventTriggered: false,
    midEventActive: false,
    midEventTimer: 0,
    frenzyActive: false,
    frenzyTimeLeft: 0,
    frenzySpawnTimer: 0,
    frenzyPacksRemaining: 0,
    frenzyPackIndex: 0,
    frenzyScore: 0,
    pendingUpgradeAction: null,
    boss: null,
    bossHits: 0,
    bossScore: 0,
    bossCracked: false,
    bossWarningTimer: 0,
    bossWarningCountdownStarted: false,
    bossWarningLastCue: null,
    penaltyScore: 0,
    combo: 0,
    maxCombo: 0,
    level: 1,
    xp: 0,
    xpTarget: 110,
    upgradesTaken: 0,
    fruitId: 1,
    spawnTimer: 0,
    lastCutAt: -999,
    pointerDown: false,
    lastPointer: null,
    activeSwipeIds: new Set(),
    activeSwipeScore: 0,
    activeSwipePoint: null,
    objects: [],
    pendingSpawns: [],
    particles: [],
    cutPieces: [],
    slashFx: [],
    selectedTalents: [],
    previousBestScore: Number(localStorage.getItem("fruit-survivor-3d-best-score") || 0),
    bestScore: Number(localStorage.getItem("fruit-survivor-3d-best-score") || 0),
    deathReason: "时间结束",
    flow: { combo: 0, burst: 0, lightning: 0, precision: 0, boss: 0, survival: 0 },
    mods: createBaseMods(),
  };
}

function createBaseMods() {
  return {
    comboWindow: 0.72,
    comboBonus: 0,
    hitPadding: 0,
    splashRadius: 0,
    splashTargets: 0,
    coconutBonus: 0,
    chainCount: 0,
    chainRadius: 1.45,
    lightningScore: 0,
    gradeBonus: 0,
    bossScoreBonus: 0,
    bossTimeBonus: 0,
    penaltyReduction: 0,
    afterimage: false,
    pulse: false,
    beam: false,
  };
}

function getStageTarget(stage) {
  return Math.round(1000 + 500 * stage * (stage - 1));
}

function createMaterials() {
  const makeFruit = (color, roughness = 0.55) =>
    new THREE.MeshLambertMaterial({
      color,
    });

  return {
    apple: makeFruit(0xff4d5e),
    pear: makeFruit(0xa7df64, 0.5),
    lemon: makeFruit(0xffd84d, 0.48),
    egg: makeFruit(0xfff1c4, 0.42),
    avocado: makeFruit(0x67c47f, 0.54),
    coconut: makeFruit(0xa8744f, 0.68),
    mushroom: makeFruit(0xff766f, 0.56),
    onion: makeFruit(0xd0a4ff, 0.52),
    sausage: makeFruit(0xff5a1f, 0.58),
    strawberry: makeFruit(0xff2f55, 0.48),
    strawberryAura: new THREE.SpriteMaterial({
      map: createSoftGlowTexture(),
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }),
    strawberryRays: new THREE.SpriteMaterial({
      map: createRayGlowTexture(),
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }),
    strawberrySpark: new THREE.SpriteMaterial({
      map: createSparkTexture(),
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }),
    durian: makeFruit(0x8a6a35, 0.8),
    durianSpike: makeFruit(0xd7bd65, 0.82),
    tray: new THREE.MeshBasicMaterial({ color: 0x07110e, transparent: true, opacity: 0.14 }),
    trayLine: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 }),
    highlight: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 }),
    shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }),
    slash: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 }),
    lightning: new THREE.MeshBasicMaterial({ color: 0x36d6e7, transparent: true, opacity: 0.82 }),
    burst: new THREE.MeshBasicMaterial({ color: 0xffcf3f, transparent: true, opacity: 0.8 }),
  };
}

function createSoftGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  const center = canvas.width / 2;
  const glow = ctx.createRadialGradient(center, center, 0, center, center, center);
  glow.addColorStop(0, "rgba(255, 249, 198, 0.95)");
  glow.addColorStop(0.18, "rgba(255, 221, 94, 0.74)");
  glow.addColorStop(0.46, "rgba(255, 177, 45, 0.34)");
  glow.addColorStop(0.74, "rgba(255, 156, 32, 0.12)");
  glow.addColorStop(1, "rgba(255, 156, 32, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createRayGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  const center = canvas.width / 2;
  ctx.translate(center, center);
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI * 2 * i) / 10;
    const length = i % 2 === 0 ? 76 : 56;
    const width = i % 2 === 0 ? 5 : 3;
    const ray = ctx.createLinearGradient(0, 0, Math.cos(angle) * length, Math.sin(angle) * length);
    ray.addColorStop(0, "rgba(255, 243, 166, 0.72)");
    ray.addColorStop(0.42, "rgba(255, 210, 74, 0.32)");
    ray.addColorStop(1, "rgba(255, 210, 74, 0)");
    ctx.strokeStyle = ray;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 18, Math.sin(angle) * 18);
    ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSparkTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const center = canvas.width / 2;
  const glow = ctx.createRadialGradient(center, center, 0, center, center, 28);
  glow.addColorStop(0, "rgba(255, 255, 238, 0.95)");
  glow.addColorStop(0.28, "rgba(255, 231, 120, 0.7)");
  glow.addColorStop(1, "rgba(255, 196, 46, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(255, 248, 199, 0.9)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(center, 8);
  ctx.lineTo(center, 56);
  ctx.moveTo(8, center);
  ctx.lineTo(56, center);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildWorld() {
  worldGroup.clear();

  const back = new THREE.Mesh(new THREE.BoxGeometry(9.6, 10.9, 0.12), materials.tray);
  back.position.set(0, -0.08, -1.55);
  worldGroup.add(back);

  const gridMat = materials.trayLine;
  for (let i = 0; i < 8; i += 1) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(8.7, 0.018, 0.018), gridMat);
    line.position.set(0, WORLD.bottom + 0.8 + i * 1.1, -1.22);
    worldGroup.add(line);
  }

  const ambient = new THREE.HemisphereLight(0xf7fff2, 0x0c211b, 1.65);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(-3.4, 4.2, 6);
  scene.add(key);

  const rim = new THREE.PointLight(0x36d6e7, 8, 12);
  rim.position.set(3.8, 1.4, 4);
  scene.add(rim);
}

async function loadGameAssets() {
  if (assetState.loading || assetState.ready) return;

  assetState.loading = true;
  assetState.error = null;
  ui.startButton.disabled = true;
  ui.startButton.textContent = "模型加载中...";

  try {
    const response = await fetch(CUTTABLE_ASSET_URL);
    if (!response.ok) throw new Error(`cuttable manifest ${response.status}`);
    const pairs = await response.json();
    assetState.cutPairs = Array.isArray(pairs) ? pairs : [];

    await Promise.all(
      assetState.cutPairs.map(async (pair) => {
        try {
          const [full, half] = await Promise.all([loadGltf(pair.full), loadGltf(pair.half)]);
          assetState.full.set(pair.name, full.scene);
          assetState.half.set(pair.name, half.scene);
        } catch (error) {
          console.warn(`failed to load cuttable model: ${pair.name}`, error);
        }
      }),
    );

    try {
      const danger = await loadGltf(DANGER_MODEL_URL);
      assetState.danger.set("barrel", danger.scene);
    } catch (error) {
      console.warn("failed to load danger model", error);
    }

    try {
      const strawberry = await loadGltf(STRAWBERRY_MODEL_URL);
      assetState.full.set("strawberry", strawberry.scene);
    } catch (error) {
      console.warn("failed to load strawberry model", error);
    }

    assetState.ready = assetState.full.size > 0;
  } catch (error) {
    assetState.error = error;
    console.warn("game asset loading failed; fallback meshes remain playable", error);
  } finally {
    assetState.loading = false;
    ui.startButton.disabled = false;
    ui.startButton.textContent = assetState.ready ? "开始闯关" : "模型降级启动";
  }
}

function loadGltf(url) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(url, resolve, undefined, reject);
  });
}

function startRound() {
  if (assetState.loading) return;
  Object.assign(state, createInitialState());
  entityGroup.clear();
  fxGroup.clear();
  slashLayer.innerHTML = "";
  state.running = true;
  state.paused = false;
  state.over = false;
  state.previousBestScore = state.bestScore;
  hide(ui.startOverlay);
  hide(ui.resultOverlay);
  hide(ui.levelOverlay);
  hideBossWarningOverlay();
  updateHud();
}

function spawnWave(elapsed) {
  const openSlots = MAX_ACTIVE_OBJECTS - state.objects.length - state.pendingSpawns.length;
  if (openSlots <= 0) return;

  const pool = getSpawnPool(elapsed);
  const wantsDanger = elapsed > 12 && openSlots >= 4 && Math.random() < getDangerChance(elapsed);
  const count = Math.min(openSlots - (wantsDanger ? 1 : 0), getWaveSize(elapsed));
  const waveCenter = THREE.MathUtils.lerp(WORLD.left + 1.0, WORLD.right - 1.0, Math.random());
  const waveWidth = Math.min(WORLD.right - WORLD.left - 0.9, 1.45 + count * 0.48);
  const waveApexY = THREE.MathUtils.lerp(1.15, 2.15, Math.random());
  const launchDelays = Array.from({ length: count }, (_, index) => index * 0.085 + Math.random() * 0.12);
  shuffle(launchDelays);

  for (let i = 0; i < count; i += 1) {
    const type = pool[Math.floor(Math.random() * pool.length)];
    state.pendingSpawns.push({
      delay: launchDelays[i],
      type,
      waveIndex: i,
      waveCount: count,
      waveCenter,
      waveWidth,
      waveApexY,
      elapsed,
    });
  }

  if (wantsDanger) {
    const edgeSide = Math.random() > 0.5 ? 1 : -1;
    const latestFruitDelay = Math.max(...launchDelays, 0);
    state.pendingSpawns.push({
      delay: latestFruitDelay + 0.34 + Math.random() * 0.22,
      type: "durian",
      waveIndex: 0,
      waveCount: 1,
      waveCenter: edgeSide > 0 ? WORLD.right - 0.72 : WORLD.left + 0.72,
      waveWidth: 0.2,
      waveApexY: waveApexY - 0.25,
      elapsed,
      dangerEdgeSide: edgeSide,
    });
  }
}

function spawnObject(type, waveIndex = 0, waveCount = 1, waveCenter = 0, waveWidth = 1.4, elapsed = 0, waveApexY = 1.6, dangerEdgeSide = 0, fixedX = null) {
  const data = FRUITS[type];
  const mesh = createFruitMesh(type, data);
  const waveT = waveCount <= 1 ? 0.5 : waveIndex / (waveCount - 1);
  const laneOffset = (waveT - 0.5) * waveWidth + (Math.random() - 0.5) * 0.32;
  const x = Number.isFinite(fixedX) ? fixedX : THREE.MathUtils.clamp(waveCenter + laneOffset, WORLD.left + 0.55, WORLD.right - 0.55);
  const z = THREE.MathUtils.lerp(WORLD.depthNear, WORLD.depthFar, Math.random());
  const launchY = WORLD.bottom - 0.28;
  const laneDrift = data.danger ? -dangerEdgeSide * (0.42 + Math.random() * 0.28) : data.frenzyTarget ? 0 : (Math.random() - 0.5) * 0.42;
  const levelLift = Math.min(0.55, elapsed * 0.006);
  const apexY = THREE.MathUtils.clamp(waveApexY + (Math.random() - 0.5) * 0.18, WORLD.bottom + 3.1, WORLD.top - 1.3);
  const verticalSpeed = Math.sqrt(Math.max(0.1, 2 * 5.35 * Math.max(0.1, apexY - launchY))) + levelLift;

  const object = {
    id: state.fruitId++,
    type,
    label: data.label,
    score: data.score,
    danger: Boolean(data.danger),
    frenzyTarget: Boolean(data.frenzyTarget),
    radius: data.size * 0.9,
    minHitRadius: data.frenzyTarget ? 22 : 34,
    mesh,
    velocity: new THREE.Vector3(laneDrift, data.danger ? verticalSpeed * 1.08 : data.frenzyTarget ? verticalSpeed * 0.88 : verticalSpeed, (Math.random() - 0.5) * 0.18),
    spin: new THREE.Vector3(Math.random() * 2.5, Math.random() * 3, Math.random() * 2.5),
    elite: null,
    cut: false,
    apexY,
    visualTime: 0,
  };

  if (!object.danger && elapsed > 20 && Math.random() < (elapsed > 42 ? 0.28 : 0.14)) {
    object.elite = Math.random() > 0.5 ? "split" : "fast";
    if (object.elite === "fast") {
      object.velocity.multiplyScalar(1.08);
    }
  }

  mesh.position.set(x, launchY, z);
  object.mesh = mesh;
  state.objects.push(object);
  entityGroup.add(mesh);
}

function getSpawnPool(elapsed) {
  return NORMAL_FRUIT_POOL;
}

function getWaveSize(elapsed) {
  let min = 3;
  let max = 4;
  if (elapsed >= 12) {
    min = 4;
    max = 5;
  }
  if (elapsed >= 28) {
    min = 5;
    max = 6;
  }
  if (elapsed >= 45) {
    min = 5;
    max = 7;
  }

  const frenzy = elapsed > 18 && Math.random() < Math.min(0.22, 0.08 + elapsed * 0.002);
  const count = THREE.MathUtils.randInt(min, max) + (frenzy ? THREE.MathUtils.randInt(2, 3) : 0);
  return Math.min(9, count);
}

function getWaveInterval(elapsed) {
  return Math.max(0.95, 1.78 - elapsed * 0.012);
}

function getDangerChance(elapsed) {
  return Math.min(0.2, 0.1 + elapsed * 0.0016);
}

function createFruitMesh(type, data) {
  const model = createAssetModel(data.assetName, data, data.danger ? "danger" : "full");
  if (model) {
    if (data.frenzyTarget) decorateStrawberryTarget(model);
    return decorateGameplayMesh(model, data);
  }

  const fallback = createFallbackFruitMesh(type, data);
  if (data.frenzyTarget) decorateStrawberryTarget(fallback);
  return fallback;
}

function decorateStrawberryTarget(group) {
  const aura = makeTargetGlowSprite(materials.strawberryAura, 1.42, 0, 0, 0.04);
  const core = makeTargetGlowSprite(materials.strawberryAura, 0.58, 0, 0, 0.1);
  const rays = makeTargetGlowSprite(materials.strawberryRays, 1.76, 0, 0, 0.06);
  const sparks = [
    makeTargetGlowSprite(materials.strawberrySpark, 0.18, -0.5, 0.34, 0.12),
    makeTargetGlowSprite(materials.strawberrySpark, 0.14, 0.5, 0.28, 0.12),
    makeTargetGlowSprite(materials.strawberrySpark, 0.13, 0.34, -0.4, 0.12),
  ];
  group.add(rays, aura, core, ...sparks);
  group.userData.rewardHalo = { aura, core, rays, sparks };
}

function makeTargetGlowSprite(material, scale, x, y, z) {
  const sprite = new THREE.Sprite(material.clone());
  sprite.position.set(x, y, z);
  sprite.scale.set(scale, scale, 1);
  sprite.renderOrder = 8;
  sprite.userData.baseScale = sprite.scale.clone();
  return sprite;
}

function createAssetModel(assetName, data, variant = "full") {
  const source =
    variant === "half"
      ? assetState.half.get(assetName)
      : variant === "danger"
        ? assetState.danger.get(assetName)
        : assetState.full.get(assetName);

  if (!source) return null;

  const clone = source.clone(true);
  const group = new THREE.Group();
  group.add(clone);

  const box = new THREE.Box3().setFromObject(clone);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxAxis = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maxAxis) || maxAxis <= 0) return null;

  clone.position.sub(center);
  const variantScale = variant === "full" ? data.fullScale ?? 1 : variant === "half" ? data.halfScale ?? 1 : 1;
  group.scale.setScalar((data.size * 1.65 * variantScale) / maxAxis);
  group.userData.assetName = assetName;
  group.userData.variant = variant;
  applyModelPalette(group, data, variant);

  group.traverse((child) => {
    child.frustumCulled = false;
  });

  return group;
}

function applyModelPalette(group, data, variant) {
  if (!data.tintModel) return;

  const tint = new THREE.Color(data.color);
  const emissiveBoost = data.danger ? 0.2 : variant === "half" ? 0.1 : 0.07;

  group.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    const tintMaterial = (material) => {
      const clone = material.clone();
      if (clone.color) clone.color.copy(tint);
      if (clone.map) clone.map = null;
      if (clone.emissive) clone.emissive.copy(tint).multiplyScalar(emissiveBoost);
      if (clone.metalness !== undefined) clone.metalness = 0;
      if (clone.roughness !== undefined) clone.roughness = 0.5;
      clone.needsUpdate = true;
      return clone;
    };

    child.material = Array.isArray(child.material) ? child.material.map(tintMaterial) : tintMaterial(child.material);
  });
}

function decorateGameplayMesh(group, data) {
  return group;
}

function createFallbackFruitMesh(type, data) {
  const group = new THREE.Group();
  const size = data.size;
  const material = materials[type] ?? materials.apple;
  const main = new THREE.Mesh(reusable.box, material);
  main.scale.set(size, size, size);
  group.add(main);

  const highlight = new THREE.Mesh(reusable.box, materials.highlight);
  highlight.scale.set(size * 0.36, size * 0.06, size * 0.36);
  highlight.position.set(-size * 0.16, size * 0.52, size * 0.18);
  group.add(highlight);

  if (type === "durian") {
    for (let i = 0; i < 10; i += 1) {
      const spike = new THREE.Mesh(reusable.spike, materials.durianSpike);
      const angle = (i / 10) * Math.PI * 2;
      spike.position.set(Math.cos(angle) * size * 0.72, Math.sin(angle * 2) * size * 0.22, Math.sin(angle) * size * 0.72);
      spike.lookAt(spike.position.clone().multiplyScalar(1.6));
      group.add(spike);
    }
  }

  return group;
}

function update(dt) {
  if (!state.running || state.paused) return;

  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.phase === "normal") {
    state.spawnTimer -= dt;
    const elapsed = ROUND_SECONDS - state.timeLeft;
    if (!state.midEventTriggered && elapsed >= MID_EVENT_ELAPSED) {
      startMidStageEvent(elapsed);
    }
    if (state.midEventActive) updateMidStageEvent(dt);
    if (state.frenzyActive) updateFrenzy(dt);
    updatePendingSpawns(dt);
    if (!state.midEventActive && !state.frenzyActive && state.spawnTimer <= 0 && state.objects.length + state.pendingSpawns.length < MAX_ACTIVE_OBJECTS) {
      spawnWave(elapsed);
      state.spawnTimer = getWaveInterval(elapsed);
    }
    if (!state.midEventActive && !state.frenzyActive) maybeOpenScheduledUpgrade();
  } else if (state.phase === "boss_warning") {
    updateBossWarning(dt);
  }

  updateObjects(dt);
  updateFx(dt);

  if (performance.now() / 1000 - state.lastCutAt > state.mods.comboWindow) {
    state.combo = 0;
  }

  if (state.timeLeft <= 0 && state.phase === "normal") {
    startBossWarningPhase();
  } else if (state.timeLeft <= 0 && state.phase === "boss") {
    finishBossPhase();
  }

  updateHud();
}

function startMidStageEvent(elapsed) {
  state.midEventTriggered = true;
  state.midEventActive = true;
  state.midEventTimer = MID_EVENT_SECONDS;
  state.spawnTimer = MID_EVENT_SECONDS + 0.25;
  state.pendingSpawns = [];

  const bombCount = THREE.MathUtils.randInt(MID_EVENT_BOMB_MIN, MID_EVENT_BOMB_MAX);
  const lanes = buildBombBarrageLanes(bombCount);
  lanes.forEach((x, index) => {
    state.pendingSpawns.push({
      delay: index * 0.055 + Math.random() * 0.06,
      type: "durian",
      waveIndex: index,
      waveCount: bombCount,
      waveCenter: 0,
      waveWidth: WORLD.right - WORLD.left - 0.8,
      waveApexY: 1.75 + Math.random() * 0.45,
      elapsed,
      dangerEdgeSide: x >= 0 ? 1 : -1,
      fixedX: x,
    });
  });

  state.pendingSpawns.push({
    delay: 0.18,
    type: "strawberry",
    waveIndex: 0,
    waveCount: 1,
    waveCenter: 0,
    waveWidth: 0.1,
    waveApexY: 2.35,
    elapsed,
    fixedX: 0,
  });

  showFloatingText(centerScreenPoint(), "狂暴草莓!", "frenzy");
}

function buildBombBarrageLanes(count) {
  const halfWidth = Math.max(2.2, Math.min(3.9, WORLD.right - 0.45));
  const lanes = [];
  for (let i = 0; i < count; i += 1) {
    const t = count <= 1 ? 0.5 : i / (count - 1);
    const x = THREE.MathUtils.lerp(-halfWidth, halfWidth, t);
    lanes.push(Math.abs(x) < 0.58 ? x + (x >= 0 ? 0.72 : -0.72) : x);
  }
  return shuffle(lanes);
}

function updateMidStageEvent(dt) {
  state.midEventTimer -= dt;
  if (state.midEventTimer <= 0) {
    state.midEventActive = false;
    state.spawnTimer = 0;
  }
}

function startFrenzyPhase(origin) {
  clearHazardsAndPending();
  state.midEventActive = false;
  state.frenzyActive = true;
  state.frenzyTimeLeft = FRENZY_SECONDS;
  state.frenzySpawnTimer = 0;
  state.frenzyPacksRemaining = FRENZY_PACKS;
  state.frenzyPackIndex = 0;
  state.frenzyScore = 0;
  state.spawnTimer = FRENZY_SECONDS + 0.25;
  triggerEventImpact("fx-frenzy-pop");
  burst(origin, 0xffcf3f, 36);
  showFloatingText(projectToScreen(origin), "狂暴喷涌!", "frenzy");
}

function updateFrenzy(dt) {
  state.frenzyTimeLeft = Math.max(0, state.frenzyTimeLeft - dt);
  state.frenzySpawnTimer -= dt;
  while (state.frenzyPacksRemaining > 0 && state.frenzySpawnTimer <= 0) {
    spawnFrenzyPack(state.frenzyPackIndex);
    state.frenzyPackIndex += 1;
    state.frenzyPacksRemaining -= 1;
    state.frenzySpawnTimer += FRENZY_PACK_INTERVAL;
  }

  if (state.frenzyTimeLeft <= 0) {
    state.frenzyActive = false;
    state.spawnTimer = 0;
    showFloatingText(centerScreenPoint(), "喷涌结束", "stage");
  }
}

function spawnFrenzyPack(packIndex) {
  const elapsed = ROUND_SECONDS - state.timeLeft;
  const count = FRENZY_FRUITS_PER_PACK;
  const pattern = getFrenzyPattern(packIndex);
  const isFinisher = packIndex >= FRENZY_PACKS - FRENZY_FINISHER_PACKS;
  const pack = buildFrenzyPack(pattern, isFinisher);

  for (let i = 0; i < count; i += 1) {
    state.pendingSpawns.push({
      delay: i * FRENZY_FRUIT_STAGGER,
      type: NORMAL_FRUIT_POOL[Math.floor(Math.random() * NORMAL_FRUIT_POOL.length)],
      waveIndex: i,
      waveCount: count,
      waveCenter: pack.center,
      waveWidth: pack.width,
      waveApexY: pack.apex + pack.apexOffsets[i],
      elapsed,
      fixedX: pack.fixedXs[i],
    });
  }
}

function getFrenzyPattern(packIndex) {
  const patterns = ["left-fan", "right-fan", "center-fountain", "cross-left", "cross-right", "low-arc"];
  return patterns[packIndex % patterns.length];
}

function buildFrenzyPack(pattern, isFinisher) {
  if (isFinisher) {
    return {
      center: 0,
      width: 1.75,
      apex: 2.35,
      fixedXs: [null, null, null, null, null],
      apexOffsets: [-0.08, 0.04, 0.12, 0.04, -0.08],
    };
  }

  const presets = {
    "left-fan": { center: WORLD.left + 1.15, width: 1.75, apex: 2.0 },
    "right-fan": { center: WORLD.right - 1.15, width: 1.75, apex: 2.0 },
    "center-fountain": { center: 0, width: 1.45, apex: 2.45 },
    "cross-left": { center: -0.85, width: 2.45, apex: 2.16 },
    "cross-right": { center: 0.85, width: 2.45, apex: 2.16 },
    "low-arc": { center: THREE.MathUtils.lerp(WORLD.left + 1.0, WORLD.right - 1.0, Math.random()), width: 2.2, apex: 1.55 },
  };
  const preset = presets[pattern] ?? presets["center-fountain"];
  return {
    center: preset.center,
    width: preset.width,
    apex: preset.apex,
    fixedXs: [null, null, null, null, null],
    apexOffsets: [-0.12, 0.02, 0.16, 0.02, -0.12],
  };
}

function startBossPhase() {
  if (state.phase === "boss") return;
  hideBossWarningOverlay();
  clearActiveObjects();
  state.phase = "boss";
  state.timeLeft = BOSS_SECONDS + state.mods.bossTimeBonus;
  state.bossHits = 0;
  state.bossScore = 0;
  state.bossCracked = false;
  state.combo = 0;
  state.lastCutAt = -999;
  spawnBossObject();
  triggerEventImpact("fx-boss-warning");
}

function startBossWarningPhase() {
  if (state.phase === "boss_warning" || state.phase === "boss") return;
  state.phase = "boss_warning";
  state.timeLeft = 0;
  state.spawnTimer = 999;
  state.pendingSpawns = [];
  state.midEventActive = false;
  state.frenzyActive = false;
  state.bossWarningTimer = BOSS_WARNING_COUNTDOWN + 0.25;
  state.bossWarningCountdownStarted = false;
  state.bossWarningLastCue = null;
  state.combo = 0;
  hideBossWarningOverlay();
}

function updateBossWarning(dt) {
  if (hasBossWarningBlockers()) {
    hideBossWarningOverlay();
    return;
  }

  if (!state.bossWarningCountdownStarted) {
    state.bossWarningCountdownStarted = true;
    state.bossWarningTimer = BOSS_WARNING_COUNTDOWN + 0.25;
    state.bossWarningLastCue = null;
    showBossWarningOverlay("countdown", BOSS_WARNING_COUNTDOWN);
  }

  state.bossWarningTimer = Math.max(0, state.bossWarningTimer - dt);
  const cue = Math.ceil(Math.min(BOSS_WARNING_COUNTDOWN, state.bossWarningTimer));
  if (cue > 0 && cue !== state.bossWarningLastCue) {
    state.bossWarningLastCue = cue;
    triggerEventImpact("fx-boss-warning");
    showBossWarningOverlay("countdown", cue);
  }

  if (state.bossWarningTimer <= 0) startBossPhase();
}

function showBossWarningOverlay(mode, count = null) {
  ui.bossWarningLayer.classList.add("visible");
  ui.bossWarningLayer.setAttribute("aria-hidden", "false");
  ui.bossWarningLayer.dataset.mode = mode;
  if (mode === "clearing") {
    ui.bossWarningTag.textContent = "WARNING";
    ui.bossWarningTitle.textContent = "BOSS TIME";
    ui.bossWarningCount.textContent = "!";
    ui.bossWarningCount.classList.remove("count-pop");
    ui.bossWarningHint.textContent = "清场中";
    return;
  }

  const nextCount = String(count ?? BOSS_WARNING_COUNTDOWN);
  ui.bossWarningTag.textContent = "WARNING";
  ui.bossWarningTitle.textContent = "BOSS TIME";
  ui.bossWarningCount.textContent = nextCount;
  ui.bossWarningCount.classList.remove("count-pop");
  void ui.bossWarningCount.offsetWidth;
  ui.bossWarningCount.classList.add("count-pop");
  ui.bossWarningHint.textContent = "准备狂切";
}

function hideBossWarningOverlay() {
  ui.bossWarningLayer.classList.remove("visible");
  ui.bossWarningLayer.setAttribute("aria-hidden", "true");
  ui.bossWarningLayer.dataset.mode = "hidden";
  ui.bossWarningCount.classList.remove("count-pop");
}

function hasBossWarningBlockers() {
  return state.pendingSpawns.length > 0 || state.objects.some((object) => !object.boss);
}

function spawnBossObject() {
  const bossTypes = ["apple", "pear", "lemon", "coconut"];
  const type = bossTypes[(state.stage - 1) % bossTypes.length];
  const baseData = FRUITS[type];
  const bossData = {
    ...baseData,
    label: `巨型${baseData.label}`,
    score: BOSS_BASE_SCORE + state.stage * 2,
    size: Math.max(1.35, baseData.size * 2.35),
    fullScale: (baseData.fullScale ?? 1) * 1.15,
    halfScale: (baseData.halfScale ?? 1) * 1.35,
  };
  const mesh = createFruitMesh(type, bossData);
  const startY = WORLD.bottom - 0.75;
  const duration = state.timeLeft;
  mesh.position.set(0, startY, 0.12);

  const object = {
    id: state.fruitId++,
    type,
    label: bossData.label,
    score: bossData.score,
    danger: false,
    boss: true,
    bossData,
    radius: bossData.size * 0.86,
    mesh,
    baseScale: mesh.scale.clone(),
    bossElapsed: 0,
    bossDuration: duration,
    startY,
    endY: WORLD.bottom - 0.55,
    peakLift: Math.max(7.4, WORLD.top - startY - 1.0),
    spin: new THREE.Vector3(0.5, 1.2, 0.35),
    cut: false,
    cracked: false,
    crackStage: 0,
    pulse: 0,
    lastBossHitAt: -999,
  };

  state.boss = object;
  state.objects.push(object);
  entityGroup.add(mesh);
}

function finishBossPhase() {
  if (state.phase !== "boss") return;
  const boss = state.boss;
  state.phase = "stage_result";
  if (boss) {
    if (!state.bossCracked) crackBossObject(boss, "终局裂开");
    const finalBonus = Math.round((BOSS_FINAL_BONUS + state.bossHits * 4 + state.stage * 14) * (1 + state.mods.bossScoreBonus));
    const gained = addScore(finalBonus);
    state.bossScore += gained;
    burst(boss.mesh.position, FRUITS[boss.type].color, 26);
    spawnBossCutPieces(boss);
    showFloatingText(projectToScreen(boss.mesh.position), `爆裂 +${gained}`, "boss");
  }
  clearActiveObjects();
  finishStage();
}

function finishStage() {
  const passed = state.stageScore >= state.stageTarget;
  if (!passed) {
    endRound(`第${state.stage}关未达标 ${state.stageScore}/${state.stageTarget}`);
    return;
  }

  state.stageClears += 1;
  state.deathReason = `第${state.stage}关通过`;
  const opened = openUpgradeSequence("升级选择", `第${state.stage}关通过，消耗升级点`, startNextStage);
  if (!opened) startNextStage();
}

function startNextStage() {
  clearActiveObjects();
  state.stage += 1;
  state.phase = "normal";
  state.timeLeft = ROUND_SECONDS;
  state.stageScore = 0;
  state.stageTarget = getStageTarget(state.stage);
  state.stageTimedUpgradeTaken = false;
  state.stageXpUpgradeTaken = false;
  state.midEventTriggered = false;
  state.midEventActive = false;
  state.midEventTimer = 0;
  state.frenzyActive = false;
  state.frenzyTimeLeft = 0;
  state.frenzySpawnTimer = 0;
  state.frenzyPacksRemaining = 0;
  state.frenzyPackIndex = 0;
  state.frenzyScore = 0;
  state.bossWarningTimer = 0;
  state.bossWarningCountdownStarted = false;
  state.bossWarningLastCue = null;
  state.penaltyScore = 0;
  state.combo = 0;
  state.spawnTimer = 0;
  state.lastCutAt = -999;
  state.boss = null;
  state.bossHits = 0;
  state.bossScore = 0;
  state.bossCracked = false;
  hide(ui.resultOverlay);
  hide(ui.levelOverlay);
  hideBossWarningOverlay();
  state.paused = false;
  state.running = true;
  showFloatingText(centerScreenPoint(), `第${state.stage}关`, "stage");
  updateHud();
}

function clearActiveObjects() {
  entityGroup.clear();
  state.objects = [];
  state.pendingSpawns = [];
  state.boss = null;
}

function clearHazardsAndPending() {
  state.pendingSpawns = [];
  for (let i = state.objects.length - 1; i >= 0; i -= 1) {
    if (state.objects[i].danger) removeObject(i);
  }
}

function updatePendingSpawns(dt) {
  for (let i = state.pendingSpawns.length - 1; i >= 0; i -= 1) {
    const plan = state.pendingSpawns[i];
    plan.delay -= dt;
    if (plan.delay <= 0) {
      spawnObject(
        plan.type,
        plan.waveIndex,
        plan.waveCount,
        plan.waveCenter,
        plan.waveWidth,
        plan.elapsed,
        plan.waveApexY,
        plan.dangerEdgeSide ?? 0,
        plan.fixedX ?? null,
      );
      state.pendingSpawns.splice(i, 1);
    }
  }
}

function updateObjects(dt) {
  const gravity = -5.35;
  for (let i = state.objects.length - 1; i >= 0; i -= 1) {
    const object = state.objects[i];
    if (object.boss) {
      updateBossObject(object, dt);
      continue;
    }

    object.velocity.y += gravity * dt;
    object.mesh.position.addScaledVector(object.velocity, dt);
    object.mesh.rotation.x += object.spin.x * dt;
    object.mesh.rotation.y += object.spin.y * dt;
    object.mesh.rotation.z += object.spin.z * dt;
    if (object.frenzyTarget) updateFrenzyTargetVisual(object, dt);

    if (object.velocity.y < 0 && object.mesh.position.y < WORLD.bottom - 1.15) {
      const missPoint = projectToScreen(object.mesh.position);
      removeObject(i);
      if (object.frenzyTarget) {
        showFloatingText(missPoint, "草莓错过", "stage");
      } else if (!object.danger && state.phase === "normal" && !state.frenzyActive) {
        applyScorePenalty(0.05, 6, `${object.label}漏掉`, missPoint);
      }
    }
  }
}

function updateFrenzyTargetVisual(object, dt) {
  object.visualTime += dt;
  const halo = object.mesh.userData.rewardHalo;
  if (!halo) return;
  const breathe = 1 + Math.sin(object.visualTime * 7.5) * 0.13;
  halo.aura.scale.copy(halo.aura.userData.baseScale).multiplyScalar(breathe);
  halo.aura.material.opacity = 0.38 + Math.sin(object.visualTime * 7.5) * 0.08;
  halo.core.scale.copy(halo.core.userData.baseScale).multiplyScalar(1 + Math.sin(object.visualTime * 12) * 0.08);
  halo.core.material.opacity = 0.2 + Math.sin(object.visualTime * 10) * 0.04;
  halo.rays.scale.copy(halo.rays.userData.baseScale).multiplyScalar(1.02 + Math.sin(object.visualTime * 5.2) * 0.06);
  halo.rays.material.rotation = object.visualTime * 0.48;
  halo.rays.material.opacity = 0.24 + Math.sin(object.visualTime * 6.4) * 0.06;
  halo.sparks.forEach((spark, index) => {
    const phase = object.visualTime * 8 + index * 1.7;
    spark.scale.copy(spark.userData.baseScale).multiplyScalar(0.68 + Math.max(0, Math.sin(phase)) * 0.48);
    spark.material.opacity = 0.24 + Math.max(0, Math.sin(phase)) * 0.34;
  });
}

function updateBossObject(object, dt) {
  object.bossElapsed += dt;
  const t = Math.min(1, object.bossElapsed / object.bossDuration);
  const arcY = THREE.MathUtils.lerp(object.startY, object.endY, t) + Math.sin(t * Math.PI) * object.peakLift;
  object.mesh.position.set(Math.sin(t * Math.PI * 2) * 0.22, arcY, 0.12);
  object.mesh.rotation.x += object.spin.x * dt;
  object.mesh.rotation.y += object.spin.y * dt;
  object.mesh.rotation.z += object.spin.z * dt;
  object.pulse = Math.max(0, object.pulse - dt * 3.4);
  const crackedScale = state.bossCracked ? 1.08 : 1;
  object.mesh.scale.copy(object.baseScale).multiplyScalar(crackedScale + object.pulse * 0.18);

  if (!state.bossCracked && (state.bossHits >= BOSS_CRACK_HITS || object.bossElapsed >= BOSS_CRACK_SECONDS)) {
    crackBossObject(object, state.bossHits >= BOSS_CRACK_HITS ? "20连破核" : "最后裂开");
  }
}

function updateFx(dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const particle = state.particles[i];
    particle.velocity.y -= 2.4 * dt;
    particle.mesh.position.addScaledVector(particle.velocity, dt);
    particle.life -= dt;
    particle.mesh.material.opacity = Math.max(0, particle.life / particle.maxLife);
    if (particle.life <= 0) {
      fxGroup.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      particle.mesh.material.dispose();
      state.particles.splice(i, 1);
    }
  }

  for (let i = state.slashFx.length - 1; i >= 0; i -= 1) {
    const slash = state.slashFx[i];
    slash.life -= dt;
    slash.mesh.material.opacity = Math.max(0, slash.life / slash.maxLife) * slash.opacity;
    if (slash.life <= 0) {
      fxGroup.remove(slash.mesh);
      slash.mesh.geometry.dispose();
      slash.mesh.material.dispose();
      state.slashFx.splice(i, 1);
    }
  }

  for (let i = state.cutPieces.length - 1; i >= 0; i -= 1) {
    const piece = state.cutPieces[i];
    piece.velocity.y -= 4.1 * dt;
    piece.mesh.position.addScaledVector(piece.velocity, dt);
    piece.mesh.rotation.x += piece.spin.x * dt;
    piece.mesh.rotation.y += piece.spin.y * dt;
    piece.mesh.rotation.z += piece.spin.z * dt;
    piece.life -= dt;

    const fade = Math.max(0.05, piece.life / piece.maxLife);
    piece.mesh.scale.copy(piece.baseScale).multiplyScalar(0.7 + fade * 0.3);

    if (piece.life <= 0) {
      fxGroup.remove(piece.mesh);
      state.cutPieces.splice(i, 1);
    }
  }
}

function removeObject(index) {
  const object = state.objects[index];
  entityGroup.remove(object.mesh);
  state.objects.splice(index, 1);
}

function addScore(points) {
  const value = Math.max(0, Math.round(points));
  state.score += value;
  state.stageScore += value;
  if (state.frenzyActive) state.frenzyScore += value;
  return value;
}

function applyScorePenalty(rate, minimum, label, screenPoint = null) {
  const adjustedRate = rate * Math.max(0.25, 1 - state.mods.penaltyReduction);
  const penalty = Math.max(minimum, Math.ceil(state.score * adjustedRate));
  state.score = Math.max(0, state.score - penalty);
  state.stageScore = Math.max(0, state.stageScore - penalty);
  state.penaltyScore += penalty;
  state.combo = 0;
  state.deathReason = `${label} -${penalty}`;
  triggerEventImpact("fx-damage");
  showFloatingText(screenPoint ?? { x: window.innerWidth * 0.5, y: window.innerHeight * 0.44 }, `-${penalty}`, "penalty");
}

function cutObject(object, index, cutPoint, isEcho = false, sliceMeta = null) {
  if (object.boss) {
    cutBossObject(object, sliceMeta);
    return;
  }

  if (object.frenzyTarget) {
    cutFrenzyTarget(object, sliceMeta);
    return;
  }

  if (object.cut) return;
  const liveIndex = state.objects.findIndex((item) => item.id === object.id);
  if (liveIndex < 0) return;
  index = liveIndex;
  object.cut = true;

  if (object.danger) {
    burst(object.mesh.position, 0x8a6a35, 18);
    removeObject(index);
    applyScorePenalty(0.1, 28, "切到危险桶", sliceMeta?.screenPoint ?? projectToScreen(object.mesh.position));
    return;
  }

  const now = performance.now() / 1000;
  state.combo = now - state.lastCutAt <= state.mods.comboWindow ? state.combo + 1 : 1;
  state.lastCutAt = now;
  state.maxCombo = Math.max(state.maxCombo, state.combo);

  let score = object.score;
  if (object.type === "coconut") score += state.mods.coconutBonus;
  const grade = sliceMeta?.grade ?? getSliceGrade(1, 0);
  const perfect = grade.key === "perfect";
  score = Math.round(score * (grade.multiplier + state.mods.gradeBonus));
  const multiplier = Math.min(3.2, 1 + state.combo * (0.012 + state.mods.comboBonus));
  score = Math.round(score * multiplier);
  const screenPoint = sliceMeta?.screenPoint ?? projectToScreen(object.mesh.position);

  addScore(score);
  gainXp(Math.max(10, Math.round(score * 0.3)));
  burst(object.mesh.position, state.frenzyActive ? 0xffcf3f : FRUITS[object.type].color, state.frenzyActive ? 14 : perfect ? 18 : 12);
  showFloatingText(screenPoint, state.frenzyActive ? `狂切 +${score}` : `${grade.label} +${score}`, state.frenzyActive ? "frenzy" : grade.key);
  if (!isEcho) recordSwipeHit(object, score, sliceMeta?.screenPoint);
  spawnCutPieces(object);

  if (object.elite === "split") splitObject(object);
  removeObject(index);

  if (state.mods.splashTargets > 0) splashHit(object.mesh.position);
  if (state.mods.chainCount > 0) chainHit(object.mesh.position, state.mods.chainCount);
  if (state.mods.pulse && state.combo > 0 && state.combo % 18 === 0) pulseHit();
  if (state.mods.beam && perfect) beamHit(object.mesh.position.x);

  if (!isEcho && state.mods.afterimage) {
    window.setTimeout(() => {
      const from = object.mesh.position.clone().add(new THREE.Vector3(-1.2, 0.4, 0));
      const to = object.mesh.position.clone().add(new THREE.Vector3(1.2, -0.4, 0));
      slashWorld(from, to, materials.burst);
      hitByWorldSegment(from, to, true);
    }, 80);
  }
}

function cutFrenzyTarget(object, sliceMeta = null) {
  const liveIndex = state.objects.findIndex((item) => item.id === object.id);
  if (liveIndex < 0) return;
  const origin = object.mesh.position.clone();
  const score = addScore(object.score);
  gainXp(Math.max(12, Math.round(score * 0.25)));
  showFloatingText(sliceMeta?.screenPoint ?? projectToScreen(origin), `草莓狂暴 +${score}`, "frenzy");
  removeObject(liveIndex);
  startFrenzyPhase(origin);
}

function triggerEventImpact(className) {
  ui.root.classList.remove(className);
  void ui.root.offsetWidth;
  ui.root.classList.add(className);
  window.setTimeout(() => ui.root.classList.remove(className), 520);
}

function cutBossObject(object, sliceMeta = null) {
  if (state.phase !== "boss") return;
  const now = performance.now() / 1000;
  if (now - object.lastBossHitAt < 0.065) return;
  object.lastBossHitAt = now;

  state.combo = now - state.lastCutAt <= state.mods.comboWindow ? state.combo + 1 : 1;
  state.lastCutAt = now;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.bossHits += 1;
  object.pulse = 1;
  const nextCrackStage = Math.min(4, Math.floor(state.bossHits / 5));

  const grade = sliceMeta?.grade ?? getSliceGrade(1, 0);
  const crackedMultiplier = state.bossCracked ? 2 : 1;
  const hitMultiplier = 1 + state.mods.bossScoreBonus;
  const score = addScore(object.score * (grade.multiplier + state.mods.gradeBonus) * crackedMultiplier * hitMultiplier);
  state.bossScore += score;

  const point = sliceMeta?.screenPoint ?? projectToScreen(object.mesh.position);
  if (!state.bossCracked && nextCrackStage > object.crackStage) {
    object.crackStage = nextCrackStage;
    object.pulse = 1.35;
    triggerEventImpact("fx-boss-warning");
    burst(object.mesh.position, 0xff8a35, 12 + nextCrackStage * 4);
    showFloatingText(point, `裂纹 ${nextCrackStage}/4`, "boss");
  }

  if (!state.bossCracked && state.bossHits >= BOSS_CRACK_HITS) {
    crackBossObject(object, "20连破核");
  }

  const label = state.bossCracked ? `裂核 x${state.bossHits}` : `${state.bossHits}/${BOSS_CRACK_HITS}`;
  burst(object.mesh.position, FRUITS[object.type].color, state.bossCracked ? 14 : 9);
  showFloatingText(point, `${label} +${score}`, state.bossCracked ? "boss" : grade.key);
}

function crackBossObject(object, reason) {
  if (!object || state.bossCracked) return;
  state.bossCracked = true;
  object.cracked = true;
  object.crackStage = 4;
  object.pulse = 1.65;
  const bonus = addScore((BOSS_CRACK_BONUS + state.stage * 10) * (1 + state.mods.bossScoreBonus));
  state.bossScore += bonus;
  burst(object.mesh.position, FRUITS[object.type].color, 32);
  showFloatingText(projectToScreen(object.mesh.position), `${reason} +${bonus}`, "boss");
}

function spawnCutPieces(object) {
  const data = FRUITS[object.type];
  if (!data || data.danger || !assetState.half.has(data.assetName)) return;

  const origin = object.mesh.position.clone();
  for (let i = 0; i < 2; i += 1) {
    const side = i === 0 ? -1 : 1;
    const mesh = createAssetModel(data.assetName, data, "half");
    if (!mesh) return;

    mesh.position.copy(origin);
    mesh.position.x += side * data.size * 0.16;
    mesh.position.z += side * 0.04;
    mesh.rotation.copy(object.mesh.rotation);
    mesh.rotateY(side * 0.9);
    mesh.rotateZ(side * 0.28);

    fxGroup.add(mesh);
    state.cutPieces.push({
      mesh,
      baseScale: mesh.scale.clone(),
      velocity: new THREE.Vector3(side * (1.15 + Math.random() * 0.55), 1.05 + Math.random() * 0.45, (Math.random() - 0.5) * 0.45),
      spin: new THREE.Vector3(side * 4.2, 3.2 + Math.random() * 1.7, side * 2.4),
      life: 0.58,
      maxLife: 0.58,
    });
  }
}

function spawnBossCutPieces(object) {
  const data = object.bossData ?? FRUITS[object.type];
  if (!data || !assetState.half.has(data.assetName)) return;

  const origin = object.mesh.position.clone();
  for (let i = 0; i < 2; i += 1) {
    const side = i === 0 ? -1 : 1;
    const mesh = createAssetModel(data.assetName, data, "half");
    if (!mesh) return;

    mesh.position.copy(origin);
    mesh.position.x += side * data.size * 0.22;
    mesh.rotation.copy(object.mesh.rotation);
    mesh.rotateY(side * 1.1);
    mesh.rotateZ(side * 0.36);

    fxGroup.add(mesh);
    state.cutPieces.push({
      mesh,
      baseScale: mesh.scale.clone(),
      velocity: new THREE.Vector3(side * (1.7 + Math.random() * 0.75), 1.6 + Math.random() * 0.5, (Math.random() - 0.5) * 0.55),
      spin: new THREE.Vector3(side * 4.8, 3.8 + Math.random() * 1.6, side * 2.8),
      life: 0.86,
      maxLife: 0.86,
    });
  }
}

function splitObject(object) {
  for (let i = 0; i < 2; i += 1) {
    const splitType = "egg";
    const mesh = createFruitMesh(splitType, FRUITS[splitType]);
    mesh.scale.setScalar(0.72);
    mesh.position.copy(object.mesh.position);
    const child = {
      id: state.fruitId++,
      type: splitType,
      label: "咕咕蛋碎",
      score: 9,
      danger: false,
      radius: 0.28,
      mesh,
      velocity: new THREE.Vector3(i === 0 ? -0.95 : 0.95, 3.7, (Math.random() - 0.5) * 0.18),
      spin: new THREE.Vector3(3, 3, 2),
      elite: null,
      cut: false,
    };
    state.objects.push(child);
    entityGroup.add(mesh);
  }
}

function splashHit(origin) {
  const targets = state.objects
    .map((object, index) => ({ object, index, distance: object.mesh.position.distanceTo(origin) }))
    .filter((entry) => !entry.object.danger && entry.distance <= state.mods.splashRadius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, state.mods.splashTargets);

  for (let i = targets.length - 1; i >= 0; i -= 1) {
    const entry = targets[i];
    const liveIndex = state.objects.findIndex((object) => object.id === entry.object.id);
    if (liveIndex >= 0) {
      addScore(entry.object.score + 8);
      burst(entry.object.mesh.position, 0xffcf3f, 10);
      spawnCutPieces(entry.object);
      removeObject(liveIndex);
    }
  }
}

function chainHit(origin, count) {
  let current = origin.clone();
  for (let i = 0; i < count; i += 1) {
    const target = state.objects
      .map((object, index) => ({ object, index, distance: object.mesh.position.distanceTo(current) }))
      .filter((entry) => !entry.object.danger && entry.distance <= state.mods.chainRadius)
      .sort((a, b) => a.distance - b.distance)[0];

    if (!target) return;
    const from = current.clone();
    current = target.object.mesh.position.clone();
    slashWorld(from, current, materials.lightning);
    addScore(target.object.score + state.mods.lightningScore);
    burst(current, 0x36d6e7, 9);
    spawnCutPieces(target.object);
    removeObject(target.index);
  }
}

function pulseHit() {
  const targets = state.objects
    .map((object, index) => ({ object, index }))
    .filter((entry) => !entry.object.danger)
    .slice(0, 3)
    .sort((a, b) => b.index - a.index);

  targets.forEach((entry) => {
    addScore(entry.object.score + 14);
    burst(entry.object.mesh.position, 0xffcf3f, 10);
    spawnCutPieces(entry.object);
    removeObject(entry.index);
  });
}

function beamHit(x) {
  const from = new THREE.Vector3(x, WORLD.bottom, 0.2);
  const to = new THREE.Vector3(x, WORLD.top, 0.2);
  slashWorld(from, to, materials.lightning, 0.16);
  const targets = state.objects
    .map((object, index) => ({ object, index, distance: Math.abs(object.mesh.position.x - x) }))
    .filter((entry) => !entry.object.danger && entry.distance < entry.object.radius + 0.18)
    .sort((a, b) => b.index - a.index);

  targets.forEach((entry) => {
    addScore(entry.object.score + 10);
    burst(entry.object.mesh.position, 0x36d6e7, 9);
    spawnCutPieces(entry.object);
    removeObject(entry.index);
  });
}

function gainXp(amount) {
  if (state.phase !== "normal" || state.stageXpUpgradeTaken) return;
  state.xp += amount;
  if (state.xp >= state.xpTarget) {
    state.xp -= state.xpTarget;
    state.xpTarget += 105;
    state.stageXpUpgradeTaken = true;
    awardUpgradePoint("连切升级点");
  }
}

function maybeOpenScheduledUpgrade() {
  if (state.phase !== "normal" || state.stageTimedUpgradeTaken || state.timeLeft > 35) return;
  state.stageTimedUpgradeTaken = true;
  awardUpgradePoint("关卡升级点");
}

function awardUpgradePoint(label) {
  state.upgradePoints += 1;
  showFloatingText(centerScreenPoint(), `+1 ${label}`, "upgrade");
  updateHud();
}

function openUpgradeSequence(kicker = "升级选择", title = "消耗升级点", afterComplete = null) {
  const available = TALENTS.filter((talent) => !state.selectedTalents.includes(talent.id));
  if (state.upgradePoints <= 0 || available.length === 0) {
    if (available.length === 0) state.upgradePoints = 0;
    return false;
  }

  return openUpgrade(kicker, `${title}（剩余 ${state.upgradePoints} 点）`, () => {
    if (state.upgradePoints > 0 && TALENTS.some((talent) => !state.selectedTalents.includes(talent.id))) {
      openUpgradeSequence("继续强化", "继续消耗升级点", afterComplete);
      return;
    }
    if (afterComplete) afterComplete();
  });
}

function openUpgrade(kicker = "升级", title = "选择本局强化", afterPick = null) {
  if (state.paused) return false;
  const available = TALENTS.filter((talent) => !state.selectedTalents.includes(talent.id));
  shuffle(available);
  const choices = available.slice(0, 3);
  if (choices.length === 0) {
    return false;
  }

  state.paused = true;
  state.pendingUpgradeAction = typeof afterPick === "function" ? afterPick : null;
  ui.levelKicker.textContent = kicker;
  ui.levelTitle.textContent = title;
  ui.levelChoices.innerHTML = "";

  choices.forEach((talent) => {
    const button = document.createElement("button");
    button.className = "choice-card";
    button.dataset.tag = talent.tag;
    button.innerHTML = `<span>${tagName(talent.tag)}</span><strong>${talent.name}</strong><span>${talent.desc}</span>`;
    button.addEventListener("click", () => {
      talent.apply();
      state.selectedTalents.push(talent.id);
      state.upgradesTaken += 1;
      state.level += 1;
      state.upgradePoints = Math.max(0, state.upgradePoints - 1);
      const nextAction = state.pendingUpgradeAction;
      state.pendingUpgradeAction = null;
      state.paused = false;
      hide(ui.levelOverlay);
      updateHud();
      if (state.upgradePoints > 0 && !TALENTS.some((item) => !state.selectedTalents.includes(item.id))) {
        state.upgradePoints = 0;
      }
      if (nextAction) nextAction();
    });
    ui.levelChoices.appendChild(button);
  });

  show(ui.levelOverlay);
  updateHud();
  return true;
}

function tagName(tag) {
  if (tag === "combo") return "连击";
  if (tag === "burst") return "爆炸";
  if (tag === "lightning") return "雷电";
  if (tag === "precision") return "准心";
  if (tag === "boss") return "Boss";
  return "稳手";
}

function endRound(reason) {
  if (state.over) return;
  state.running = false;
  state.paused = true;
  state.over = true;
  state.deathReason = reason;
  state.previousBestScore = state.bestScore;

  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem("fruit-survivor-3d-best-score", String(state.bestScore));
  }

  renderResult();
}

function renderResult() {
  const flow = getFlowName();
  let compare = "首把成绩已入账";
  if (state.previousBestScore > 0 && state.score > state.previousBestScore) {
    compare = `新纪录，多切 ${state.score - state.previousBestScore} 分`;
  } else if (state.previousBestScore > 0) {
    compare = `距个人纪录差 ${Math.max(0, state.previousBestScore - state.score)} 分`;
  }

  const stageSummary = `闯到第${state.stage}关，本关 ${state.stageScore}/${state.stageTarget}`;
  ui.resultTitle.textContent = state.score > state.previousBestScore ? "这把切疯了" : "闯关结算";
  ui.resultScore.textContent = state.score.toLocaleString("zh-CN");
  ui.resultCombo.textContent = String(state.maxCombo);
  ui.resultFlow.textContent = flow;
  ui.resultReason.textContent = state.deathReason;
  ui.resultCompare.textContent = `${compare}｜${stageSummary}`;
  show(ui.resultOverlay);
}

function updateHud() {
  ui.root.dataset.phase = state.phase;
  ui.root.dataset.event = state.frenzyActive ? "frenzy" : state.midEventActive ? "strawberry" : "normal";
  ui.penalty.textContent = state.penaltyScore > 0 ? `-${state.penaltyScore}` : "0";
  ui.score.textContent = state.score.toLocaleString("zh-CN");
  ui.timer.textContent = getTimerText();
  ui.combo.textContent = String(state.combo);
  ui.flow.textContent = getFlowName();
  const upgradePips = state.upgradePoints > 0 ? `<em class="upgrade-pips">✦x${state.upgradePoints}</em>` : "";
  if (state.phase === "boss") {
    ui.level.innerHTML = `BOSS 破核 ${Math.min(state.bossHits, BOSS_CRACK_HITS)}/${BOSS_CRACK_HITS}${state.bossCracked ? " 裂核" : ""}`;
    ui.xpBar.style.width = `${Math.min(100, (state.bossHits / BOSS_CRACK_HITS) * 100)}%`;
  } else if (state.phase === "boss_warning") {
    const warningText = state.bossWarningCountdownStarted ? `BOSS 倒计时 ${Math.max(1, Math.ceil(state.bossWarningTimer))}` : "等待清场";
    ui.level.innerHTML = warningText;
    ui.xpBar.style.width = state.bossWarningCountdownStarted ? `${Math.max(0, 100 - (state.bossWarningTimer / (BOSS_WARNING_COUNTDOWN + 0.25)) * 100)}%` : "0%";
  } else {
    ui.level.innerHTML = `第${state.stage}关 ${state.stageScore}/${state.stageTarget}${upgradePips}`;
    ui.xpBar.style.width = `${Math.min(100, (state.stageScore / state.stageTarget) * 100)}%`;
  }
}

function getTimerText() {
  if (state.phase === "boss") return `B${Math.ceil(state.timeLeft)}`;
  if (state.phase === "boss_warning") {
    if (!state.bossWarningCountdownStarted) return "...";
    return String(Math.max(1, Math.ceil(state.bossWarningTimer)));
  }
  return String(Math.ceil(state.timeLeft));
}

function getFlowName() {
  const ranked = Object.entries(state.flow).sort((a, b) => b[1] - a[1]);
  if (!ranked[0] || ranked[0][1] <= 0) return "未成流";
  const names = {
    combo: "连击疾切流",
    burst: "爆汁清屏流",
    lightning: "雷光追切流",
    precision: "准心完切流",
    boss: "破核狂切流",
    survival: "稳手保分流",
  };
  if (ranked[1] && ranked[1][1] > 0 && ranked[1][1] >= ranked[0][1] - 1) {
    return `${names[ranked[0][0]].slice(0, 2)}${names[ranked[1][0]].slice(0, 2)}混切流`;
  }
  return names[ranked[0][0]];
}

function getSliceGrade(offsetRatio, swipeLength) {
  if (offsetRatio <= 0.28 && swipeLength >= 28) {
    return { key: "perfect", label: "PERFECT", multiplier: 1.55 };
  }
  if (offsetRatio <= 0.62) {
    return { key: "great", label: "GREAT", multiplier: 1.25 };
  }
  return { key: "good", label: "GOOD", multiplier: 1 };
}

function beginSwipe(point) {
  state.activeSwipeIds = new Set();
  state.activeSwipeScore = 0;
  state.activeSwipePoint = point;
}

function recordSwipeHit(object, score, point) {
  if (!state.pointerDown || object.danger || state.activeSwipeIds.has(object.id)) return;
  state.activeSwipeIds.add(object.id);
  state.activeSwipeScore += score;
  if (point) state.activeSwipePoint = point;
}

function finishSwipeCombo() {
  const count = state.activeSwipeIds?.size ?? 0;
  if (count >= MIN_SWIPE_COMBO) {
    const bonus = Math.round(state.activeSwipeScore * 0.28 + count * 6);
    addScore(bonus);
    state.combo = Math.max(state.combo, count);
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    gainXp(Math.max(8, Math.round(bonus * 0.25)));
    showFloatingText(state.activeSwipePoint, `${count}连切 +${bonus}`, "combo");
  }

  state.activeSwipeIds = new Set();
  state.activeSwipeScore = 0;
  state.activeSwipePoint = null;
}

function hitByScreenSegment(from, to, isEcho = false) {
  if (!state.running || state.paused) return;

  addSlashDom(from, to);
  const swipeLength = Math.hypot(to.x - from.x, to.y - from.y);
  const hitEntries = [];
  state.objects.forEach((object, index) => {
    const projected = projectToScreen(object.mesh.position);
    const radius = Math.max(object.minHitRadius ?? 34, object.radius * 76) + state.mods.hitPadding * 100;
    const distance = distancePointToSegment(projected.x, projected.y, from.x, from.y, to.x, to.y);
    if (distance <= radius) {
      hitEntries.push({
        object,
        index,
        distance,
        radius,
        screenPoint: closestPointOnSegment(projected.x, projected.y, from.x, from.y, to.x, to.y),
      });
    }
  });

  hitEntries.sort((a, b) => b.index - a.index);
  hitEntries.forEach((entry) => {
    const cutPoint = entry.object.mesh.position.clone();
    const grade = getSliceGrade(entry.distance / entry.radius, swipeLength);
    cutObject(entry.object, entry.index, cutPoint, isEcho, { grade, screenPoint: entry.screenPoint });
  });
}

function hitByWorldSegment(from, to, isEcho = false) {
  const a = projectToScreen(from);
  const b = projectToScreen(to);
  hitByScreenSegment(a, b, isEcho);
}

function addSlashDom(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 8) return;
  const mark = document.createElement("div");
  mark.className = "slash-mark";
  mark.style.width = `${length}px`;
  mark.style.left = `${from.x}px`;
  mark.style.top = `${from.y}px`;
  mark.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  slashLayer.appendChild(mark);
  window.setTimeout(() => mark.remove(), 280);

  const worldA = screenToWorld(from);
  const worldB = screenToWorld(to);
  if (worldA && worldB) slashWorld(worldA, worldB, materials.slash);
}

function showFloatingText(point, text, tone = "good") {
  if (!point) return;
  const mark = document.createElement("div");
  mark.className = `float-text float-${tone}`;
  mark.textContent = text;
  mark.style.left = `${point.x}px`;
  mark.style.top = `${point.y}px`;
  slashLayer.appendChild(mark);
  window.setTimeout(() => mark.remove(), 620);
}

function centerScreenPoint() {
  return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.46 };
}

function slashWorld(from, to, material, width = 0.08) {
  const center = from.clone().add(to).multiplyScalar(0.5);
  const length = from.distanceTo(to);
  const geometry = new THREE.BoxGeometry(width, length, width);
  const mesh = new THREE.Mesh(geometry, material.clone());
  mesh.position.copy(center);
  mesh.lookAt(to);
  mesh.rotateX(Math.PI / 2);
  fxGroup.add(mesh);
  state.slashFx.push({ mesh, life: 0.22, maxLife: 0.22, opacity: material.opacity ?? 0.88 });
}

function screenToWorld(point) {
  const rect = canvas.getBoundingClientRect();
  pointerNdc.x = (point.x / rect.width) * 2 - 1;
  pointerNdc.y = -(point.y / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const target = new THREE.Vector3();
  return raycaster.ray.intersectPlane(plane, target) ? target : null;
}

function projectToScreen(position) {
  const rect = canvas.getBoundingClientRect();
  screenProjection.copy(position).project(camera);
  return {
    x: (screenProjection.x * 0.5 + 0.5) * rect.width,
    y: (-screenProjection.y * 0.5 + 0.5) * rect.height,
  };
}

function burst(position, color, count) {
  const particleCount = Math.min(count, 8);
  for (let i = 0; i < particleCount; i += 1) {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.92,
    });
    const mesh = new THREE.Mesh(reusable.shard, material);
    mesh.position.copy(position);
    const particle = {
      mesh,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 3.3, Math.random() * 2.7, (Math.random() - 0.5) * 1.4),
      life: 0.42 + Math.random() * 0.18,
      maxLife: 0.6,
    };
    state.particles.push(particle);
    fxGroup.add(mesh);
  }
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  const aspect = width / height;
  const halfHeight = VIEW.height / 2;
  const halfWidth = halfHeight * aspect;
  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();

  const playableHalfWidth = Math.min(4.45, halfWidth - VIEW.sidePadding);
  WORLD.left = -playableHalfWidth;
  WORLD.right = playableHalfWidth;
  WORLD.top = camera.top - 0.45;
  WORLD.bottom = camera.bottom + 0.15;
}

function animate() {
  const dt = Math.min(0.033, clock.getDelta());
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function getDebugSnapshot() {
  return {
    running: state.running,
    paused: state.paused,
    phase: state.phase,
    stage: state.stage,
    timeLeft: state.timeLeft,
    score: state.score,
    stageScore: state.stageScore,
    stageTarget: state.stageTarget,
    upgradePoints: state.upgradePoints,
    midEventTriggered: state.midEventTriggered,
    midEventActive: state.midEventActive,
    frenzyActive: state.frenzyActive,
    frenzyTimeLeft: state.frenzyTimeLeft,
    frenzyPacksRemaining: state.frenzyPacksRemaining,
    frenzyScore: state.frenzyScore,
    bossHits: state.bossHits,
    bossCracked: state.bossCracked,
    pendingCount: state.pendingSpawns.length,
    objects: state.objects.map((object) => ({
      id: object.id,
      type: object.type,
      label: object.label,
      danger: object.danger,
      position: object.mesh.position.toArray(),
      screen: projectToScreen(object.mesh.position),
      radiusPx: Math.max(34, object.radius * 76) + state.mods.hitPadding * 100,
    })),
  };
}

window.__fruitDebug = getDebugSnapshot;

function show(element) {
  element.classList.remove("hidden");
  element.classList.add("visible");
}

function hide(element) {
  element.classList.remove("visible");
  element.classList.add("hidden");
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return { x: x1, y: y1 };
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return { x: x1 + t * dx, y: y1 + t * dy };
}

canvas.addEventListener("pointerdown", (event) => {
  if (!state.running || state.paused) return;
  state.pointerDown = true;
  state.lastPointer = { x: event.clientX, y: event.clientY };
  beginSwipe(state.lastPointer);
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!state.pointerDown || !state.running || state.paused) return;
  const point = { x: event.clientX, y: event.clientY };
  hitByScreenSegment(state.lastPointer, point);
  state.lastPointer = point;
});

canvas.addEventListener("pointerup", (event) => {
  finishSwipeCombo();
  state.pointerDown = false;
  state.lastPointer = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener("pointercancel", () => {
  finishSwipeCombo();
  state.pointerDown = false;
  state.lastPointer = null;
});

ui.startButton.addEventListener("click", startRound);
ui.retryButton.addEventListener("click", startRound);
ui.copyButton.addEventListener("click", async () => {
  const text = `【果切幸存者3D挑战卡】\n闯到：第${state.stage}关\n分数：${state.score}\n最大连击：${state.maxCombo}\n流派：${getFlowName()}\n结果：${state.deathReason}\n同一局，你来试试。`;
  try {
    await navigator.clipboard.writeText(text);
    ui.copyButton.textContent = "文案已复制";
  } catch {
    ui.copyButton.textContent = "复制失败";
  }
  window.setTimeout(() => {
    ui.copyButton.textContent = "复制挑战文案";
  }, 1200);
});

window.addEventListener("resize", resize);

resize();
buildWorld();
updateHud();
loadGameAssets();
animate();
