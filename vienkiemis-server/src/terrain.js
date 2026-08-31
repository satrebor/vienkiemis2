// Serverio pusės žemėlapio funkcijos - TIKSLUS PORTAS iš kliento hero-sandbox.html
// naturalTileType/tileType/hash2 (formulės turi likti identiškos, kad serverio sprendimai apie
// tai, kur negalima spawninti zombių/grobio (vanduo/miestelis), sutaptų su tuo, ką klientas
// piešia - hash2 yra deterministinis, tad abi pusės su tais pačiais konstantais visada sutars
// dėl to paties tipo tam pačiam langeliui).

const WORLD_SIZE = 90;
const HOME_POS = { x: 45, y: 45 };
const POND = { x0: 41, y0: 49, x1: 44, y1: 51 };
const LAKE = { x0: 36, y0: 16, x1: 55, y1: 25 };

const DEFAULT_NPC_POS = { x: 49, y: 47 };
const DEFAULT_NPC2_POS = { x: 39, y: 39 };
const DEFAULT_HUT_POSITIONS = [{ x: 48, y: 43 }, { x: 52, y: 49 }];

const VILLAGE_HUTS = [
  { x: 49, y: 32 }, { x: 52, y: 32 },
  { x: 60, y: 57 }, { x: 63, y: 59 },
  { x: 34, y: 44 }, { x: 32, y: 44 },
];
const CHURCH_POS = { x: 64, y: 44 };
const APARTMENT_POSITIONS = [
  { x: 69, y: 47 },
  { x: 42, y: 38 },
  { x: 49, y: 59 },
];

const FOREST_MIN_DENSITY = 0.08;
const FOREST_MAX_DENSITY = 0.4;
const FOREST_FULL_AT = 22;
const DANGER_START = 36;

function inPond(x, y) { return x >= POND.x0 && x <= POND.x1 && y >= POND.y0 && y <= POND.y1; }
function inLake(x, y) { return x >= LAKE.x0 && x <= LAKE.x1 && y >= LAKE.y0 && y <= LAKE.y1; }

function hash2(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 4294967295;
}

// Mutuojama gyvai per admin panelę (žr. adminRoutes.js) - kol serveris veikia, laikoma
// atmintyje ir DB (map_overrides lentelė), kad naujas serverio startas (deploy) nepamestų
// nustatymų. Kadangi pasaulis dabar vienas bendras, šie override'ai galioja VISIEMS žaidėjams.
const liveOverrides = {
  npcPos: DEFAULT_NPC_POS,
  npc2Pos: DEFAULT_NPC2_POS,
  hutPositions: DEFAULT_HUT_POSITIONS,
  forcedTrees: new Set(),
  forcedClear: new Set(),
};

function applyOverrides(overrides) {
  if (overrides.npcPos) liveOverrides.npcPos = overrides.npcPos;
  if (overrides.npc2Pos) liveOverrides.npc2Pos = overrides.npc2Pos;
  if (overrides.hutPositions) liveOverrides.hutPositions = overrides.hutPositions;
  liveOverrides.forcedTrees = new Set(overrides.forcedTrees || []);
  liveOverrides.forcedClear = new Set(overrides.forcedClear || []);
}

function getSafeZone() {
  return { x: liveOverrides.npcPos.x, y: liveOverrides.npcPos.y, radius: 7 };
}

function naturalTileType(x, y) {
  if (inPond(x, y)) return 'water';
  if (inLake(x, y)) return 'water';
  const safe = getSafeZone();
  const homeDist = Math.hypot(x - safe.x, y - safe.y);
  if (homeDist < safe.radius) return 'town';
  if (homeDist >= DANGER_START) return 'danger';
  const clearingFrac = Math.max(0, Math.min(1, (homeDist - safe.radius) / (FOREST_FULL_AT - safe.radius)));
  const forestChance = FOREST_MIN_DENSITY + clearingFrac * (FOREST_MAX_DENSITY - FOREST_MIN_DENSITY);
  return hash2(x * 7 + 1, y * 13 + 3) > 0.5 * (1 - forestChance) ? 'forest' : 'grass';
}

function tileType(x, y) {
  const natural = naturalTileType(x, y);
  if (natural !== 'grass' && natural !== 'forest') return natural;
  const key = x + ',' + y;
  if (liveOverrides.forcedClear.has(key)) return 'grass';
  if (liveOverrides.forcedTrees.has(key)) return 'forest';
  return natural;
}

module.exports = {
  WORLD_SIZE, HOME_POS, POND, LAKE,
  DEFAULT_NPC_POS, DEFAULT_NPC2_POS, DEFAULT_HUT_POSITIONS,
  VILLAGE_HUTS, CHURCH_POS, APARTMENT_POSITIONS,
  FOREST_FULL_AT, DANGER_START,
  hash2, inPond, inLake, naturalTileType, tileType,
  liveOverrides, applyOverrides, getSafeZone,
};
