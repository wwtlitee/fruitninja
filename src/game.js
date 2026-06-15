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
  stageBar: document.getElementById("stageBar"),
  xpBar: document.getElementById("xpBar"),
  xpValue: document.getElementById("xpValue"),
  assetStatus: document.getElementById("assetStatusValue"),
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
  resultFrenzy: document.getElementById("resultFrenzy"),
  resultBoss: document.getElementById("resultBoss"),
  resultPenalty: document.getElementById("resultPenalty"),
  resultReason: document.getElementById("resultReason"),
  resultCompare: document.getElementById("resultCompare"),
  bestScore: document.getElementById("bestScoreValue"),
  bestStage: document.getElementById("bestStageValue"),
  pauseButton: document.getElementById("pauseButton"),
  settingsButton: document.getElementById("settingsButton"),
  settingsOverlay: document.getElementById("settingsOverlay"),
  soundToggle: document.getElementById("soundToggle"),
  hapticToggle: document.getElementById("hapticToggle"),
  batteryToggle: document.getElementById("batteryToggle"),
  replayTutorialButton: document.getElementById("replayTutorialButton"),
  clearRecordsButton: document.getElementById("clearRecordsButton"),
  closeSettingsButton: document.getElementById("closeSettingsButton"),
  pauseOverlay: document.getElementById("pauseOverlay"),
  pauseState: document.getElementById("pauseState"),
  resumeButton: document.getElementById("resumeButton"),
  restartButton: document.getElementById("restartButton"),
  homeButton: document.getElementById("homeButton"),
  tutorialOverlay: document.getElementById("tutorialOverlay"),
  tutorialTitle: document.getElementById("tutorialTitle"),
  tutorialText: document.getElementById("tutorialText"),
  tutorialDots: document.getElementById("tutorialDots"),
  tutorialSkipButton: document.getElementById("tutorialSkipButton"),
  tutorialNextButton: document.getElementById("tutorialNextButton"),
  debugPanel: document.getElementById("debugPanel"),
  debugText: document.getElementById("debugText"),
  startButton: document.getElementById("startButton"),
  retryButton: document.getElementById("retryButton"),
  copyButton: document.getElementById("copyButton"),
  downloadCardButton: document.getElementById("downloadCardButton"),
};

const STORAGE_KEYS = {
  bestScore: "fruit-survivor-3d-best-score",
  bestStage: "fruit-survivor-3d-best-stage",
  settings: "fruit-survivor-3d-settings",
  tutorialSeen: "fruit-survivor-3d-tutorial-seen",
};
const DEBUG_PARAMS = new URLSearchParams(window.location.search);
const DEBUG_MODE = DEBUG_PARAMS.get("debug") === "1";
const DEBUG_SCENARIO = DEBUG_PARAMS.get("scenario") || "";
const DEBUG_RUNTIME = {
  speed: Number(DEBUG_PARAMS.get("speed") || 1) || 1,
  noPenalty: DEBUG_PARAMS.get("noPenalty") === "1",
};
const FORCE_TUTORIAL = DEBUG_PARAMS.get("tutorial") === "1";
const FX_LIMITS = {
  particles: 80,
  slashFx: 16,
  cutPieces: 40,
  slashMarks: 16,
  floatingTexts: 24,
};
const PERFORMANCE_TIERS = {
  high: { frameMs: 18, dpr: 1.25, particleScale: 1 },
  medium: { frameMs: 28, dpr: 1, particleScale: 0.75 },
  low: { frameMs: Infinity, dpr: 0.85, particleScale: 0.5 },
};
const DEFAULT_SETTINGS = {
  sound: true,
  haptics: true,
  batterySaver: false,
};
const TUTORIAL_STEPS = [
  { title: "一刀多切", text: "按住划过多个食材，一刀切中 3 个以上会额外加分。" },
  { title: "切得越准分越高", text: "靠近中心是 PERFECT，中段是 GREAT，擦边是 GOOD。" },
  { title: "危险桶只扣分", text: "漏食材会断连但不扣分，切危险桶扣当前关卡分 10%，没有血条。" },
  { title: "金光草莓要抢", text: "30 秒会出现小草莓，切中后进入 5 秒纯水果喷涌。" },
  { title: "Boss 破核狂切", text: "关末清场后进入 Boss，5 秒内狂切，20 刀提前裂核。" },
];
const platform = createPlatformAdapter();
const settings = loadSettings();
const tutorial = {
  index: 0,
  afterClose: null,
};
const perfState = {
  tier: settings.batterySaver ? "low" : "high",
  samples: [],
  stable: settings.batterySaver,
};
const audioState = {
  ctx: null,
  master: null,
  lastPlayed: new Map(),
};
const objectPools = {
  wrappers: [],
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
const FRENZY_ACTIVE_OBJECTS = 24;
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

function createPlatformAdapter() {
  return {
    env: { name: "web", isMiniGame: false },
    storage: {
      get(key, fallback = null) {
        try {
          return localStorage.getItem(key) ?? fallback;
        } catch {
          return fallback;
        }
      },
      set(key, value) {
        try {
          localStorage.setItem(key, String(value));
          return true;
        } catch {
          return false;
        }
      },
      getNumber(key, fallback = 0) {
        const value = this.get(key, null);
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
      },
      setNumber(key, value) {
        return this.set(key, value);
      },
      getJson(key, fallback = null) {
        try {
          const raw = this.get(key, null);
          return raw ? JSON.parse(raw) : fallback;
        } catch {
          return fallback;
        }
      },
      setJson(key, value) {
        return this.set(key, JSON.stringify(value));
      },
      remove(key) {
        try {
          localStorage.removeItem(key);
          return true;
        } catch {
          return false;
        }
      },
    },
    clipboard: {
      async writeText(text) {
        try {
          await navigator.clipboard.writeText(text);
          return { ok: true };
        } catch (error) {
          return { ok: false, reason: error?.message || "clipboard unavailable" };
        }
      },
    },
    device: {
      getViewport() {
        return { width: window.innerWidth, height: window.innerHeight };
      },
      getPixelRatio() {
        return Math.min(window.devicePixelRatio || 1, getPerformanceBudget().dpr);
      },
    },
    haptics: {
      light() {
        if (!settings.haptics) return;
        try { navigator.vibrate?.(10); } catch {}
      },
      medium() {
        if (!settings.haptics) return;
        try { navigator.vibrate?.(24); } catch {}
      },
      heavy() {
        if (!settings.haptics) return;
        try { navigator.vibrate?.([32, 28, 32]); } catch {}
      },
    },
    lifecycle: {
      onHide(callback) {
        document.addEventListener("visibilitychange", () => {
          if (document.hidden) callback();
        });
      },
      onShow(callback) {
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) callback();
        });
      },
    },
    perf: {
      now() {
        return performance.now();
      },
    },
  };
}

function loadSettings() {
  const saved = platform.storage.getJson(STORAGE_KEYS.settings, {});
  return { ...DEFAULT_SETTINGS, ...(saved || {}) };
}

function saveSettings() {
  platform.storage.setJson(STORAGE_KEYS.settings, settings);
}

function applyPerformancePreference() {
  if (settings.batterySaver) {
    perfState.tier = "low";
    perfState.stable = true;
  } else {
    perfState.tier = "high";
    perfState.samples = [];
    perfState.stable = false;
  }
  renderer.setPixelRatio(platform.device.getPixelRatio());
}

function getPerformanceBudget() {
  return PERFORMANCE_TIERS[perfState.tier] || PERFORMANCE_TIERS.high;
}

function nowSeconds() {
  return platform.perf.now() / 1000;
}

function unlockAudio() {
  if (!settings.sound) return;
  if (!audioState.ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioState.ctx = new AudioContextClass();
    audioState.master = audioState.ctx.createGain();
    audioState.master.gain.value = 0.18;
    audioState.master.connect(audioState.ctx.destination);
  }
  audioState.ctx.resume?.();
}

function playSound(name) {
  if (!settings.sound) return;
  unlockAudio();
  const ctx = audioState.ctx;
  if (!ctx || !audioState.master) return;

  const now = ctx.currentTime;
  const throttleKey = name === "cut" || name === "frenzyCut" ? "cut-family" : name;
  const minGap = name === "bossHit" ? 0.075 : name === "cut" || name === "frenzyCut" ? 0.045 : 0.12;
  if ((audioState.lastPlayed.get(throttleKey) || 0) + minGap > now) return;
  audioState.lastPlayed.set(throttleKey, now);

  const presets = {
    start: [520, 0.14, "sine"],
    cut: [520, 0.045, "triangle"],
    perfect: [880, 0.08, "sine"],
    combo: [660, 0.1, "triangle"],
    penalty: [120, 0.16, "sawtooth"],
    strawberry: [920, 0.18, "sine"],
    frenzyCut: [740, 0.035, "triangle"],
    bossWarning: [180, 0.18, "square"],
    bossHit: [210, 0.06, "square"],
    bossCrack: [95, 0.22, "sawtooth"],
    record: [980, 0.2, "sine"],
  };
  const [frequency, duration, type] = presets[name] || presets.cut;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (name === "combo" || name === "strawberry" || name === "record") {
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, now + duration);
  }
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(name === "penalty" ? 0.08 : 0.16, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(audioState.master);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
}

function reportFrameCost(dt) {
  if (perfState.stable) return;
  perfState.samples.push(dt * 1000);
  if (perfState.samples.length > 60) perfState.samples.shift();
  if (perfState.samples.length < 60) return;

  const average = perfState.samples.reduce((sum, value) => sum + value, 0) / perfState.samples.length;
  if (perfState.tier === "high" && average > PERFORMANCE_TIERS.high.frameMs) {
    perfState.tier = "medium";
    renderer.setPixelRatio(platform.device.getPixelRatio());
  } else if (perfState.tier === "medium" && average > PERFORMANCE_TIERS.medium.frameMs) {
    perfState.tier = "low";
    perfState.stable = true;
    renderer.setPixelRatio(platform.device.getPixelRatio());
  }
}

const FRUITS = {
  apple: { label: "苹果", color: 0xff4d5e, score: 10, size: 0.58, assetName: "apple" },
  pear: { label: "梨", color: 0xa7df64, score: 12, size: 0.6, assetName: "pear" },
  lemon: { label: "柠檬", color: 0xffd84d, score: 13, size: 0.55, assetName: "lemon" },
  egg: { label: "咕咕蛋", color: 0xfff1c4, score: 16, size: 0.56, assetName: "egg" },
  avocado: { label: "牛油果", color: 0x67c47f, score: 18, size: 0.62, assetName: "avocado" },
  coconut: { label: "椰壳", color: 0xa8744f, score: 24, size: 0.66, assetName: "coconut" },
  mushroom: { label: "蘑菇", color: 0xff766f, score: 19, size: 0.58, assetName: "mushroom" },
  onion: { label: "洋葱", color: 0xd0a4ff, score: 20, size: 0.58, assetName: "onion" },
  sausage: { label: "香肠", color: 0xff5a1f, score: 14, size: 0.6, assetName: "sausage", fullScale: 1.45 },
  strawberry: { label: "狂暴草莓", color: 0xff2f55, score: 80, size: 0.44, assetName: "strawberry", frenzyTarget: true },
  durian: { label: "蜂巢桶", color: 0x9a6a3a, score: 0, size: 0.64, assetName: "barrel", danger: true },
};

const NORMAL_FRUIT_POOL = ["apple", "pear", "lemon", "egg", "avocado", "coconut", "mushroom", "onion", "sausage"];
const FRUIT_FACTION_IDS = [...NORMAL_FRUIT_POOL];
const FACTION_COPY_SCORE_SCALE = 0.65;
const FACTION_EXTRA_SPAWN_BUFFER = 4;
const FACTION_TIER_THRESHOLDS = [3, 6, 10, 15];
const FRUIT_BASE_SKILL_IDS = ["assimilate", "split", "value"];
const UPGRADE_PRIORITY_SLOT_CHANCE = 0.4;
const FRUIT_MATERIAL_SATURATION = 1.34;
const FRUIT_MATERIAL_CONTRAST = 1.1;
const FRUIT_MATERIAL_BRIGHTNESS = 0.025;
const FRUIT_MATERIAL_COLOR_BIAS = 0.28;

const FRUIT_FACTIONS = {
  apple: { name: "苹果连击流", talentName: "苹果连击", flowPack: "combo", desc: "苹果三件套 + 旧连击流技能包。" },
  pear: { name: "梨心保连流", talentName: "梨心保连", flowPack: "combo_guard", desc: "梨三件套 + 连击回响/保连技能包。" },
  lemon: { name: "柠檬准心流", talentName: "柠檬准心", flowPack: "precision", desc: "柠檬三件套 + 旧准心完切技能包。" },
  egg: { name: "咕咕经验流", talentName: "咕咕经验", flowPack: "xp", desc: "咕咕蛋三件套 + 旧经验飞升技能包。" },
  avocado: { name: "牛油果稳手流", talentName: "牛油果稳手", flowPack: "survival", desc: "牛油果三件套 + 旧稳手保分技能包。" },
  coconut: { name: "椰子爆汁流", talentName: "椰子爆汁", flowPack: "burst", desc: "椰子三件套 + 旧爆汁清屏技能包。" },
  mushroom: { name: "蘑菇雷链流", talentName: "蘑菇雷链", flowPack: "lightning", desc: "蘑菇三件套 + 旧雷光追切技能包。" },
  onion: { name: "洋葱慢切流", talentName: "洋葱慢切", flowPack: "precision_slow", desc: "洋葱三件套 + 旧准心容错技能包。" },
  sausage: { name: "香肠残影流", talentName: "香肠残影", flowPack: "combo_shadow", desc: "香肠三件套 + 旧残影/多目标技能包。" },
};

const FRUIT_BASE_SKILL_DEFS = {
  assimilate: {
    label: "同化",
    maxLevel: 5,
    minMastery: 0,
    describe: (type, nextLevel) => `未投资自然水果有 ${nextLevel * 20}% 概率转成${FRUITS[type].label}。`,
  },
  split: {
    label: "分裂",
    maxLevel: 10,
    minMastery: 0,
    describe: (_type, nextLevel) => {
      const power = nextLevel * 0.2;
      const guaranteed = Math.floor(power);
      const chance = Math.round((power - guaranteed) * 100);
      return `自然出场时额外复制能量 ${Math.round(power * 100)}%，当前为稳定 +${guaranteed}${chance > 0 ? `，再 ${chance}% 额外 +1` : ""}。`;
    },
  },
  value: {
    label: "果价",
    maxLevel: 5,
    minMastery: 0,
    describe: (type, nextLevel) => `${FRUITS[type].label}基础分 +${nextLevel * 2}${nextLevel >= 5 ? "，并触发该水果最终分数 x2" : ""}。`,
  },
};

const FRUIT_FLOW_SKILL_PACKS = {
  apple: [
    { id: "combo_window", label: "连斩达人", maxLevel: 5, describe: () => "苹果命中时连击倍率成长更快。" },
    { id: "combo_score", label: "连击爆分", maxLevel: 5, describe: () => "苹果按当前连击获得额外条件分。" },
    { id: "combo_limit", label: "连击突破", maxLevel: 3, minMastery: 4, describe: () => "苹果高连击时提高本次连击倍率上限。" },
    { id: "combo_fever", label: "连击狂热", maxLevel: 5, minMastery: 6, describe: () => "连击 20+ 时苹果获得额外条件分。" },
  ],
  pear: [
    { id: "combo_echo", label: "连击回响", maxLevel: 5, describe: () => "梨命中积累保连护盾，漏果或危险桶优先消耗护盾。" },
    { id: "combo_window", label: "连斩达人", maxLevel: 5, describe: () => "梨命中额外抬高连击，帮助续连。" },
    { id: "steady_hand", label: "稳手围裙", maxLevel: 5, minMastery: 4, describe: () => "危险桶扣分降低。" },
    { id: "precision_shield", label: "完美护盾", maxLevel: 3, minMastery: 6, describe: () => "梨的 PERFECT 命中更容易保住连击。" },
  ],
  lemon: [
    { id: "precision_focus", label: "刀心校准", maxLevel: 5, describe: () => "柠檬 GOOD/GREAT/PERFECT 得分倍率提高。" },
    { id: "precision_aura", label: "完美光环", maxLevel: 3, minMastery: 4, describe: () => "柠檬 GOOD 判定获得额外容错。" },
    { id: "precision_cap", label: "完美突破", maxLevel: 3, minMastery: 6, describe: () => "柠檬 PERFECT 连续命中收益上限提高。" },
    { id: "beam", label: "天罚刀光", maxLevel: 3, minMastery: 8, describe: () => "柠檬 PERFECT 有概率落下纵向刀光。" },
  ],
  egg: [
    { id: "xp_boost", label: "经验汲取", maxLevel: 5, describe: () => "切咕咕蛋额外获得经验。" },
    { id: "xp_speed", label: "飞升加速", maxLevel: 5, describe: () => "升级所需经验降低。" },
    { id: "xp_double", label: "升级狂热", maxLevel: 5, minMastery: 5, describe: () => "升级时有概率额外获得升级点。" },
    { id: "xp_overflow", label: "经验溢出", maxLevel: 3, minMastery: 8, describe: () => "阶段升级点已拿到后，溢出经验可转成分数。" },
  ],
  avocado: [
    { id: "steady_hand", label: "稳手围裙", maxLevel: 5, describe: () => "危险桶扣分降低。" },
    { id: "combo_echo", label: "连击回响", maxLevel: 5, describe: () => "牛油果命中积累护切层，优先保住连击。" },
    { id: "perfect_shield", label: "完美护盾", maxLevel: 3, minMastery: 5, describe: () => "PERFECT 牛油果额外提供护盾。" },
    { id: "boss_time", label: "多一口气", maxLevel: 3, minMastery: 8, describe: () => "Boss 时间轻微延长。" },
  ],
  coconut: [
    { id: "splash", label: "果汁四溅", maxLevel: 5, describe: () => "椰子命中会爆汁打到附近目标。" },
    { id: "splash_big", label: "爆汁扩散", maxLevel: 5, describe: () => "椰子爆汁范围扩大。" },
    { id: "burst_nova", label: "爆汁新星", maxLevel: 5, minMastery: 5, describe: () => "多次椰子爆汁后触发脉冲清目标。" },
    { id: "burst_overload", label: "爆汁过载", maxLevel: 3, minMastery: 7, describe: () => "椰子爆汁可追加二段小爆汁。" },
    { id: "burst_coconut", label: "椰壳共鸣", maxLevel: 3, minMastery: 9, describe: () => "椰子爆汁目标数进一步提高。" },
  ],
  mushroom: [
    { id: "chain", label: "雷霆果刀", maxLevel: 5, describe: () => "蘑菇命中后连锁附近水果。" },
    { id: "chain_plus", label: "静电增幅", maxLevel: 5, describe: () => "蘑菇连锁半径和次数提高。" },
    { id: "chain_overload", label: "雷暴过载", maxLevel: 5, minMastery: 5, describe: () => "蘑菇连锁命中额外给分。" },
    { id: "chain_spread", label: "雷电扩散", maxLevel: 3, minMastery: 7, describe: () => "蘑菇连锁后追加小范围扩散。" },
    { id: "chain_beam", label: "天罚刀光", maxLevel: 3, minMastery: 9, describe: () => "蘑菇 PERFECT 有概率落纵向刀光。" },
  ],
  onion: [
    { id: "precision_focus", label: "刀心校准", maxLevel: 5, describe: () => "洋葱慢切时提高评分倍率。" },
    { id: "precision_shield", label: "完美护盾", maxLevel: 3, minMastery: 4, describe: () => "洋葱 GOOD/PERFECT 判定更容易保连。" },
    { id: "precision_aura", label: "完美光环", maxLevel: 3, minMastery: 6, describe: () => "洋葱命中产生短暂慢切容错区。" },
    { id: "precision_cap", label: "完美突破", maxLevel: 3, minMastery: 8, describe: () => "洋葱 PERFECT 连续收益上限提高。" },
  ],
  sausage: [
    { id: "wider_cut", label: "疾风追切", maxLevel: 5, describe: () => "香肠切割判定稍微变宽。" },
    { id: "afterimage", label: "残影刀痕", maxLevel: 3, describe: () => "香肠命中后概率追加残影刀。" },
    { id: "combo_storm", label: "连击风暴", maxLevel: 3, minMastery: 5, describe: () => "高连击时香肠命中可追加追切。" },
    { id: "combo_score", label: "连击爆分", maxLevel: 5, minMastery: 6, describe: () => "香肠按当前连击获得额外条件分。" },
  ],
};

function getFruitSkillEntries(type) {
  const baseSkills = FRUIT_BASE_SKILL_IDS.map((id) => ({ id, ...FRUIT_BASE_SKILL_DEFS[id] }));
  return [...baseSkills, ...(FRUIT_FLOW_SKILL_PACKS[type] || [])];
}

function getFruitSkillIds(type) {
  return getFruitSkillEntries(type).map((skill) => skill.id);
}

function getFruitSkillDef(type, skillId) {
  return getFruitSkillEntries(type).find((skill) => skill.id === skillId) || null;
}

const FLOWS = {
  apple: { name: "苹果丰收流", icon: "🍎", desc: "苹果就是力量" },
  pear: { name: "梨心保鲜流", icon: "🍐", desc: "连击越养越稳" },
  coconut: { name: "椰壳爆破流", icon: "🥥", desc: "椰壳炸裂全场" },
  egg: { name: "鸡蛋连爆流", icon: "🥚", desc: "鸡蛋连击无上限" },
  lemon: { name: "柠檬榨取流", icon: "🍋", desc: "越晚切分越高" },
  avocado: { name: "牛油果护切流", icon: "🥑", desc: "断连保护更厚" },
  mushroom: { name: "毒菇扩散流", icon: "🍄", desc: "毒雾控场" },
  onion: { name: "洋葱慢切流", icon: "🧅", desc: "慢切也能上分" },
  sausage: { name: "香肠分裂流", icon: "🌭", desc: "越切越多" },
};

const FRUIT_FACTION_TALENTS = FRUIT_FACTION_IDS.flatMap((type) =>
  getFruitSkillEntries(type).map((skill) => {
    const skillId = skill.id;
    return {
      id: `fruit_${type}_${skillId}`,
      tag: type,
      fruitType: type,
      skillId,
      skillLabel: skill.label,
      name: `${FRUIT_FACTIONS[type].talentName}·${skill.label}`,
      repeatable: true,
      maxLevel: skill.maxLevel,
      minMastery: skill.minMastery || 0,
      describe: (nextLevel) => skill.describe(type, nextLevel),
      apply: () => upgradeFruitFactionSkill(type, skillId),
    };
  })
);

const ALL_TALENTS = [...FRUIT_FACTION_TALENTS];

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(platform.device.getPixelRatio());
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

const STAGE_TARGETS = [1000, 2000, 4000, 7000, 11000, 16000, 22000, 29000, 37000, 46000];

function getStageTarget(stage) {
  return STAGE_TARGETS[Math.min(stage - 1, STAGE_TARGETS.length - 1)];
}

const state = createInitialState();
const assetState = {
  ready: false,
  loading: false,
  error: null,
  cutPairs: [],
  full: new Map(),
  half: new Map(),
  danger: new Map(),
  failed: [],
  fallbackTypes: new Set(),
};

function getObjectWrapper() {
  return objectPools.wrappers.pop() || {};
}

function releaseObjectWrapper(object) {
  if (!object) return;
  Object.keys(object).forEach((key) => {
    delete object[key];
  });
  if (objectPools.wrappers.length < 72) objectPools.wrappers.push(object);
}

function createFactionState(type) {
  return {
    type,
    skills: Object.fromEntries(getFruitSkillIds(type).map((skillId) => [skillId, 0])),
  };
}

function createInitialFactions() {
  return Object.fromEntries(FRUIT_FACTION_IDS.map((type) => [type, createFactionState(type)]));
}

function createInitialFactionRuntime() {
  return Object.fromEntries(FRUIT_FACTION_IDS.map((type) => [type, {
    marks: 0,
    shieldMarks: 0,
    extraSpawns: 0,
  }]));
}

function getFaction(type) {
  if (!FRUIT_FACTION_IDS.includes(type)) return null;
  if (!state.factions[type]) state.factions[type] = createFactionState(type);
  if (!state.factions[type].skills) {
    const legacyLevel = Math.max(0, state.factions[type].level || 0);
    state.factions[type].skills = Object.fromEntries(getFruitSkillIds(type).map((skillId) => [skillId, 0]));
    state.factions[type].skills.assimilate = Math.min(FRUIT_BASE_SKILL_DEFS.assimilate.maxLevel, legacyLevel);
  } else {
    getFruitSkillIds(type).forEach((skillId) => {
      if (state.factions[type].skills[skillId] === undefined) state.factions[type].skills[skillId] = 0;
    });
  }
  return state.factions[type];
}

function getFruitSkillLevel(type, skillId) {
  return getFaction(type)?.skills?.[skillId] || 0;
}

function getFactionMastery(type) {
  const skills = getFaction(type)?.skills;
  if (!skills) return 0;
  return getFruitSkillIds(type).reduce((sum, skillId) => sum + (skills[skillId] || 0), 0);
}

function getFactionTier(type) {
  const mastery = getFactionMastery(type);
  return FACTION_TIER_THRESHOLDS.reduce((tier, threshold) => tier + (mastery >= threshold ? 1 : 0), 0);
}

function getDominantFactionType() {
  let bestType = null;
  let bestMastery = 0;
  FRUIT_FACTION_IDS.forEach((type) => {
    const mastery = getFactionMastery(type);
    if (mastery > bestMastery) {
      bestType = type;
      bestMastery = mastery;
    }
  });
  return bestType;
}

function getFactionRuntime(type) {
  if (!state.factionRuntime) state.factionRuntime = createInitialFactionRuntime();
  if (!state.factionRuntime[type]) state.factionRuntime[type] = { marks: 0, shieldMarks: 0, extraSpawns: 0 };
  return state.factionRuntime[type];
}

function upgradeFruitFactionSkill(type, skillId) {
  const faction = getFaction(type);
  const skill = getFruitSkillDef(type, skillId);
  if (!faction || !skill) return false;

  const currentLevel = faction.skills[skillId] || 0;
  if (currentLevel >= skill.maxLevel) return false;

  faction.skills[skillId] = currentLevel + 1;
  if (skillId === "assimilate") touchAssimilationOrder(type);
  state.flow.tagCount[type] = (state.flow.tagCount[type] || 0) + 1;

  const mastery = getFactionMastery(type);
  showFloatingText(centerScreenPoint(), `${FRUIT_FACTIONS[type].talentName}·${skill.label} Lv.${faction.skills[skillId]}｜流派Lv.${mastery}`, "upgrade");
  return true;
}

function touchAssimilationOrder(type) {
  if (!FRUIT_FACTION_IDS.includes(type)) return;
  if (!state.assimilationOrder) state.assimilationOrder = [];
  state.assimilationOrder = state.assimilationOrder.filter((entry) => entry !== type);
  state.assimilationOrder.push(type);
}

function upgradeFruitFaction(type) {
  upgradeFruitFactionSkill(type, "assimilate");
}

function getFactionLevel(type) {
  return getFactionMastery(type);
}

function getFactionSkillLevel(type) {
  return getFactionMastery(type);
}

function getFactionAssimilationRate(type) {
  return Math.min(1, getFruitSkillLevel(type, "assimilate") * 0.2);
}

function getFactionCopyPreview(level) {
  const power = Math.max(0, level) * 0.2;
  const guaranteed = Math.floor(power);
  const chance = Math.round((power - guaranteed) * 100);
  return chance > 0 ? `${guaranteed}+${chance}%` : `${guaranteed}`;
}

function getFactionCopyCount(type) {
  const power = getFruitSkillLevel(type, "split") * 0.2;
  let extraCopies = Math.floor(power);
  if (Math.random() < power - extraCopies) extraCopies += 1;
  return 1 + Math.min(2, Math.max(0, extraCopies));
}

function getAssimilationOrder() {
  const ordered = (state.assimilationOrder || []).filter((type) => getFruitSkillLevel(type, "assimilate") > 0);
  const missing = FRUIT_FACTION_IDS.filter((type) => getFruitSkillLevel(type, "assimilate") > 0 && !ordered.includes(type));
  return [...ordered, ...missing];
}

function pickAssimilationFaction(baseType) {
  return getAssimilationOrder().reduce((currentType, type) => (
    Math.random() < getFactionAssimilationRate(type) ? type : currentType
  ), baseType);
}

function resolveFruitSpawnPlans(baseType) {
  if (!FRUIT_FACTION_IDS.includes(baseType)) {
    return [{ type: baseType, spawnMeta: null }];
  }

  const type = pickAssimilationFaction(baseType);
  const assimilated = type !== baseType;
  const isInvestedResult = getFactionMastery(type) > 0;
  const copies = isInvestedResult ? getFactionCopyCount(type) : 1;
  return Array.from({ length: copies }, (_, copyIndex) => ({
    type,
    spawnMeta: {
      factionType: isInvestedResult ? type : null,
      assimilated,
      copyIndex,
      copyScoreScale: copyIndex === 0 ? 1 : FACTION_COPY_SCORE_SCALE,
    },
  }));
}

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
    missCount: 0,
    bombHitCount: 0,
    comboBreakCount: 0,
    comboBreakShield: 0,
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
    talentLevels: {},
    factions: createInitialFactions(),
    assimilationOrder: [],
    factionRuntime: createInitialFactionRuntime(),
    debugMode: DEBUG_MODE,
    previousBestScore: platform.storage.getNumber(STORAGE_KEYS.bestScore, 0),
    bestScore: platform.storage.getNumber(STORAGE_KEYS.bestScore, 0),
    bestStage: Math.max(1, platform.storage.getNumber(STORAGE_KEYS.bestStage, 1)),
    deathReason: "时间结束",
    frenzyTriggered: false,
    bossCrackReason: "",
    startedAt: nowSeconds(),
    pauseReason: "",
    flow: {
      locked: null, lockedAt: null,
      tagCount: { apple: 0, pear: 0, coconut: 0, egg: 0, lemon: 0, avocado: 0, mushroom: 0, onion: 0, sausage: 0 },
      rerollsLeft: 1, synergyBonus: 0,
    },
    mods: createBaseMods(),
  };
}

function createBaseMods() {
  return {
    comboBonus: 0, comboCap: 3.2,
    hitPadding: 0, splashRadius: 0, splashTargets: 0, coconutBonus: 0,
    chainCount: 0, chainRadius: 1.45, lightningScore: 0,
    gradeBonus: 0, gradeWindow: 0, perfectStack: 0, perfectCap: 10, perfectShield: false, perfectAura: false,
    bossScoreBonus: 0, bossTimeBonus: 0, penaltyReduction: 0,
    afterimage: false, pulse: false, beam: false,
    frenzyTimeBonus: 0, frenzyEarly: false, frenzySpawn: false, frenzyAfterMult: 0,
    xpBoost: 0, xpReduction: 0, xpDouble: 0,
  };
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
    fallbackBadge: new THREE.MeshBasicMaterial({ color: 0xffdf38, transparent: true, opacity: 0.92 }),
    tray: new THREE.MeshBasicMaterial({ color: 0x07110e, transparent: true, opacity: 0.14 }),
    trayLine: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 }),
    highlight: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 }),
    shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }),
    slash: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 }),
    lightning: new THREE.MeshBasicMaterial({ color: 0x36d6e7, transparent: true, opacity: 0.82 }),
    burst: new THREE.MeshBasicMaterial({ color: 0xffcf3f, transparent: true, opacity: 0.8 }),
    crack: new THREE.MeshBasicMaterial({ color: 0x2b0b08, transparent: true, opacity: 0.84, depthWrite: false }),
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
  assetState.failed = [];
  assetState.fallbackTypes.clear();
  ui.startButton.disabled = true;
  ui.startButton.textContent = "模型加载中...";
  renderAssetStatus();

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
          assetState.failed.push(pair.name);
          console.warn(`failed to load cuttable model: ${pair.name}`, error);
        }
      }),
    );

    try {
      const danger = await loadGltf(DANGER_MODEL_URL);
      assetState.danger.set("barrel", danger.scene);
    } catch (error) {
      assetState.failed.push("barrel");
      console.warn("failed to load danger model", error);
    }

    try {
      const strawberry = await loadGltf(STRAWBERRY_MODEL_URL);
      assetState.full.set("strawberry", strawberry.scene);
    } catch (error) {
      assetState.failed.push("strawberry");
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
    renderAssetStatus();
  }
}

function loadGltf(url) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(url, resolve, undefined, reject);
  });
}

function syncSettingsUi() {
  ui.soundToggle.checked = settings.sound;
  ui.hapticToggle.checked = settings.haptics;
  ui.batteryToggle.checked = settings.batterySaver;
}

function updateStartRecords() {
  ui.bestScore.textContent = platform.storage.getNumber(STORAGE_KEYS.bestScore, 0).toLocaleString("zh-CN");
  ui.bestStage.textContent = String(Math.max(1, platform.storage.getNumber(STORAGE_KEYS.bestStage, 1)));
}

function openSettings() {
  syncSettingsUi();
  show(ui.settingsOverlay);
}

function closeSettings() {
  hide(ui.settingsOverlay);
}

function shouldShowTutorial() {
  return FORCE_TUTORIAL || (!DEBUG_MODE && platform.storage.get(STORAGE_KEYS.tutorialSeen, "0") !== "1");
}

function showTutorial(afterClose = null, force = false) {
  if (!force && !shouldShowTutorial()) {
    if (afterClose) afterClose();
    return;
  }
  tutorial.index = 0;
  tutorial.afterClose = afterClose;
  hide(ui.startOverlay);
  renderTutorial();
  show(ui.tutorialOverlay);
}

function renderTutorial() {
  const step = TUTORIAL_STEPS[tutorial.index];
  ui.tutorialTitle.textContent = step.title;
  ui.tutorialText.textContent = step.text;
  ui.tutorialDots.innerHTML = TUTORIAL_STEPS.map((_, index) => `<span class="${index === tutorial.index ? "active" : ""}"></span>`).join("");
  ui.tutorialNextButton.textContent = tutorial.index >= TUTORIAL_STEPS.length - 1 ? "开始闯关" : "下一步";
}

function closeTutorial(saveSeen = true) {
  if (saveSeen) platform.storage.set(STORAGE_KEYS.tutorialSeen, "1");
  hide(ui.tutorialOverlay);
  const afterClose = tutorial.afterClose;
  tutorial.afterClose = null;
  if (afterClose) afterClose();
  else show(ui.startOverlay);
}

function setPaused(paused, reason = "manual") {
  if (!state.running || state.over || state.phase === "stage_result") return;
  if (!paused && !ui.levelOverlay.classList.contains("hidden")) return;
  if (paused && state.paused) return;
  if (!paused && !state.paused) return;
  state.paused = paused;
  state.pauseReason = paused ? reason : "";
  if (paused) {
    ui.pauseState.textContent = `第 ${state.stage} 关 / ${state.score.toLocaleString("zh-CN")} 分 / 目标 ${state.stageTarget}`;
    show(ui.pauseOverlay);
  } else {
    hide(ui.pauseOverlay);
    clock.getDelta();
  }
}

function goHome() {
  state.running = false;
  state.paused = true;
  state.over = false;
  clearActiveObjects();
  fxGroup.clear();
  slashLayer.innerHTML = "";
  state.particles = [];
  state.cutPieces = [];
  state.slashFx = [];
  hide(ui.pauseOverlay);
  hide(ui.resultOverlay);
  hide(ui.levelOverlay);
  hide(ui.settingsOverlay);
  hide(ui.tutorialOverlay);
  hideBossWarningOverlay();
  show(ui.startOverlay);
  updateStartRecords();
  updateHud();
}

function startRound(options = {}) {
  if (assetState.loading) return;
  if (!options.skipTutorial && shouldShowTutorial()) {
    showTutorial(() => startRound({ ...options, skipTutorial: true }));
    return;
  }
  unlockAudio();
  clearActiveObjects();
  Object.assign(state, createInitialState());
  fxGroup.clear();
  slashLayer.innerHTML = "";
  state.particles = [];
  state.cutPieces = [];
  state.slashFx = [];
  state.running = true;
  state.paused = false;
  state.over = false;
  state.previousBestScore = state.bestScore;
  hide(ui.startOverlay);
  hide(ui.resultOverlay);
  hide(ui.levelOverlay);
  hide(ui.pauseOverlay);
  hideBossWarningOverlay();
  updateHud();
  playSound("start");
}

function getActiveObjectLimit() {
  return state.frenzyActive ? FRENZY_ACTIVE_OBJECTS : MAX_ACTIVE_OBJECTS;
}

function spawnWave(elapsed) {
  const openSlots = getActiveObjectLimit() - state.objects.length - state.pendingSpawns.length;
  if (openSlots <= 0) return;

  const pool = getSpawnPool(elapsed);
  const wantsDanger = elapsed > 12 && openSlots >= 4 && Math.random() < getDangerChance(elapsed);
  const count = Math.min(openSlots - (wantsDanger ? 1 : 0), getWaveSize(elapsed));
  const waveCenter = THREE.MathUtils.lerp(WORLD.left + 1.0, WORLD.right - 1.0, Math.random());
  const waveWidth = Math.min(WORLD.right - WORLD.left - 0.9, 1.45 + count * 0.48);
  const waveApexY = THREE.MathUtils.lerp(1.15, 2.15, Math.random());
  const launchDelays = Array.from({ length: count }, (_, index) => index * 0.085 + Math.random() * 0.12);
  shuffle(launchDelays);

  let queuedFruitCount = 0;
  const fruitSpawnBudget = Math.max(count, Math.min(getActiveObjectLimit() + FACTION_EXTRA_SPAWN_BUFFER, openSlots + FACTION_EXTRA_SPAWN_BUFFER - (wantsDanger ? 1 : 0)));
  for (let i = 0; i < count; i += 1) {
    const baseType = pool[Math.floor(Math.random() * pool.length)];
    const spawnPlans = resolveFruitSpawnPlans(baseType);
    for (let copyIndex = 0; copyIndex < spawnPlans.length; copyIndex += 1) {
      if (queuedFruitCount >= fruitSpawnBudget) break;
      const plan = spawnPlans[copyIndex];
      state.pendingSpawns.push({
        delay: launchDelays[i] + copyIndex * 0.035,
        type: plan.type,
        waveIndex: i + copyIndex * 0.17,
        waveCount: count,
        waveCenter,
        waveWidth,
        waveApexY,
        elapsed,
        spawnMeta: plan.spawnMeta,
      });
      queuedFruitCount += 1;
    }
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

function spawnObject(type, waveIndex = 0, waveCount = 1, waveCenter = 0, waveWidth = 1.4, elapsed = 0, waveApexY = 1.6, dangerEdgeSide = 0, fixedX = null, spawnMeta = null) {
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

  const object = Object.assign(getObjectWrapper(), {
    id: state.fruitId++,
    type,
    label: data.label,
    score: data.score,
    factionType: spawnMeta?.factionType ?? type,
    assimilated: Boolean(spawnMeta?.assimilated),
    copyIndex: spawnMeta?.copyIndex ?? 0,
    copyScoreScale: spawnMeta?.copyScoreScale ?? 1,
    danger: Boolean(data.danger),
    frenzyTarget: Boolean(data.frenzyTarget),
    radius: data.size * 0.9,
    minHitRadius: data.frenzyTarget ? 22 : 34,
    mesh,
    fallbackModel: Boolean(mesh.userData?.fallbackModel),
    velocity: new THREE.Vector3(laneDrift, data.danger ? verticalSpeed * 1.08 : data.frenzyTarget ? verticalSpeed * 0.88 : verticalSpeed, (Math.random() - 0.5) * 0.18),
    spin: new THREE.Vector3(Math.random() * 2.5, Math.random() * 3, Math.random() * 2.5),
    elite: null,
    cut: false,
    apexY,
    visualTime: 0,
    visibleTime: 0,
    wasVisible: false,
  });

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
  assetState.fallbackTypes.add(type);
  renderAssetStatus();
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
  const tint = new THREE.Color(data.color);
  const emissiveBoost = data.danger ? 0.2 : variant === "half" ? 0.1 : 0.07;

  group.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    const tuneMaterial = (material) => {
      const clone = material.clone();
      if (data.tintModel) {
        if (clone.color) clone.color.copy(tint);
        if (clone.map) clone.map = null;
        if (clone.emissive) clone.emissive.copy(tint).multiplyScalar(emissiveBoost);
        if (clone.metalness !== undefined) clone.metalness = 0;
        if (clone.roughness !== undefined) clone.roughness = 0.5;
      } else if (!data.danger) {
        enhanceFruitMaterialColor(clone, data, variant);
      }
      clone.needsUpdate = true;
      return clone;
    };

    child.material = Array.isArray(child.material) ? child.material.map(tuneMaterial) : tuneMaterial(child.material);
  });
}

function enhanceFruitMaterialColor(material, data, variant) {
  const accent = new THREE.Color(data.color);
  let lowColorBoost = 0;
  if (material.color) {
    const originalHsl = {};
    material.color.getHSL(originalHsl);
    lowColorBoost = (originalHsl.s < 0.28 ? 0.12 : 0) + (originalHsl.l < 0.36 ? 0.16 : 0);
    const colorBias = THREE.MathUtils.clamp((variant === "half" ? FRUIT_MATERIAL_COLOR_BIAS + 0.06 : FRUIT_MATERIAL_COLOR_BIAS) + lowColorBoost, 0, 0.56);
    material.color.lerp(accent, colorBias);
    boostColorSaturation(material.color, variant === "half" ? 1.22 : 1);
  }
  if (material.emissive) {
    if (lowColorBoost > 0) {
      material.emissive.copy(accent).multiplyScalar(0.055 + lowColorBoost * 0.08);
    } else {
      boostColorSaturation(material.emissive, 0.55);
      material.emissive.multiplyScalar(1.08);
    }
  }
  if (material.roughness !== undefined) material.roughness = Math.max(0.38, material.roughness * 0.92);
  if (material.metalness !== undefined) material.metalness = Math.min(0.08, material.metalness);
}

function boostColorSaturation(color, intensity = 1) {
  const hsl = {};
  color.getHSL(hsl);
  const saturation = THREE.MathUtils.clamp(hsl.s * (1 + (FRUIT_MATERIAL_SATURATION - 1) * intensity) + 0.04 * intensity, 0, 1);
  const lightness = THREE.MathUtils.clamp((hsl.l - 0.5) * (1 + (FRUIT_MATERIAL_CONTRAST - 1) * intensity) + 0.5 + FRUIT_MATERIAL_BRIGHTNESS * intensity, 0, 1);
  color.setHSL(hsl.h, saturation, lightness);
}

function decorateGameplayMesh(group, data) {
  return group;
}

function createFallbackFruitMesh(type, data) {
  const group = new THREE.Group();
  const size = data.size;
  const material = materials[type] ?? materials.apple;
  group.userData.fallbackModel = true;
  group.userData.assetName = data.assetName;

  const main = new THREE.Mesh(reusable.box, material);
  main.scale.set(size, size, size);
  group.add(main);

  const highlight = new THREE.Mesh(reusable.box, materials.highlight);
  highlight.scale.set(size * 0.36, size * 0.06, size * 0.36);
  highlight.position.set(-size * 0.16, size * 0.52, size * 0.18);
  group.add(highlight);

  const badge = new THREE.Mesh(reusable.box, materials.fallbackBadge);
  badge.scale.set(size * 0.16, size * 0.3, size * 0.08);
  badge.position.set(size * 0.45, size * 0.58, size * 0.42);
  badge.renderOrder = 6;
  group.add(badge);

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
    const midEventAt = state.mods.frenzyEarly ? 25 : MID_EVENT_ELAPSED;
    if (!state.midEventTriggered && elapsed >= midEventAt) {
      startMidStageEvent(elapsed);
    }
    if (state.midEventActive) updateMidStageEvent(dt);
    if (state.frenzyActive) updateFrenzy(dt);
    updatePendingSpawns(dt);
    if (!state.midEventActive && !state.frenzyActive && state.spawnTimer <= 0 && state.objects.length + state.pendingSpawns.length < getActiveObjectLimit()) {
      spawnWave(elapsed);
      state.spawnTimer = getWaveInterval(elapsed);
    }
    if (!state.midEventActive && !state.frenzyActive) maybeOpenScheduledUpgrade();
  } else if (state.phase === "boss_warning") {
    updateBossWarning(dt);
  }

  updateObjects(dt);
  updateFx(dt);

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
  playSound("strawberry");
  platform.haptics.medium();
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
  state.frenzyTriggered = true;
  state.frenzyTimeLeft = FRENZY_SECONDS + (state.mods.frenzyTimeBonus || 0);
  state.frenzySpawnTimer = 0;
  state.frenzyPacksRemaining = FRENZY_PACKS;
  state.frenzyPackIndex = 0;
  state.spawnTimer = state.frenzyTimeLeft + 0.25;
  triggerEventImpact("fx-frenzy-pop");
  burst(origin, 0xffcf3f, 36);
  playSound("strawberry");
  platform.haptics.heavy();
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
    state.pendingSpawns = state.pendingSpawns.filter((plan) => !plan.frenzyPack);
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

  let queuedFruitCount = 0;
  const fruitSpawnBudget = Math.min(FRENZY_ACTIVE_OBJECTS, count + FACTION_EXTRA_SPAWN_BUFFER);
  for (let i = 0; i < count; i += 1) {
    const baseType = NORMAL_FRUIT_POOL[Math.floor(Math.random() * NORMAL_FRUIT_POOL.length)];
    const spawnPlans = resolveFruitSpawnPlans(baseType);
    for (let copyIndex = 0; copyIndex < spawnPlans.length; copyIndex += 1) {
      if (queuedFruitCount >= fruitSpawnBudget) break;
      const plan = spawnPlans[copyIndex];
      state.pendingSpawns.push({
        delay: i * FRENZY_FRUIT_STAGGER + copyIndex * 0.018,
        type: plan.type,
        waveIndex: i + copyIndex * 0.16,
        waveCount: count,
        waveCenter: pack.center,
        waveWidth: pack.width,
        waveApexY: pack.apex + pack.apexOffsets[i],
        elapsed,
        fixedX: Number.isFinite(pack.fixedXs[i]) ? pack.fixedXs[i] + (copyIndex === 0 ? 0 : (copyIndex - 0.5) * 0.12) : pack.fixedXs[i],
        frenzyPack: true,
        spawnMeta: plan.spawnMeta,
      });
      queuedFruitCount += 1;
    }
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
  state.timeLeft = BOSS_SECONDS + state.mods.bossTimeBonus + getFruitSkillLevel("avocado", "boss_time") * 0.25;
  state.bossHits = 0;
  state.bossCracked = false;
  state.bossCrackReason = "";
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
    playSound("bossWarning");
    platform.haptics.light();
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

  const object = Object.assign(getObjectWrapper(), {
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
    crackMarks: [],
    pulse: 0,
    lastBossHitAt: -999,
  });

  state.boss = object;
  state.objects.push(object);
  entityGroup.add(mesh);
}

function applyBossCrackVisual(object, targetStage = object.crackStage) {
  if (!object?.mesh) return;
  object.crackMarks ||= [];
  const marks = [
    { x: -0.16, y: 0.16, z: 0.28, length: 0.76, angle: -0.44 },
    { x: 0.2, y: -0.04, z: 0.31, length: 0.92, angle: 0.52 },
    { x: -0.02, y: -0.2, z: 0.34, length: 0.68, angle: -0.86 },
    { x: 0.05, y: 0.24, z: 0.37, length: 1.08, angle: 0.14 },
  ];

  while (object.crackMarks.length < Math.min(targetStage, marks.length)) {
    const index = object.crackMarks.length;
    const markData = marks[index];
    const mark = new THREE.Mesh(reusable.box, materials.crack);
    mark.position.set(markData.x, markData.y, markData.z);
    mark.rotation.set(0, 0, markData.angle);
    mark.scale.set(0.035, markData.length, 0.035);
    mark.renderOrder = 12;
    object.mesh.add(mark);
    object.crackMarks.push(mark);
  }
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
  state.bossWarningTimer = 0;
  state.bossWarningCountdownStarted = false;
  state.bossWarningLastCue = null;
  state.penaltyScore = 0;
  state.flow.rerollsLeft = 1;
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
  state.objects.forEach((object) => releaseObjectWrapper(object));
  entityGroup.clear();
  state.objects = [];
  state.pendingSpawns = [];
  state.boss = null;
}

function clearHazardsAndPending() {
  state.pendingSpawns = state.pendingSpawns.filter((plan) => !FRUITS[plan.type]?.danger);
  for (let i = state.objects.length - 1; i >= 0; i -= 1) {
    if (state.objects[i].danger) removeObject(i);
  }
}

function updatePendingSpawns(dt) {
  for (let i = state.pendingSpawns.length - 1; i >= 0; i -= 1) {
    const plan = state.pendingSpawns[i];
    if (plan.frenzyPack && !state.frenzyActive) {
      state.pendingSpawns.splice(i, 1);
      continue;
    }
    plan.delay -= dt;
    if (plan.delay <= 0) {
      if (state.objects.length >= getActiveObjectLimit()) {
        plan.delay = 0.04;
        continue;
      }
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
        plan.spawnMeta ?? null,
      );
      state.pendingSpawns.splice(i, 1);
    }
  }
}

function updateObjectVisibility(object, dt) {
  const screen = projectToScreen(object.mesh.position);
  const viewport = platform.device.getViewport();
  const radius = Math.max(object.minHitRadius ?? 34, object.radius * 76);
  const insideSafeFrame =
    screen.x >= -radius * 0.35 &&
    screen.x <= viewport.width + radius * 0.35 &&
    screen.y >= 72 &&
    screen.y <= viewport.height - 24;

  if (insideSafeFrame) {
    object.visibleTime = (object.visibleTime || 0) + dt;
    if (object.visibleTime >= 0.14) object.wasVisible = true;
  }

  return { screen, radius, insideSafeFrame };
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
    const visibility = updateObjectVisibility(object, dt);

    if (object.velocity.y < 0 && object.mesh.position.y < WORLD.bottom - 1.15) {
      const missPoint = clampScreenPoint(visibility.screen);
      removeObject(i);
      if (object.frenzyTarget) {
        showFloatingText(missPoint, "草莓错过", "stage");
      } else if (!object.danger && state.phase === "normal" && !state.frenzyActive && object.wasVisible) {
        handleMissedFruit(object, missPoint);
      } else if (!object.danger && DEBUG_MODE && !object.wasVisible) {
        showFloatingText(missPoint, `${object.label}未入镜`, "stage");
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

function disposeMaterial(material) {
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }
  material?.dispose?.();
}

function removeParticleAt(index) {
  const particle = state.particles[index];
  if (!particle) return;
  fxGroup.remove(particle.mesh);
  disposeMaterial(particle.mesh.material);
  state.particles.splice(index, 1);
}

function removeSlashFxAt(index) {
  const slash = state.slashFx[index];
  if (!slash) return;
  fxGroup.remove(slash.mesh);
  slash.mesh.geometry?.dispose?.();
  disposeMaterial(slash.mesh.material);
  state.slashFx.splice(index, 1);
}

function removeCutPieceAt(index) {
  const piece = state.cutPieces[index];
  if (!piece) return;
  fxGroup.remove(piece.mesh);
  state.cutPieces.splice(index, 1);
}

function updateFx(dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const particle = state.particles[i];
    particle.velocity.y -= 2.4 * dt;
    particle.mesh.position.addScaledVector(particle.velocity, dt);
    particle.life -= dt;
    particle.mesh.material.opacity = Math.max(0, particle.life / particle.maxLife);
    if (particle.life <= 0) {
      removeParticleAt(i);
    }
  }

  for (let i = state.slashFx.length - 1; i >= 0; i -= 1) {
    const slash = state.slashFx[i];
    slash.life -= dt;
    slash.mesh.material.opacity = Math.max(0, slash.life / slash.maxLife) * slash.opacity;
    if (slash.life <= 0) {
      removeSlashFxAt(i);
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
      removeCutPieceAt(i);
    }
  }
}

function removeObject(index) {
  const object = state.objects[index];
  if (!object) return null;
  entityGroup.remove(object.mesh);
  state.objects.splice(index, 1);
  releaseObjectWrapper(object);
  return object;
}

function getObjectScoreBase(object) {
  const valueLevel = getFruitSkillLevel(object.type, "value");
  const valueMultiplier = valueLevel >= FRUIT_BASE_SKILL_DEFS.value.maxLevel ? 2 : 1;
  const scale = Number.isFinite(object.copyScoreScale) ? object.copyScoreScale : 1;
  return Math.max(0, Math.round((object.score + valueLevel * 2) * valueMultiplier * scale));
}

function createFactionCutBonus() {
  return {
    scoreAdd: 0,
    scoreMultiplier: 1,
    gradeBonus: 0,
    comboBonusRate: 0,
    comboCapBonus: 0,
    extraXp: 0,
    extraCombo: 0,
    shieldGain: 0,
    splashBoost: 0,
    splashRadius: 0,
    burstChain: false,
    pulse: false,
    chainCount: 0,
    chainRadius: 1.45,
    lightningScore: 0,
    beam: false,
    afterimageChance: 0,
    splitChance: 0,
    slowNearby: 0,
    bonusFruitType: null,
    bonusFruitCount: 0,
    text: "",
  };
}

function getFruitFactionCutBonus(object, grade) {
  const type = object.type;
  const bonus = createFactionCutBonus();
  if (getFactionMastery(type) <= 0) return bonus;

  const runtime = getFactionRuntime(type);
  switch (object.type) {
    case "apple":
      bonus.comboBonusRate += getFruitSkillLevel(type, "combo_window") * 0.003;
      bonus.scoreAdd += Math.floor(Math.min(60, state.combo) * getFruitSkillLevel(type, "combo_score") * 0.1);
      if (state.combo >= 20) bonus.scoreAdd += getFruitSkillLevel(type, "combo_fever") * 8;
      bonus.comboCapBonus += getFruitSkillLevel(type, "combo_limit") * 0.35;
      if (state.combo >= 12) bonus.text = "苹果连击";
      break;
    case "pear":
      bonus.extraCombo += Math.floor((getFruitSkillLevel(type, "combo_window") + 2) / 3);
      if (getFruitSkillLevel(type, "combo_echo") > 0) {
        runtime.shieldMarks += 1;
        const threshold = Math.max(3, 7 - getFruitSkillLevel(type, "combo_echo"));
        if (runtime.shieldMarks >= threshold) {
          runtime.shieldMarks = 0;
          bonus.shieldGain = 1 + Math.floor(getFruitSkillLevel(type, "precision_shield") / 2);
          bonus.text = "连击回响";
        }
      }
      if (grade?.key === "perfect") bonus.shieldGain += Math.floor(getFruitSkillLevel(type, "precision_shield") / 3);
      break;
    case "lemon":
      bonus.gradeBonus += getFruitSkillLevel(type, "precision_focus") * 0.04;
      if (grade?.key === "good") bonus.gradeBonus += getFruitSkillLevel(type, "precision_aura") * 0.05;
      bonus.comboCapBonus += getFruitSkillLevel(type, "precision_cap") * 0.25;
      if (grade?.key === "perfect" && Math.random() < getFruitSkillLevel(type, "beam") * 0.18) bonus.beam = true;
      if (Math.abs(object.mesh.position.y - object.apexY) <= 0.55) {
        bonus.slowNearby = Math.max(bonus.slowNearby, 0.86);
        bonus.text = "柠檬准心";
      }
      break;
    case "egg":
      bonus.extraXp += getFruitSkillLevel(type, "xp_boost") * 8;
      if (getFruitSkillLevel(type, "xp_boost") > 0) bonus.text = "经验汲取";
      break;
    case "avocado":
      if (getFruitSkillLevel(type, "combo_echo") > 0 || getFruitSkillLevel(type, "steady_hand") > 0) {
        runtime.shieldMarks += 1 + Math.floor(getFruitSkillLevel(type, "combo_echo") / 3);
        if (runtime.shieldMarks >= Math.max(3, 6 - getFruitSkillLevel(type, "steady_hand"))) {
          runtime.shieldMarks = 0;
          bonus.shieldGain = 1 + Math.floor(getFruitSkillLevel(type, "perfect_shield") / 2);
          bonus.text = "稳手护切";
        }
      }
      break;
    case "coconut":
      if (getFruitSkillLevel(type, "splash") > 0) {
        bonus.splashBoost = Math.min(5, 1 + Math.floor((getFruitSkillLevel(type, "splash") + getFruitSkillLevel(type, "burst_coconut")) / 2));
        bonus.splashRadius = 1.05 + getFruitSkillLevel(type, "splash_big") * 0.16;
        bonus.scoreAdd += getFruitSkillLevel(type, "burst_coconut") * 8;
        bonus.burstChain = getFruitSkillLevel(type, "burst_overload") > 0;
        runtime.marks += 1;
        if (getFruitSkillLevel(type, "burst_nova") > 0 && runtime.marks >= Math.max(4, 9 - getFruitSkillLevel(type, "burst_nova"))) {
          runtime.marks = 0;
          bonus.pulse = true;
        }
        bonus.text = "椰子爆汁";
      }
      break;
    case "mushroom":
      if (getFruitSkillLevel(type, "chain") > 0) {
        bonus.chainCount = Math.min(6, getFruitSkillLevel(type, "chain") + Math.floor(getFruitSkillLevel(type, "chain_plus") / 2));
        bonus.chainRadius = 1.25 + getFruitSkillLevel(type, "chain_plus") * 0.12;
        bonus.lightningScore = getFruitSkillLevel(type, "chain_overload") * 12;
        bonus.burstChain = getFruitSkillLevel(type, "chain_spread") > 0;
        if (grade?.key === "perfect" && Math.random() < getFruitSkillLevel(type, "chain_beam") * 0.16) bonus.beam = true;
        bonus.text = "蘑菇雷链";
      }
      break;
    case "onion":
      bonus.gradeBonus += getFruitSkillLevel(type, "precision_focus") * 0.03;
      if (grade?.key === "good") bonus.extraCombo += getFruitSkillLevel(type, "precision_shield") > 0 ? 1 : 0;
      bonus.slowNearby = Math.max(bonus.slowNearby, 0.9 - getFruitSkillLevel(type, "precision_aura") * 0.04);
      bonus.comboCapBonus += getFruitSkillLevel(type, "precision_cap") * 0.18;
      if (getFruitSkillLevel(type, "precision_focus") > 0 || getFruitSkillLevel(type, "precision_aura") > 0) bonus.text = "洋葱慢切";
      break;
    case "sausage":
      bonus.splitChance = Math.min(0.65, getFruitSkillLevel(type, "wider_cut") * 0.05 + getFruitSkillLevel(type, "combo_storm") * 0.08);
      bonus.afterimageChance = Math.min(0.6, getFruitSkillLevel(type, "afterimage") * 0.16);
      bonus.scoreAdd += Math.floor(Math.min(60, state.combo) * getFruitSkillLevel(type, "combo_score") * 0.08);
      if (bonus.splitChance > 0 || bonus.afterimageChance > 0) bonus.text = "香肠残影";
      break;
    default:
      break;
  }
  return bonus;
}

function queueBonusFruit(type, origin, count = 1) {
  const openSlots = getActiveObjectLimit() + FACTION_EXTRA_SPAWN_BUFFER - state.objects.length - state.pendingSpawns.length;
  const safeCount = Math.min(Math.max(0, openSlots), Math.max(0, count));
  for (let i = 0; i < safeCount; i += 1) {
    state.pendingSpawns.push({
      delay: 0.08 + i * 0.06,
      type,
      waveIndex: i,
      waveCount: safeCount,
      waveCenter: THREE.MathUtils.clamp(origin.x, WORLD.left + 0.8, WORLD.right - 0.8),
      waveWidth: 0.55,
      waveApexY: THREE.MathUtils.clamp(origin.y + 0.7, WORLD.bottom + 3.1, WORLD.top - 1.4),
      elapsed: ROUND_SECONDS - state.timeLeft,
      spawnMeta: {
        factionType: type,
        assimilated: false,
        copyIndex: i + 1,
        copyScoreScale: FACTION_COPY_SCORE_SCALE,
      },
    });
  }
}

function applyNearbySlow(origin, factor) {
  if (!Number.isFinite(factor) || factor <= 0 || factor >= 1) return;
  state.objects.forEach((target) => {
    if (target.cut || target.danger || target.boss || target.frenzyTarget) return;
    if (target.mesh.position.distanceTo(origin) > 1.45) return;
    target.velocity.multiplyScalar(factor);
  });
}

function breakCombo(label) {
  if (state.comboBreakShield > 0) {
    state.comboBreakShield -= 1;
    showFloatingText(centerScreenPoint(), "护切保连", "upgrade");
    return false;
  }
  if (state.combo > 0) state.comboBreakCount += 1;
  state.combo = 0;
  state.deathReason = label;
  return true;
}

function addScore(points) {
  const value = Math.max(0, Math.round(points));
  state.score += value;
  state.stageScore += value;
  if (state.frenzyActive) state.frenzyScore += value;
  return value;
}

function applyScorePenalty(rate, _minimum, label, screenPoint = null) {
  if (DEBUG_RUNTIME.noPenalty) return;
  const adjustedRate = rate * Math.max(0.25, 1 - getPenaltyReduction());
  const baseScore = Math.max(0, state.stageScore);
  const penalty = Math.min(baseScore, Math.max(0, Math.ceil(baseScore * adjustedRate)));
  const viewport = platform.device.getViewport();
  state.score = Math.max(0, state.score - penalty);
  state.stageScore = Math.max(0, state.stageScore - penalty);
  state.penaltyScore += penalty;
  if (label.includes("漏掉")) state.missCount += 1;
  if (label.includes("危险桶")) state.bombHitCount += 1;
  breakCombo(`${label} -${penalty}`);
  state.deathReason = `${label} -${penalty}`;
  playSound("penalty");
  platform.haptics.medium();
  triggerEventImpact("fx-damage");
  showFloatingText(screenPoint ?? { x: viewport.width * 0.5, y: viewport.height * 0.44 }, penalty > 0 ? `-${penalty}` : "MISS", "penalty");
}

function getPenaltyReduction() {
  return Math.min(0.75,
    (state.mods.penaltyReduction || 0) +
    getFruitSkillLevel("avocado", "steady_hand") * 0.08 +
    getFruitSkillLevel("pear", "steady_hand") * 0.04
  );
}

function handleMissedFruit(object, screenPoint) {
  if (DEBUG_RUNTIME.noPenalty) return;
  state.missCount += 1;
  const broke = breakCombo(`${object.label}漏掉`);
  playSound("penalty");
  platform.haptics.light();
  showFloatingText(screenPoint, broke ? "断连" : "护切", "penalty");
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
  const effectOrigin = object.mesh.position.clone();

  if (object.danger) {
    const penaltyPoint = sliceMeta?.screenPoint ?? projectToScreen(object.mesh.position);
    burst(effectOrigin, 0x8a6a35, 18);
    removeObject(index);
    applyScorePenalty(0.1, 0, "切到危险桶", penaltyPoint);
    return;
  }

  const now = nowSeconds();
  state.combo = Math.max(0, state.combo) + 1;
  state.lastCutAt = now;

  let score = getObjectScoreBase(object);
  const grade = sliceMeta?.grade ?? getSliceGrade(1, 0);
  const factionBonus = getFruitFactionCutBonus(object, grade);
  if (factionBonus.extraCombo > 0) state.combo += factionBonus.extraCombo;
  if (factionBonus.shieldGain > 0) state.comboBreakShield = Math.min(5, state.comboBreakShield + factionBonus.shieldGain);
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  score += factionBonus.scoreAdd;
  score = Math.round(score * factionBonus.scoreMultiplier);
  const perfect = grade.key === "perfect";
  if (state.mods.perfectStack !== undefined) {
    if (perfect) state.mods.perfectStack = Math.min(state.mods.perfectCap || 10, state.mods.perfectStack + 1);
    else if (grade.key === "good") { if (!state.mods.perfectShield || state.mods.perfectStack < 5) state.mods.perfectStack = Math.max(0, state.mods.perfectStack - 1); }
  }
  const gradeMult = grade.multiplier + state.mods.gradeBonus + factionBonus.gradeBonus + (state.mods.perfectStack || 0) * 0.02;
  score = Math.round(score * gradeMult);
  const comboCap = (state.mods.comboCap || 3.2) + factionBonus.comboCapBonus;
  const multiplier = Math.min(comboCap, 1 + state.combo * (0.012 + state.mods.comboBonus + factionBonus.comboBonusRate));
  score = Math.round(score * multiplier);
  if (state.mods.frenzyAfterMult > 0 && !state.frenzyActive) score = Math.round(score * (1 + state.mods.frenzyAfterMult));
  const screenPoint = sliceMeta?.screenPoint ?? projectToScreen(object.mesh.position);

  addScore(score);
  gainXp(Math.max(10, Math.round(score * 0.3)) + factionBonus.extraXp);
  playSound(state.frenzyActive ? "frenzyCut" : perfect ? "perfect" : "cut");
  if (perfect) platform.haptics.light();
  burst(effectOrigin, state.frenzyActive ? 0xffcf3f : FRUITS[object.type].color, state.frenzyActive ? 14 : perfect ? 18 : 12);
  showFloatingText(screenPoint, state.frenzyActive ? `狂切 +${score}` : `${grade.label} +${score}`, state.frenzyActive ? "frenzy" : grade.key);
  if (!isEcho) recordSwipeHit(object, score, sliceMeta?.screenPoint);
  spawnCutPieces(object);

  if (object.elite === "split") splitObject(object);
  if (factionBonus.splitChance > 0 && Math.random() < factionBonus.splitChance) splitObject(object);
  removeObject(index);

  if (factionBonus.bonusFruitType && factionBonus.bonusFruitCount > 0) {
    queueBonusFruit(factionBonus.bonusFruitType, effectOrigin, factionBonus.bonusFruitCount);
  }
  if (factionBonus.slowNearby > 0) applyNearbySlow(effectOrigin, factionBonus.slowNearby);
  if (factionBonus.text) showFloatingText(screenPoint, factionBonus.text, "upgrade");

  if (factionBonus.splashBoost > 0) {
    const oldTargets = state.mods.splashTargets;
    const oldRadius = state.mods.splashRadius;
    state.mods.splashTargets = Math.max(state.mods.splashTargets, factionBonus.splashBoost);
    state.mods.splashRadius = Math.max(state.mods.splashRadius, factionBonus.splashRadius || (object.type === "coconut" ? 1.35 : 1.05));
    splashHit(effectOrigin);
    if (factionBonus.burstChain) {
      state.mods.splashTargets = Math.max(1, Math.floor(state.mods.splashTargets / 2));
      state.mods.splashRadius *= 0.58;
      splashHit(effectOrigin);
    }
    state.mods.splashTargets = oldTargets;
    state.mods.splashRadius = oldRadius;
  }
  if (state.mods.splashTargets > 0) splashHit(effectOrigin);
  if (factionBonus.chainCount > 0) chainHit(effectOrigin, factionBonus.chainCount, factionBonus.chainRadius, factionBonus.lightningScore);
  if (factionBonus.pulse) pulseHit();
  if (state.mods.pulse && state.combo > 0 && state.combo % 18 === 0) pulseHit();
  if (state.mods.beam && perfect) beamHit(effectOrigin.x);
  if (factionBonus.beam) beamHit(effectOrigin.x);

  if (!isEcho && (state.mods.afterimage || Math.random() < factionBonus.afterimageChance)) {
    window.setTimeout(() => {
      const from = effectOrigin.clone().add(new THREE.Vector3(-1.2, 0.4, 0));
      const to = effectOrigin.clone().add(new THREE.Vector3(1.2, -0.4, 0));
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
  playSound("strawberry");
  platform.haptics.heavy();
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
  const now = nowSeconds();
  if (now - object.lastBossHitAt < 0.065) return;
  object.lastBossHitAt = now;

  state.combo = Math.max(0, state.combo) + 1;
  state.lastCutAt = now;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.bossHits += 1;
  object.pulse = 1;
  playSound("bossHit");
  platform.haptics.light();
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
    applyBossCrackVisual(object, nextCrackStage);
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
  state.bossCrackReason = reason;
  object.cracked = true;
  object.crackStage = 4;
  object.pulse = 1.65;
  applyBossCrackVisual(object, 4);
  const bonus = addScore((BOSS_CRACK_BONUS + state.stage * 10) * (1 + state.mods.bossScoreBonus));
  state.bossScore += bonus;
  playSound("bossCrack");
  platform.haptics.heavy();
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
    while (state.cutPieces.length >= FX_LIMITS.cutPieces) removeCutPieceAt(0);
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
    while (state.cutPieces.length >= FX_LIMITS.cutPieces) removeCutPieceAt(0);
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
  if (!object || object.danger || object.boss || object.frenzyTarget) return;
  const splitType = FRUIT_FACTION_IDS.includes(object.type) ? object.type : "egg";
  const splitData = FRUITS[splitType];
  for (let i = 0; i < 2; i += 1) {
    const mesh = createFruitMesh(splitType, splitData);
    mesh.scale.setScalar(0.72);
    mesh.position.copy(object.mesh.position);
    const child = Object.assign(getObjectWrapper(), {
      id: state.fruitId++,
      type: splitType,
      label: `${splitData.label}分裂体`,
      score: splitData.score,
      factionType: object.factionType ?? splitType,
      assimilated: Boolean(object.assimilated),
      copyIndex: (object.copyIndex || 0) + i + 1,
      copyScoreScale: FACTION_COPY_SCORE_SCALE,
      danger: false,
      frenzyTarget: false,
      radius: 0.28,
      minHitRadius: 30,
      mesh,
      velocity: new THREE.Vector3(i === 0 ? -0.95 : 0.95, 3.7, (Math.random() - 0.5) * 0.18),
      spin: new THREE.Vector3(3, 3, 2),
      elite: null,
      cut: false,
      apexY: object.mesh.position.y + 1.2,
      visualTime: 0,
      visibleTime: 0,
      wasVisible: true,
    });
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
      addScore(getObjectScoreBase(entry.object) + 8);
      burst(entry.object.mesh.position, 0xffcf3f, 10);
      spawnCutPieces(entry.object);
      removeObject(liveIndex);
    }
  }
}

function chainHit(origin, count, radius = state.mods.chainRadius, scoreBonus = state.mods.lightningScore) {
  let current = origin.clone();
  for (let i = 0; i < count; i += 1) {
    const target = state.objects
      .map((object, index) => ({ object, index, distance: object.mesh.position.distanceTo(current) }))
      .filter((entry) => !entry.object.danger && entry.distance <= radius)
      .sort((a, b) => a.distance - b.distance)[0];

    if (!target) return;
    const from = current.clone();
    current = target.object.mesh.position.clone();
    slashWorld(from, current, materials.lightning);
    addScore(getObjectScoreBase(target.object) + scoreBonus);
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
    addScore(getObjectScoreBase(entry.object) + 14);
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
    addScore(getObjectScoreBase(entry.object) + 10);
    burst(entry.object.mesh.position, 0x36d6e7, 9);
    spawnCutPieces(entry.object);
    removeObject(entry.index);
  });
}

function gainXp(amount) {
  if (state.phase !== "normal" || state.stageXpUpgradeTaken) {
    const overflowRate = getXpOverflowRate();
    if (overflowRate > 0 && state.xp >= state.xpTarget) {
      const overflowScore = Math.floor(state.xp / overflowRate);
      if (overflowScore > 0) {
        addScore(overflowScore);
        state.xp %= overflowRate;
      }
    }
    return;
  }
  let totalAmount = amount + (state.mods.xpBoost || 0);
  state.xp += totalAmount;
  const target = Math.round(state.xpTarget * (1 - getXpReduction()));
  if (state.xp >= target) {
    state.xp -= target; state.xpTarget += 105; state.stageXpUpgradeTaken = true;
    awardUpgradePoint("连切升级点");
    if (Math.random() < getXpDoubleChance()) awardUpgradePoint("飞升额外");
  }
}

function getXpReduction() {
  return Math.min(0.35, (state.mods.xpReduction || 0) + getFruitSkillLevel("egg", "xp_speed") * 0.04);
}

function getXpDoubleChance() {
  return Math.min(0.45, (state.mods.xpDouble || 0) + getFruitSkillLevel("egg", "xp_double") * 0.06);
}

function getXpOverflowRate() {
  const level = getFruitSkillLevel("egg", "xp_overflow");
  if (level <= 0) return 0;
  return Math.max(6, 11 - level * 2);
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

function isFruitFactionTalent(talent) {
  return talent?.id?.startsWith("fruit_") && FRUIT_FACTION_IDS.includes(talent.tag);
}

function getTalentCurrentLevel(talent) {
  if (!talent) return 0;
  if (isFruitFactionTalent(talent)) return getFruitSkillLevel(talent.tag, talent.skillId);
  return state.talentLevels[talent.id] || 0;
}

function isTalentAvailable(talent) {
  if (!talent) return false;
  if (talent.minMastery && getFactionMastery(talent.tag) < talent.minMastery) return false;
  const currentLevel = getTalentCurrentLevel(talent);
  if (talent.repeatable) return currentLevel < (talent.maxLevel || Infinity);
  return !state.selectedTalents.includes(talent.id);
}

function isTalentCompatibleWithFactionFocus(talent) {
  return Boolean(talent);
}

function getAvailableTalents() {
  return ALL_TALENTS.filter((talent) => isTalentAvailable(talent) && isTalentCompatibleWithFactionFocus(talent));
}

function hasAvailableTalent() {
  return getAvailableTalents().length > 0;
}

function applyTalentSelection(talent) {
  const nextLevel = getTalentCurrentLevel(talent) + 1;
  state.talentLevels[talent.id] = nextLevel;
  talent.apply(nextLevel);
  if (!state.selectedTalents.includes(talent.id)) state.selectedTalents.push(talent.id);
  state.upgradesTaken += 1;
  state.level += 1;
}

function openUpgradeSequence(kicker = "升级选择", title = "消耗升级点", afterComplete = null) {
  const available = getAvailableTalents();
  if (state.upgradePoints <= 0 || available.length === 0) { if (available.length === 0) state.upgradePoints = 0; return false; }
  return openUpgrade(kicker, `${title}（剩余 ${state.upgradePoints} 点）`, () => {
    if (state.upgradePoints > 0 && hasAvailableTalent()) {
      openUpgradeSequence("继续强化", "继续消耗升级点", afterComplete); return;
    }
    if (afterComplete) afterComplete();
  });
}

function getUpgradeChoices() {
  const available = getAvailableTalents();
  if (available.length === 0) return [];
  const priorityType = getUpgradePriorityFactionType(available);
  const priorityPool = priorityType ? available.filter((talent) => talent.tag === priorityType) : [];
  const otherPool = priorityType ? available.filter((talent) => talent.tag !== priorityType) : [...available];
  const choices = [];

  while (choices.length < 3 && priorityPool.length + otherPool.length > 0) {
    const shouldUsePriority = priorityPool.length > 0 && (otherPool.length === 0 || Math.random() < UPGRADE_PRIORITY_SLOT_CHANCE);
    const pool = shouldUsePriority ? priorityPool : otherPool.length > 0 ? otherPool : priorityPool;
    choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return choices;
}

function getUpgradePriorityFactionType(available = getAvailableTalents()) {
  const availableTypes = new Set(available.map((talent) => talent.tag));
  return FRUIT_FACTION_IDS
    .filter((type) => availableTypes.has(type))
    .map((type) => ({ type, mastery: getFactionMastery(type) }))
    .filter((entry) => entry.mastery > 0)
    .sort((a, b) => b.mastery - a.mastery)[0]?.type || null;
}

function detectFlowLock() {
  state.flow.locked = getDominantFactionType();
  state.flow.lockedAt = Object.values(state.flow.tagCount).reduce((a, b) => a + b, 0);
}

function checkFlowSynergy() {
  state.flow.synergyBonus = 0;
}

function applyReroll(kicker, title, afterPick) {
  if (state.flow.rerollsLeft > 0) { state.flow.rerollsLeft -= 1; renderUpgradePanel(kicker, title, afterPick); return; }
  if (state.upgradePoints >= 2) { state.upgradePoints -= 2; renderUpgradePanel(kicker, `${title}（消耗 2 点重随）`, afterPick); updateHud(); return; }
}

function openUpgrade(kicker = "升级", title = "选择本局强化", afterPick = null) {
  if (state.paused) return false;
  state.flow.rerollsLeft = 1;
  renderUpgradePanel(kicker, title, afterPick);
  show(ui.levelOverlay); updateHud(); return true;
}

function renderUpgradePanel(kicker, title, afterPick) {
  const choices = getUpgradeChoices();
  if (choices.length === 0) { hide(ui.levelOverlay); state.paused = false; if (afterPick) afterPick(); return; }
  state.paused = true;
  state.pendingUpgradeAction = typeof afterPick === "function" ? afterPick : null;
  ui.levelKicker.textContent = kicker; ui.levelTitle.textContent = title; ui.levelChoices.innerHTML = "";
  choices.forEach((talent) => {
    const button = document.createElement("button"); button.className = "choice-card"; button.dataset.tag = talent.tag;
    const isFlowTag = getDominantFactionType() === talent.tag && getFactionMastery(talent.tag) > 0;
    const flowTag = isFlowTag ? `<span class="flow-tag">主 ${FLOWS[talent.tag]?.name || tagName(talent.tag)}</span>` : `<span class="flow-tag">${FLOWS[talent.tag]?.name || tagName(talent.tag)}</span>`;
    const currentTalentLevel = getTalentCurrentLevel(talent);
    const levelLabel = talent.repeatable ? ` Lv.${currentTalentLevel} → ${currentTalentLevel + 1}` : "";
    const mastery = getFactionMastery(talent.tag);
    button.innerHTML = `${flowTag}<span>${tagName(talent.tag)}｜${talent.skillLabel || "技能"}${levelLabel}｜流派Lv ${mastery}</span><strong>${talent.name}</strong><span>${describeTalent(talent, currentTalentLevel + 1)}</span>`;
    button.addEventListener("click", () => {
      applyTalentSelection(talent);
      state.upgradePoints = Math.max(0, state.upgradePoints - 1);
      detectFlowLock(); checkFlowSynergy();
      const nextAction = state.pendingUpgradeAction; state.pendingUpgradeAction = null; state.paused = false;
      hide(ui.levelOverlay); updateHud();
      if (state.upgradePoints > 0 && !hasAvailableTalent()) state.upgradePoints = 0;
      if (nextAction) nextAction();
    });
    ui.levelChoices.appendChild(button);
  });
  if (state.flow.rerollsLeft > 0 || state.upgradePoints >= 2) {
    const rerollBtn = document.createElement("button"); rerollBtn.className = "reroll-button";
    rerollBtn.textContent = state.flow.rerollsLeft > 0 ? "免费重随 (1)" : "花 2 点重随";
    rerollBtn.addEventListener("click", () => applyReroll(kicker, title, afterPick));
    ui.levelChoices.appendChild(rerollBtn);
  }
}

function tagName(tag) {
  const names = { combo: "连击", burst: "爆炸", lightning: "雷电", precision: "准心", boss: "Boss", survival: "稳手", apple: "苹果", pear: "梨", coconut: "椰壳", egg: "鸡蛋", lemon: "柠檬", avocado: "牛油果", mushroom: "蘑菇", onion: "洋葱", sausage: "香肠", frenzy: "狂暴", xp: "经验", chaos: "混沌" };
  return names[tag] || tag;
}

function describeTalent(talent, nextLevel) {
  if (typeof talent.describe === "function") return talent.describe(nextLevel);
  return talent.desc || "";
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
    if (!state.debugMode) platform.storage.setNumber(STORAGE_KEYS.bestScore, state.bestScore);
  }
  if (state.stage > state.bestStage) {
    state.bestStage = state.stage;
    if (!state.debugMode) platform.storage.setNumber(STORAGE_KEYS.bestStage, state.bestStage);
  }

  renderResult();
}

function buildChallengeText() {
  return [
    "【果切幸存者3D挑战卡】",
    `闯到：第${state.stage}关`,
    `分数：${state.score.toLocaleString("zh-CN")}`,
    `最大连击：${state.maxCombo}`,
    `流派：${getFlowName()}`,
    `狂暴得分：${state.frenzyScore.toLocaleString("zh-CN")}`,
    `Boss得分：${state.bossScore.toLocaleString("zh-CN")}`,
    `扣分：-${state.penaltyScore.toLocaleString("zh-CN")}（漏${state.missCount} / 桶${state.bombHitCount}）`,
    `结果：${state.deathReason}`,
    "同一局，你来试试。",
  ].join("\n");
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
  ui.resultFrenzy.textContent = state.frenzyScore.toLocaleString("zh-CN");
  ui.resultBoss.textContent = `${state.bossScore.toLocaleString("zh-CN")}${state.bossCrackReason ? `｜${state.bossCrackReason}` : ""}`;
  ui.resultPenalty.textContent = `-${state.penaltyScore.toLocaleString("zh-CN")} / 漏${state.missCount} 桶${state.bombHitCount}`;
  ui.resultReason.textContent = state.deathReason;
  ui.resultCompare.textContent = `${compare}｜${stageSummary}`;
  if (state.score > state.previousBestScore) playSound("record");
  updateStartRecords();
  show(ui.resultOverlay);
}

function downloadChallengeCard() {
  const cardCanvas = document.createElement("canvas");
  cardCanvas.width = 720;
  cardCanvas.height = 1280;
  const ctx = cardCanvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, cardCanvas.height);
  gradient.addColorStop(0, "#143126");
  gradient.addColorStop(0.48, "#0b1612");
  gradient.addColorStop(1, "#020605");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, cardCanvas.width, cardCanvas.height);

  ctx.fillStyle = "rgba(255, 207, 63, 0.14)";
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath();
    ctx.arc(80 + i * 110, 210 + (i % 2) * 60, 88, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#ffcf3f";
  ctx.font = "700 34px Microsoft YaHei, sans-serif";
  ctx.fillText("Fruit Survivor 3D", 56, 104);
  ctx.fillStyle = "#f8f7f1";
  ctx.font = "900 76px Microsoft YaHei, sans-serif";
  ctx.fillText("果切幸存者", 56, 188);

  ctx.fillStyle = "#ffcf3f";
  ctx.font = "900 118px Microsoft YaHei, sans-serif";
  ctx.fillText(state.score.toLocaleString("zh-CN"), 56, 350);
  ctx.fillStyle = "#b9c8bf";
  ctx.font = "600 30px Microsoft YaHei, sans-serif";
  ctx.fillText(`第 ${state.stage} 关 / 最大连击 ${state.maxCombo}`, 60, 400);

  const rows = [
    ["流派", getFlowName()],
    ["狂暴得分", state.frenzyScore.toLocaleString("zh-CN")],
    ["Boss得分", state.bossScore.toLocaleString("zh-CN")],
    ["扣分", `-${state.penaltyScore.toLocaleString("zh-CN")} / 漏${state.missCount} 桶${state.bombHitCount}`],
    ["结果", state.deathReason],
  ];
  rows.forEach(([label, value], index) => {
    const y = 510 + index * 104;
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    roundRect(ctx, 56, y - 50, 608, 76, 18);
    ctx.fill();
    ctx.fillStyle = "#b9c8bf";
    ctx.font = "600 24px Microsoft YaHei, sans-serif";
    ctx.fillText(label, 88, y - 8);
    ctx.fillStyle = "#f8f7f1";
    ctx.font = "800 30px Microsoft YaHei, sans-serif";
    ctx.fillText(String(value).slice(0, 20), 246, y - 8);
  });

  ctx.fillStyle = "rgba(29, 213, 138, 0.9)";
  ctx.font = "800 34px Microsoft YaHei, sans-serif";
  ctx.fillText("同一局，你来试试。", 56, 1110);
  ctx.fillStyle = "#b9c8bf";
  ctx.font = "500 24px Microsoft YaHei, sans-serif";
  ctx.fillText("本地原型分享卡", 56, 1162);

  cardCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fruit-survivor-${state.score}.png`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function renderDebugPanel() {
  if (!DEBUG_MODE || !ui.debugText) return;
  const snapshot = getDebugSnapshot();
  ui.debugText.textContent = [
    `phase: ${snapshot.phase}`,
    `running: ${snapshot.running} paused: ${snapshot.paused}`,
    `stage: ${snapshot.stage} score: ${snapshot.score} stageScore: ${snapshot.stageScore}`,
    `time: ${snapshot.timeLeft.toFixed(1)} speed: ${DEBUG_RUNTIME.speed}`,
    `objects: ${snapshot.objects.length} pending: ${snapshot.pendingCount}`,
    `assets: full ${assetState.full.size}/${assetState.cutPairs.length} fallback ${assetState.fallbackTypes.size} failed ${assetState.failed.length}`,
    `event: ${snapshot.frenzyActive ? "frenzy" : snapshot.midEventActive ? "strawberry" : "none"}`,
    `boss: ${snapshot.bossHits}/${BOSS_CRACK_HITS} cracked=${snapshot.bossCracked}`,
    `targets: ${snapshot.objects.slice(0, 4).map((object) => `${object.type}@${Math.round(object.screen.x)},${Math.round(object.screen.y)} r${Math.round(object.radiusPx)} v${object.wasVisible ? 1 : 0}${object.fallbackModel ? " fb" : ""}`).join(" | ") || "-"}`,
    `fx: p${state.particles.length} c${state.cutPieces.length} s${state.slashFx.length}`,
    `perf: ${snapshot.perfTier}`,
  ].join("\n");
}

function renderAssetStatus() {
  if (!ui.assetStatus) return;
  const fallbackCount = assetState.fallbackTypes.size;
  const failedCount = assetState.failed.length;
  const shouldShow = DEBUG_MODE || assetState.loading || fallbackCount > 0 || failedCount > 0 || assetState.error;

  if (!shouldShow) {
    ui.assetStatus.classList.add("hidden");
    return;
  }

  ui.assetStatus.classList.remove("hidden");
  if (assetState.loading) {
    ui.assetStatus.textContent = "模型加载中";
  } else if (failedCount > 0 || fallbackCount > 0 || assetState.error) {
    ui.assetStatus.textContent = `模型降级 ${fallbackCount || failedCount}`;
  } else {
    ui.assetStatus.textContent = `模型 ${assetState.full.size}/${assetState.cutPairs.length}`;
  }
}

function updateHud() {
  ui.root.dataset.phase = state.phase;
  ui.root.dataset.event = state.frenzyActive ? "frenzy" : state.midEventActive ? "strawberry" : "normal";
  ui.penalty.textContent = state.penaltyScore > 0 ? `扣分 -${state.penaltyScore.toLocaleString("zh-CN")}` : "";
  ui.penalty.dataset.active = state.penaltyScore > 0 ? "1" : "0";
  ui.score.textContent = state.score.toLocaleString("zh-CN");
  ui.timer.textContent = getTimerText();
  ui.combo.textContent = String(Math.max(0, state.combo));
  ui.flow.textContent = getFlowName();
  const upgradePips = state.upgradePoints > 0 ? `<em class="upgrade-pips">✦x${state.upgradePoints}</em>` : "";
  const stageProgress = Math.min(100, (state.stageScore / Math.max(1, state.stageTarget)) * 100);
  const xpTarget = Math.max(1, Math.round(state.xpTarget * (1 - (state.mods.xpReduction || 0))));
  const xpProgress = Math.min(100, (state.xp / xpTarget) * 100);

  if (state.phase === "boss") {
    ui.level.innerHTML = `破核 ${Math.min(state.bossHits, BOSS_CRACK_HITS)}/${BOSS_CRACK_HITS}${state.bossCracked ? " 裂核" : ""}`;
    ui.stageBar.style.width = `${Math.min(100, (state.bossHits / BOSS_CRACK_HITS) * 100)}%`;
  } else if (state.phase === "boss_warning") {
    const warningText = state.bossWarningCountdownStarted ? `倒计时 ${Math.max(1, Math.ceil(state.bossWarningTimer))}` : "等待清场";
    ui.level.innerHTML = warningText;
    ui.stageBar.style.width = state.bossWarningCountdownStarted ? `${Math.max(0, 100 - (state.bossWarningTimer / (BOSS_WARNING_COUNTDOWN + 0.25)) * 100)}%` : `${stageProgress}%`;
  } else {
    ui.level.innerHTML = `第${state.stage}关 ${state.stageScore}/${state.stageTarget}`;
    ui.stageBar.style.width = `${stageProgress}%`;
  }
  ui.xpBar.style.width = `${xpProgress}%`;
  ui.xpValue.innerHTML = `${state.xp}/${xpTarget}${upgradePips}`;
  renderAssetStatus();
  renderDebugPanel();
}

function getTimerText() {
  if (state.phase === "boss") return `B${Math.ceil(state.timeLeft)}`;
  if (state.phase === "boss_warning") {
    if (!state.bossWarningCountdownStarted) return "清场";
    return String(Math.max(1, Math.ceil(state.bossWarningTimer)));
  }
  return String(Math.ceil(state.timeLeft));
}

function getFlowName() {
  const dominant = getDominantFactionType();
  if (!dominant) return "未成流";
  const mastery = getFactionMastery(dominant);
  const name = FLOWS[dominant]?.name || tagName(dominant);
  return `${name} 流派Lv.${mastery}`;
}

function getSliceGrade(offsetRatio, swipeLength) {
  const gw = state.mods.gradeWindow || 0;
  if (offsetRatio <= 0.28 + gw && swipeLength >= 28) return { key: "perfect", label: "PERFECT", multiplier: 1.55 };
  if (offsetRatio <= 0.62 + gw) return { key: "great", label: "GREAT", multiplier: 1.25 };
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
    playSound("combo");
    platform.haptics.light();
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
  trimDomFx(".slash-mark", FX_LIMITS.slashMarks - 1);
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
  trimDomFx(".float-text", FX_LIMITS.floatingTexts - 1);
  slashLayer.appendChild(mark);
  window.setTimeout(() => mark.remove(), 620);
}

function trimDomFx(selector, maxBeforeAdd) {
  const nodes = slashLayer.querySelectorAll(selector);
  const extra = nodes.length - maxBeforeAdd;
  for (let i = 0; i < extra; i += 1) nodes[i].remove();
}

function centerScreenPoint() {
  const viewport = platform.device.getViewport();
  return { x: viewport.width * 0.5, y: viewport.height * 0.46 };
}

function clampScreenPoint(point, margin = 28) {
  const viewport = platform.device.getViewport();
  return {
    x: THREE.MathUtils.clamp(point.x, margin, viewport.width - margin),
    y: THREE.MathUtils.clamp(point.y, margin, viewport.height - margin),
  };
}

function slashWorld(from, to, material, width = 0.08) {
  const center = from.clone().add(to).multiplyScalar(0.5);
  const length = from.distanceTo(to);
  const geometry = new THREE.BoxGeometry(width, length, width);
  const mesh = new THREE.Mesh(geometry, material.clone());
  mesh.position.copy(center);
  mesh.lookAt(to);
  mesh.rotateX(Math.PI / 2);
  while (state.slashFx.length >= FX_LIMITS.slashFx) removeSlashFxAt(0);
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
  const particleCount = Math.min(count, Math.max(3, Math.round(8 * getPerformanceBudget().particleScale)));
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
    while (state.particles.length >= FX_LIMITS.particles) removeParticleAt(0);
    state.particles.push(particle);
    fxGroup.add(mesh);
  }
}

function resize() {
  const { width, height } = platform.device.getViewport();
  renderer.setPixelRatio(platform.device.getPixelRatio());
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
  const rawDt = Math.min(0.033, clock.getDelta());
  const dt = rawDt * Math.max(0.1, DEBUG_RUNTIME.speed);
  reportFrameCost(rawDt);
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function getDebugSnapshot() {
  return {
    running: state.running,
    paused: state.paused,
    debugMode: state.debugMode,
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
    perfTier: perfState.tier,
    dominantFaction: getDominantFactionType(),
    assimilationOrder: getAssimilationOrder(),
    factions: getFactionDebugState(),
    pendingCount: state.pendingSpawns.length,
    objects: state.objects.map((object) => ({
      id: object.id,
      type: object.type,
      label: object.label,
      scoreBase: getObjectScoreBase(object),
      copyScoreScale: object.copyScoreScale ?? 1,
      danger: object.danger,
      wasVisible: Boolean(object.wasVisible),
      fallbackModel: Boolean(object.fallbackModel),
      position: object.mesh.position.toArray(),
      screen: projectToScreen(object.mesh.position),
      radiusPx: Math.max(34, object.radius * 76) + state.mods.hitPadding * 100,
    })),
  };
}

function getFactionDebugState() {
  return Object.fromEntries(FRUIT_FACTION_IDS.map((type) => [type, {
    mastery: getFactionMastery(type),
    tier: getFactionTier(type),
    skills: { ...getFaction(type).skills },
  }]));
}

function resetStageRuntimeForDebug() {
  clearActiveObjects();
  hideBossWarningOverlay();
  state.running = true;
  state.paused = false;
  state.over = false;
  state.phase = "normal";
  state.timeLeft = ROUND_SECONDS;
  state.spawnTimer = 999;
  state.midEventTriggered = false;
  state.midEventActive = false;
  state.midEventTimer = 0;
  state.frenzyActive = false;
  state.frenzyTimeLeft = 0;
  state.frenzySpawnTimer = 0;
  state.frenzyPacksRemaining = 0;
  state.frenzyPackIndex = 0;
  state.boss = null;
  state.bossHits = 0;
  state.bossCracked = false;
  state.bossCrackReason = "";
  state.bossWarningTimer = 0;
  state.bossWarningCountdownStarted = false;
  state.bossWarningLastCue = null;
  state.combo = 0;
  state.lastCutAt = -999;
  state.debugMode = true;
}

function startDebugScenario(name = "normal-wave") {
  if (!DEBUG_MODE) return false;
  if (!state.running) startRound();
  resetStageRuntimeForDebug();

  if (name === "normal-wave") {
    state.timeLeft = ROUND_SECONDS - 6;
    spawnWave(6);
  } else if (name === "bomb-wave") {
    state.timeLeft = ROUND_SECONDS - 24;
    startMidStageEvent(24);
    state.pendingSpawns = state.pendingSpawns.filter((plan) => plan.type === "durian");
  } else if (name === "strawberry-event") {
    state.timeLeft = ROUND_SECONDS - MID_EVENT_ELAPSED;
    startMidStageEvent(MID_EVENT_ELAPSED);
  } else if (name === "frenzy-100") {
    state.timeLeft = ROUND_SECONDS - (MID_EVENT_ELAPSED + 2);
    startFrenzyPhase(new THREE.Vector3(0, 1.6, 0));
  } else if (name === "boss-warning") {
    state.timeLeft = 0;
    startBossWarningPhase();
    updateBossWarning(0.01);
  } else if (name === "boss-crack") {
    startBossPhase();
    state.bossHits = BOSS_CRACK_HITS - 1;
    state.timeLeft = BOSS_SECONDS;
  } else if (name === "stage-clear") {
    state.stageScore = state.stageTarget;
    state.score = Math.max(state.score, state.stageTarget);
    finishStage();
  } else if (name === "stage-fail") {
    state.stageScore = 0;
    state.score = 0;
    endRound(`第${state.stage}关未达标 0/${state.stageTarget}`);
  } else {
    spawnWave(6);
  }

  updateHud();
  return true;
}

function maybeAutoStartDebugScenario() {
  if (!DEBUG_MODE || !DEBUG_SCENARIO) return;
  startDebugScenario(DEBUG_SCENARIO);
}

function installDebugApi() {
  window.__fruitDebug = getDebugSnapshot;
  window.__fruitStartScenario = startDebugScenario;
  window.__fruitSpawn = (type, options = {}) => {
    if (!DEBUG_MODE) return false;
    if (!state.running) startRound();
    spawnObject(
      type,
      options.waveIndex ?? 0,
      options.waveCount ?? 1,
      options.waveCenter ?? 0,
      options.waveWidth ?? 1.4,
      ROUND_SECONDS - state.timeLeft,
      options.waveApexY ?? 1.8,
      options.dangerEdgeSide ?? 0,
      options.fixedX ?? null,
    );
    updateHud();
    return true;
  };
  window.__fruitClearObjects = () => {
    clearActiveObjects();
    updateHud();
  };
  window.__fruitSetStage = (stage) => {
    const nextStage = Math.max(1, Math.round(Number(stage) || 1));
    state.stage = nextStage;
    state.stageTarget = getStageTarget(nextStage);
    updateHud();
  };
  window.__fruitSetTime = (seconds) => {
    state.timeLeft = Math.max(0, Number(seconds) || 0);
    updateHud();
  };
  window.__fruitSetScore = (score) => {
    const value = Math.max(0, Math.round(Number(score) || 0));
    state.score = value;
    state.stageScore = value;
    updateHud();
  };
  window.__fruitSetSpeed = (multiplier) => {
    DEBUG_RUNTIME.speed = Math.max(0.1, Number(multiplier) || 1);
  };
  window.__fruitUpgradeFaction = (type, times = 1, skillId = "assimilate") => {
    if (!DEBUG_MODE || !FRUIT_FACTION_IDS.includes(type)) return false;
    if (!getFruitSkillDef(type, skillId)) return false;
    const count = Math.max(1, Math.round(Number(times) || 1));
    let upgraded = false;
    for (let i = 0; i < count; i += 1) {
      upgraded = upgradeFruitFactionSkill(type, skillId) || upgraded;
    }
    updateHud();
    return upgraded;
  };
  window.__fruitUpgradeSkill = window.__fruitUpgradeFaction;
  window.__fruitResolveSpawnPlans = (baseType) => {
    if (!DEBUG_MODE || !FRUIT_FACTION_IDS.includes(baseType)) return [];
    return resolveFruitSpawnPlans(baseType).map((plan) => ({
      type: plan.type,
      factionType: plan.spawnMeta?.factionType ?? null,
      assimilated: Boolean(plan.spawnMeta?.assimilated),
      copyIndex: plan.spawnMeta?.copyIndex ?? 0,
      copyScoreScale: plan.spawnMeta?.copyScoreScale ?? 1,
    }));
  };
  window.__fruitAvailableTalents = () => {
    if (!DEBUG_MODE) return [];
    return getAvailableTalents().map((talent) => ({
      id: talent.id,
      tag: talent.tag,
      name: talent.name,
      skillId: talent.skillId,
      skillLabel: talent.skillLabel,
      level: getTalentCurrentLevel(talent),
      maxLevel: talent.maxLevel || null,
      fruitFaction: isFruitFactionTalent(talent),
    }));
  };
  window.__fruitUpgradePriority = () => {
    if (!DEBUG_MODE) return null;
    return getUpgradePriorityFactionType();
  };
  window.__fruitUpgradeChoices = () => {
    if (!DEBUG_MODE) return [];
    return getUpgradeChoices().map((talent) => ({
      id: talent.id,
      tag: talent.tag,
      skillId: talent.skillId,
      name: talent.name,
    }));
  };
  window.__fruitOpenUpgrade = (points = 1) => {
    if (!DEBUG_MODE) return false;
    if (!state.running) startRound({ skipTutorial: true });
    state.upgradePoints = Math.max(1, Math.round(Number(points) || 1));
    return openUpgradeSequence("Debug 升级", "水果技能树验证");
  };
  window.__fruitForceBoss = () => startDebugScenario("boss-warning");
  window.__fruitForceFrenzy = () => startDebugScenario("frenzy-100");

  if (DEBUG_MODE) {
    ui.debugPanel.classList.remove("hidden");
    ui.debugPanel.setAttribute("aria-hidden", "false");
    ui.debugPanel.querySelectorAll("[data-scenario]").forEach((button) => {
      button.addEventListener("click", () => startDebugScenario(button.dataset.scenario));
    });
    renderDebugPanel();
  }
}

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
  const result = await platform.clipboard.writeText(buildChallengeText());
  ui.copyButton.textContent = result.ok ? "文案已复制" : "复制失败";
  window.setTimeout(() => {
    ui.copyButton.textContent = "复制挑战文案";
  }, 1200);
});
ui.downloadCardButton.addEventListener("click", downloadChallengeCard);
ui.settingsButton.addEventListener("click", openSettings);
ui.closeSettingsButton.addEventListener("click", closeSettings);
ui.soundToggle.addEventListener("change", () => {
  settings.sound = ui.soundToggle.checked;
  saveSettings();
  if (settings.sound) {
    unlockAudio();
    playSound("start");
  }
});
ui.hapticToggle.addEventListener("change", () => {
  settings.haptics = ui.hapticToggle.checked;
  saveSettings();
  if (settings.haptics) platform.haptics.light();
});
ui.batteryToggle.addEventListener("change", () => {
  settings.batterySaver = ui.batteryToggle.checked;
  saveSettings();
  applyPerformancePreference();
});
ui.replayTutorialButton.addEventListener("click", () => {
  closeSettings();
  showTutorial(null, true);
});
ui.clearRecordsButton.addEventListener("click", () => {
  platform.storage.remove(STORAGE_KEYS.bestScore);
  platform.storage.remove(STORAGE_KEYS.bestStage);
  state.bestScore = 0;
  state.bestStage = 1;
  updateStartRecords();
  ui.clearRecordsButton.textContent = "已清空";
  window.setTimeout(() => {
    ui.clearRecordsButton.textContent = "清空记录";
  }, 1200);
});
ui.tutorialNextButton.addEventListener("click", () => {
  if (tutorial.index < TUTORIAL_STEPS.length - 1) {
    tutorial.index += 1;
    renderTutorial();
  } else {
    closeTutorial(true);
  }
});
ui.tutorialSkipButton.addEventListener("click", () => closeTutorial(true));
ui.pauseButton.addEventListener("click", () => setPaused(true, "manual"));
ui.resumeButton.addEventListener("click", () => setPaused(false));
ui.restartButton.addEventListener("click", () => startRound({ skipTutorial: true }));
ui.homeButton.addEventListener("click", goHome);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" || event.key.toLowerCase() === "p") {
    if (state.running && !state.over) setPaused(!state.paused, "manual");
  }
});

platform.lifecycle.onHide(() => setPaused(true, "lifecycle"));

window.addEventListener("resize", resize);

resize();
buildWorld();
syncSettingsUi();
updateStartRecords();
updateHud();
installDebugApi();
loadGameAssets().then(maybeAutoStartDebugScenario);
animate();
