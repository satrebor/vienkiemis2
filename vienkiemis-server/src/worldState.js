// Serverio AUTORITETINGA bendro pasaulio būsena - žaidėjų buvimas (presence), zombiai/kritteriai/
// bosas, grobio kritiniai (loot drops) ir laužai. Viskas laikoma atmintyje (vienas procesas) ir
// tikama (ticked) periodiškai - žr. tick() žemiau, kviečiamą iš gameServer.js setInterval.
const C = require('./gameConstants');

let zombieIdSeq = 1;
let lootIdSeq = 1;

const state = {
  players: new Map(), // socketId -> player presence object
  zombies: [], // shared world (outdoor) monstrai - interjerai (butų viduje) LIEKA kliento pusėje
  lootDrops: [],
  campfires: [],
  lastZombieSpawnAt: 0,
  lastBossSpawnAt: 0,
  lastCritterSpawnAt: 0,
  lastWorldLootSpawnAt: 0,
};

function nearestPlayerTo(x, y) {
  let best = null, bestDist = Infinity;
  for (const p of state.players.values()) {
    if (p.hp <= 0) continue; // mirę žaidėjai netraukia priešų dėmesio
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best ? { player: best, dist: bestDist } : null;
}

function spawnZombiesAndLoot(ts) {
  const safe = C.getSafeZone();

  if (state.zombies.filter((z) => !z.passive).length < C.ZOMBIE_MAX && ts - state.lastZombieSpawnAt > C.ZOMBIE_SPAWN_EVERY) {
    state.lastZombieSpawnAt = ts;
    if (Math.random() < C.ZOMBIE_SPAWN_CHANCE && state.players.size > 0) {
      for (let tries = 0; tries < 20; tries++) {
        const zx = Math.random() * C.WORLD_SIZE, zy = Math.random() * C.WORLD_SIZE;
        const tt = C.tileType(Math.round(zx), Math.round(zy));
        if (tt === 'grass' || tt === 'water' || tt === 'town') continue;
        if (Math.hypot(zx - safe.x, zy - safe.y) < safe.radius + 2) continue;
        const nearest = nearestPlayerTo(zx, zy);
        if (!nearest || nearest.dist < 7 || nearest.dist > 32) continue;
        const homeDist = Math.hypot(zx - safe.x, zy - safe.y);
        const distFrac = Math.max(0, Math.min(1, (homeDist - C.ENEMY_NEAR_DIST) / (C.DANGER_START - C.ENEMY_NEAR_DIST)));
        let type;
        if (homeDist >= C.DANGER_START) {
          type = Math.random() < C.DANGER_ZOMBIE_RED_CHANCE ? 'zombieRed' : 'zombie';
        } else {
          const zombieChance = 0.15 + distFrac * 0.45;
          type = Math.random() < zombieChance ? 'zombie' : 'dog';
        }
        const base = C.ENEMY_TYPES[type];
        const strength = type === 'zombie' ? 1 + distFrac * (C.ZOMBIE_STRENGTH_MAX - 1) : 1;
        const hp = Math.round(base.hp * strength);
        state.zombies.push({
          id: zombieIdSeq++, type, x: zx, y: zy, hp, maxHp: hp,
          dmg: Math.round(base.dmg * strength), speed: base.speed, contactRadius: base.contactRadius,
          atkCd: base.atkCd, aggro: base.aggro, xpReward: base.xp, scale: base.scale,
          facing: 'down', phase: Math.random() * 6, idlePhase: 0,
          lastAttackAt: 0, wanderAngle: Math.random() * Math.PI * 2, wanderAt: ts, hitFlashAt: 0,
        });
        break;
      }
    }
  }

  if (ts - state.lastBossSpawnAt > C.BOSS_SPAWN_EVERY) {
    state.lastBossSpawnAt = ts;
    const bossAlive = state.zombies.some((z) => z.type === 'boss');
    if (!bossAlive && Math.random() < C.BOSS_SPAWN_CHANCE && state.players.size > 0) {
      for (let tries = 0; tries < 20; tries++) {
        const bx = Math.random() * C.WORLD_SIZE, by = Math.random() * C.WORLD_SIZE;
        const tt = C.tileType(Math.round(bx), Math.round(by));
        if (tt === 'water' || tt === 'town') continue;
        const homeDist = Math.hypot(bx - safe.x, by - safe.y);
        if (homeDist < C.BOSS_MIN_DIST) continue;
        const base = C.ENEMY_TYPES.boss;
        state.zombies.push({
          id: zombieIdSeq++, type: 'boss', x: bx, y: by, hp: base.hp, maxHp: base.hp,
          dmg: base.dmg, speed: base.speed, contactRadius: base.contactRadius,
          atkCd: base.atkCd, aggro: base.aggro, xpReward: base.xp, scale: base.scale,
          facing: 'down', phase: Math.random() * 6, idlePhase: 0,
          lastAttackAt: 0, wanderAngle: Math.random() * Math.PI * 2, wanderAt: ts, hitFlashAt: 0,
        });
        break;
      }
    }
  }

  if (state.zombies.filter((z) => z.passive).length < C.CRITTER_MAX && ts - state.lastCritterSpawnAt > C.CRITTER_SPAWN_EVERY) {
    state.lastCritterSpawnAt = ts;
    if (Math.random() < C.CRITTER_SPAWN_CHANCE) {
      const type = Math.random() < 0.65 ? 'chicken' : 'moose';
      for (let tries = 0; tries < 20; tries++) {
        const cx = Math.random() * C.WORLD_SIZE, cy = Math.random() * C.WORLD_SIZE;
        const tt = C.tileType(Math.round(cx), Math.round(cy));
        if (tt !== 'grass' && tt !== 'forest') continue;
        const homeDist = Math.hypot(cx - safe.x, cy - safe.y);
        if (homeDist < safe.radius + 1 || homeDist >= C.DANGER_START) continue;
        const base = C.ENEMY_TYPES[type];
        state.zombies.push({
          id: zombieIdSeq++, type, x: cx, y: cy, hp: base.hp, maxHp: base.hp,
          dmg: base.dmg, speed: base.speed, contactRadius: base.contactRadius,
          atkCd: base.atkCd, aggro: base.aggro, xpReward: base.xp, scale: base.scale,
          passive: base.passive, fleeRadius: base.fleeRadius, fleeSpeed: base.fleeSpeed, spooked: false,
          facing: 'down', phase: Math.random() * 6, idlePhase: 0,
          lastAttackAt: 0, wanderAngle: Math.random() * Math.PI * 2, wanderAt: ts, hitFlashAt: 0,
        });
        break;
      }
    }
  }

  if (ts - state.lastWorldLootSpawnAt > C.WORLD_LOOT_SPAWN_EVERY) {
    state.lastWorldLootSpawnAt = ts;
    if (Math.random() < C.WORLD_LOOT_SPAWN_CHANCE) {
      const item = C.SHOP_ITEMS[Math.floor(Math.random() * C.SHOP_ITEMS.length)];
      const already = state.lootDrops.filter((l) => l.source === 'world' && l.type === item.type).length;
      if (already < C.WORLD_LOOT_MAX_PER_TYPE) {
        for (let tries = 0; tries < 20; tries++) {
          const wx = Math.random() * C.WORLD_SIZE, wy = Math.random() * C.WORLD_SIZE;
          if (C.tileType(Math.round(wx), Math.round(wy)) === 'water') continue;
          state.lootDrops.push({ id: 'wloot' + (lootIdSeq++), type: item.type, amount: C.worldLootAmountFor(item.type), x: wx, y: wy, createdAt: ts, source: 'world' });
          break;
        }
      }
    }
  }

  state.lootDrops = state.lootDrops.filter((l) => ts - l.createdAt < C.LOOT_LIFETIME_MS);
  state.campfires = state.campfires.filter((f) => ts - f.createdAt < C.FIRE_LIFETIME_MS);
}

// Grąžina žaidėjus, kuriems ką tik buvo pritaikyta žala (kad gameServer.js žinotų, kam
// individualiai persiųsti atnaujintą HP).
function tickZombies(ts, dtSec) {
  const safe = C.getSafeZone();
  const hurtPlayers = [];
  const boundLo = 0, boundHi = C.WORLD_SIZE;

  for (const z of state.zombies) {
    const nearestInfo = nearestPlayerTo(z.x, z.y);
    const dist = nearestInfo ? nearestInfo.dist : Infinity;
    const dx = nearestInfo ? nearestInfo.player.x - z.x : 0;
    const dy = nearestInfo ? nearestInfo.player.y - z.y : 0;
    const zAggro = z.aggro || 9, zSpeed = z.speed || 2, zContact = z.contactRadius || 1.05;
    const zAtkCd = z.atkCd || 1150, zDmg = z.dmg || 6;
    let mvx = 0, mvy = 0;

    if (z.passive) {
      if (!z.spooked && z.fleeRadius && dist < z.fleeRadius) z.spooked = true;
      if (z.spooked) {
        if (ts - z.wanderAt > 750) {
          const awayAngle = Math.atan2(-dy, -dx);
          z.wanderAngle = awayAngle + (Math.random() - 0.5) * Math.PI * 0.7;
          z.wanderAt = ts;
        }
        mvx = Math.cos(z.wanderAngle); mvy = Math.sin(z.wanderAngle);
      } else {
        if (ts - z.wanderAt > 2200) { z.wanderAngle = Math.random() * Math.PI * 2; z.wanderAt = ts; }
        mvx = Math.cos(z.wanderAngle) * 0.4; mvy = Math.sin(z.wanderAngle) * 0.4;
      }
    } else if (dist < zAggro) {
      mvx = dx / (dist || 1); mvy = dy / (dist || 1);
    } else {
      if (ts - z.wanderAt > 2200) { z.wanderAngle = Math.random() * Math.PI * 2; z.wanderAt = ts; }
      mvx = Math.cos(z.wanderAngle) * 0.4; mvy = Math.sin(z.wanderAngle) * 0.4;
    }

    const moving = Math.hypot(mvx, mvy) > 0.05;
    const effSpeed = z.passive && z.spooked ? (z.fleeSpeed || zSpeed) : zSpeed;
    if (moving && (z.passive || dist > zContact * 0.8)) {
      z.x = Math.max(boundLo, Math.min(boundHi, z.x + mvx * effSpeed * dtSec));
      z.y = Math.max(boundLo, Math.min(boundHi, z.y + mvy * effSpeed * dtSec));
      z.facing = mvx < -0.1 ? 'left' : mvx > 0.1 ? 'right' : z.facing;
      z.phase += dtSec * 7;
    } else {
      z.idlePhase += dtSec * 2;
    }

    if (z.passive) continue;

    for (const f of state.campfires) {
      const fdx = z.x - f.x, fdy = z.y - f.y;
      const fdist = Math.hypot(fdx, fdy);
      if (fdist < C.FIRE_REPEL_RADIUS && fdist > 0.0001) {
        const push = C.FIRE_REPEL_RADIUS / fdist;
        z.x = f.x + fdx * push;
        z.y = f.y + fdy * push;
      }
    }

    {
      const zdx = z.x - safe.x, zdy = z.y - safe.y;
      const zdist = Math.hypot(zdx, zdy);
      if (zdist < safe.radius && zdist > 0.0001) {
        const push = safe.radius / zdist;
        z.x = safe.x + zdx * push;
        z.y = safe.y + zdy * push;
      }
    }

    if (nearestInfo && dist < zContact && ts - z.lastAttackAt > zAtkCd) {
      z.lastAttackAt = ts;
      const target = nearestInfo.player;
      const dealt = target.helmetOn ? zDmg * (1 - C.HELMET_DMG_REDUCTION) : zDmg;
      target.hp = Math.max(0, target.hp - dealt);
      hurtPlayers.push({ player: target, dealt });
    }
  }

  return hurtPlayers;
}

function tick(dtSec) {
  const ts = Date.now();
  spawnZombiesAndLoot(ts);
  return tickZombies(ts, dtSec);
}

// ---- Kovos rezoliucija (kviečiama iš gameServer.js gavus 'player:attack' įvykį) ----
function resolveAttack(player, targetId, weaponKey, ranged) {
  const zombie = state.zombies.find((z) => z.id === targetId);
  if (!zombie) return { ok: false, reason: 'not-found' };
  const range = ranged ? C.RANGED_ATTACK_RANGE : C.ATTACK_RANGE;
  const dist = Math.hypot(zombie.x - player.x, zombie.y - player.y);
  if (dist > range + 0.75) return { ok: false, reason: 'out-of-range' }; // truputis tolerancijos tinklo vėlavimui
  const weapon = C.WEAPONS[weaponKey] || C.WEAPONS.fists;
  const now = Date.now();
  if (now - (player.lastAttackAt || 0) < weapon.cooldown - 40) return { ok: false, reason: 'cooldown' };
  player.lastAttackAt = now;

  zombie.hp -= weapon.dmg;
  zombie.hitFlashAt = now;
  if (zombie.passive) zombie.spooked = true;

  const result = { ok: true, zombieId: zombie.id, hp: zombie.hp, dmg: weapon.dmg, died: false };
  if (zombie.hp <= 0) {
    state.zombies = state.zombies.filter((z) => z.id !== zombie.id);
    result.died = true;
    result.xpReward = zombie.xpReward || C.KILL_XP;
    result.loot = generateLootFor(zombie, now);
  }
  return result;
}

function generateLootFor(zombie, ts) {
  const drops = [];
  if (zombie.type === 'boss') {
    const bossCoins = 30 + Math.floor(Math.random() * 31);
    drops.push({ type: 'coins', amount: bossCoins });
    const extraDrops = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < extraDrops; i++) {
      const t = C.LOOT_TYPES[Math.floor(Math.random() * C.LOOT_TYPES.length)];
      drops.push({ type: t, amount: t === 'coins' ? 10 + Math.floor(Math.random() * 16) : C.worldLootAmountFor(t) });
    }
  } else if (zombie.type === 'chicken' || zombie.type === 'moose') {
    const meatAmount = zombie.type === 'chicken' ? 1 : 2 + Math.floor(Math.random() * 3);
    drops.push({ type: 'meat', amount: meatAmount });
  } else {
    const t = C.LOOT_TYPES[Math.floor(Math.random() * C.LOOT_TYPES.length)];
    drops.push({ type: t, amount: t === 'coins' ? 5 + Math.floor(Math.random() * 11) : C.worldLootAmountFor(t) });
  }
  const source = zombie.type === 'boss' ? 'boss' : (zombie.type === 'chicken' || zombie.type === 'moose') ? 'critter' : 'zombie';
  const placed = drops.map((d) => ({
    id: 'loot' + (lootIdSeq++), type: d.type, amount: d.amount,
    x: zombie.x, y: zombie.y, createdAt: ts, source,
  }));
  state.lootDrops.push(...placed);
  return placed;
}

function collectLoot(player, lootId) {
  const idx = state.lootDrops.findIndex((l) => l.id === lootId);
  if (idx === -1) return null;
  const loot = state.lootDrops[idx];
  if (Math.hypot(loot.x - player.x, loot.y - player.y) > C.LOOT_COLLECT_RADIUS + 1.2) return null;
  state.lootDrops.splice(idx, 1);
  return loot;
}

function placeCampfire(x, y, ts) {
  const fire = { id: 'fire' + (lootIdSeq++), x, y, createdAt: ts };
  state.campfires.push(fire);
  return fire;
}

module.exports = { state, tick, resolveAttack, collectLoot, placeCampfire, nearestPlayerTo };
