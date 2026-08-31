const pool = require('./pool');

// DB eilutė (snake_case) <-> kliento hero objektas (camelCase, tiksliai tokie patys laukų
// pavadinimai, kokius naudoja hero-sandbox.html, kad kliento kodas keistųsi kuo mažiau).
function rowToHero(row) {
  if (!row) return null;
  return {
    name: row.name,
    bodyColor: row.body_color,
    accentColor: row.accent_color,
    x: Number(row.x),
    y: Number(row.y),
    hp: Number(row.hp),
    maxHp: Number(row.max_hp),
    hunger: Number(row.hunger),
    thirst: Number(row.thirst),
    xp: row.xp,
    level: row.level,
    kills: row.kills,
    wood: row.wood,
    matches: row.matches,
    coins: row.coins,
    meat: row.meat,
    chocolate: row.chocolate,
    bandage: row.bandage,
    medicine: row.medicine,
    gira: row.gira,
    arrows: row.arrows,
    fish: row.fish,
    collectedPickups: row.collected_pickups,
    weapon: row.weapon,
    ownedWeapons: row.owned_weapons,
    weaponCounts: row.weapon_counts,
    helmetCount: row.helmet_count,
    helmetOn: row.helmet_on,
    questAccepted: row.quest_accepted,
    questChopped: row.quest_chopped,
    questClaimed: row.quest_claimed,
    aliveSince: row.alive_since,
  };
}

async function getHeroByUserId(userId) {
  const { rows } = await pool.query('SELECT * FROM heroes WHERE user_id = $1', [userId]);
  return rowToHero(rows[0]);
}

async function createDefaultHero(userId, name, bodyColor, accentColor) {
  const { rows } = await pool.query(
    `INSERT INTO heroes (user_id, name, body_color, accent_color)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, name, bodyColor || '#4a6fa5', accentColor || '#e6a13c']
  );
  return rowToHero(rows[0]);
}

// Pilnas herojaus būsenos išsaugojimas (autosave) - klientas siunčia visą hero objektą periodiškai,
// panašiai kaip anksčiau rašė į localStorage. Laukai, kurių nėra `patch`, nekeičiami (COALESCE).
async function saveHero(userId, patch) {
  const { rows } = await pool.query(
    `UPDATE heroes SET
      x = COALESCE($2, x), y = COALESCE($3, y),
      hp = COALESCE($4, hp), max_hp = COALESCE($5, max_hp),
      hunger = COALESCE($6, hunger), thirst = COALESCE($7, thirst),
      xp = COALESCE($8, xp), level = COALESCE($9, level), kills = COALESCE($10, kills),
      wood = COALESCE($11, wood), matches = COALESCE($12, matches), coins = COALESCE($13, coins),
      meat = COALESCE($14, meat), chocolate = COALESCE($15, chocolate),
      bandage = COALESCE($16, bandage), medicine = COALESCE($17, medicine), gira = COALESCE($18, gira),
      arrows = COALESCE($19, arrows), fish = COALESCE($20, fish),
      collected_pickups = COALESCE($30, collected_pickups),
      weapon = COALESCE($21, weapon),
      owned_weapons = COALESCE($22, owned_weapons), weapon_counts = COALESCE($23, weapon_counts),
      helmet_count = COALESCE($24, helmet_count), helmet_on = COALESCE($25, helmet_on),
      quest_accepted = COALESCE($26, quest_accepted), quest_chopped = COALESCE($27, quest_chopped),
      quest_claimed = COALESCE($28, quest_claimed),
      alive_since = COALESCE($29, alive_since),
      updated_at = now()
     WHERE user_id = $1
     RETURNING *`,
    [
      userId,
      patch.x, patch.y,
      patch.hp, patch.maxHp,
      patch.hunger, patch.thirst,
      patch.xp, patch.level, patch.kills,
      patch.wood, patch.matches, patch.coins,
      patch.meat, patch.chocolate,
      patch.bandage, patch.medicine, patch.gira,
      patch.arrows, patch.fish,
      patch.weapon,
      patch.ownedWeapons != null ? JSON.stringify(patch.ownedWeapons) : null,
      patch.weaponCounts != null ? JSON.stringify(patch.weaponCounts) : null,
      patch.helmetCount, patch.helmetOn,
      patch.questAccepted, patch.questChopped,
      patch.questClaimed,
      patch.aliveSince,
      patch.collectedPickups != null ? JSON.stringify(patch.collectedPickups) : null,
    ]
  );
  return rowToHero(rows[0]);
}

module.exports = { getHeroByUserId, createDefaultHero, saveHero, rowToHero };
