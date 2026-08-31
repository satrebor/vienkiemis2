// Žaidimo balanso konstantos - PORTAS iš kliento hero-sandbox.html. Serveris dabar yra
// AUTORITETINGAS lauko (world) scenos zombiams/kritteriams/bosui/grobiui/kovai, tad šios
// reikšmės turi likti identiškos klientui, kad žaidimas "jaustųsi" taip pat, tik dabar bendras.
const { WORLD_SIZE, DANGER_START, FOREST_FULL_AT, getSafeZone, tileType } = require('./terrain');

const WEAPONS = {
  fists: { label: 'Kumščiai', dmg: 8, cooldown: 620 },
  knife: { label: 'Peilis', dmg: 18, cooldown: 440 },
  axe: { label: 'Kirvis', dmg: 30, cooldown: 560 },
  bow: { label: 'Lankas', dmg: 14, cooldown: 500 },
  fishingRod: { label: 'Meškerė', dmg: 3, cooldown: 700 },
};
const ATTACK_RANGE = 1.55;
const RANGED_ATTACK_RANGE = 9;
const HELMET_DMG_REDUCTION = 0.35;
const KILL_XP = 20;

const ZOMBIE_MAX = 16;
const ZOMBIE_SPAWN_EVERY = 4500;
const ZOMBIE_SPAWN_CHANCE = 0.65;
const ENEMY_NEAR_DIST = 15;
const ZOMBIE_STRENGTH_MAX = 1.9;
const DANGER_ZOMBIE_RED_CHANCE = 0.85;

const BOSS_SPAWN_EVERY = 65000;
const BOSS_SPAWN_CHANCE = 0.4;
const BOSS_MIN_DIST = DANGER_START;

const CRITTER_MAX = 10;
const CRITTER_SPAWN_EVERY = 8000;
const CRITTER_SPAWN_CHANCE = 0.5;

const WORLD_LOOT_SPAWN_EVERY = 7000;
const WORLD_LOOT_SPAWN_CHANCE = 0.55;
const WORLD_LOOT_MAX_PER_TYPE = 3;
const LOOT_COLLECT_RADIUS = 0.55;
const LOOT_LIFETIME_MS = 90000;

const FIRE_REPEL_RADIUS = 3.2;
const FIRE_LIFETIME_MS = 60000;

const LOOT_TYPES = ['knife', 'matches', 'axe', 'coins', 'helmet', 'meat', 'chocolate', 'bandage', 'medicine', 'gira', 'bow', 'arrows', 'fishingRod'];
const SHOP_ITEMS = [
  { type: 'matches' }, { type: 'meat' }, { type: 'chocolate' }, { type: 'bandage' },
  { type: 'medicine' }, { type: 'gira' }, { type: 'knife' }, { type: 'axe' },
  { type: 'helmet' }, { type: 'bow' }, { type: 'arrows' }, { type: 'fishingRod' },
];

const ENEMY_TYPES = {
  dog: { hp: 16, dmg: 4, speed: 2.7, contactRadius: 0.8, atkCd: 900, aggro: 10, xp: 10, scale: 0.62 },
  zombie: { hp: 30, dmg: 6, speed: 2.0, contactRadius: 1.05, atkCd: 1150, aggro: 9, xp: 20, scale: 1 },
  zombieRed: { hp: 55, dmg: 11, speed: 2.15, contactRadius: 1.1, atkCd: 1000, aggro: 10, xp: 35, scale: 1.05 },
  boss: { hp: 240, dmg: 15, speed: 1.25, contactRadius: 1.7, atkCd: 1500, aggro: 11, xp: 120, scale: 1.9 },
  chicken: { hp: 34, dmg: 0, speed: 1.4, contactRadius: 0.5, atkCd: 999999, aggro: 0, xp: 3, scale: 0.55, passive: true, fleeSpeed: 3.2, fleeRadius: 0 },
  moose: { hp: 45, dmg: 0, speed: 1.7, contactRadius: 1.3, atkCd: 999999, aggro: 0, xp: 18, scale: 1.7, passive: true, fleeSpeed: 3.1, fleeRadius: 6 },
};

function worldLootAmountFor(type) { return type === 'arrows' ? 3 + Math.floor(Math.random() * 4) : 1; }

module.exports = {
  WEAPONS, ATTACK_RANGE, RANGED_ATTACK_RANGE, HELMET_DMG_REDUCTION, KILL_XP,
  ZOMBIE_MAX, ZOMBIE_SPAWN_EVERY, ZOMBIE_SPAWN_CHANCE, ENEMY_NEAR_DIST, ZOMBIE_STRENGTH_MAX, DANGER_ZOMBIE_RED_CHANCE,
  BOSS_SPAWN_EVERY, BOSS_SPAWN_CHANCE, BOSS_MIN_DIST,
  CRITTER_MAX, CRITTER_SPAWN_EVERY, CRITTER_SPAWN_CHANCE,
  WORLD_LOOT_SPAWN_EVERY, WORLD_LOOT_SPAWN_CHANCE, WORLD_LOOT_MAX_PER_TYPE, LOOT_COLLECT_RADIUS, LOOT_LIFETIME_MS,
  FIRE_REPEL_RADIUS, FIRE_LIFETIME_MS,
  LOOT_TYPES, SHOP_ITEMS, ENEMY_TYPES, worldLootAmountFor,
  WORLD_SIZE, DANGER_START, FOREST_FULL_AT, getSafeZone, tileType,
};
