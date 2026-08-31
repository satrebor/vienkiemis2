const pool = require('./pool');

function rowToOverrides(row) {
  if (!row) return { npcPos: null, npc2Pos: null, hutPositions: null, forcedTrees: [], forcedClear: [] };
  return {
    npcPos: row.npc_pos,
    npc2Pos: row.npc2_pos,
    hutPositions: row.hut_positions,
    forcedTrees: row.forced_trees,
    forcedClear: row.forced_clear,
  };
}

async function getMapOverrides() {
  const { rows } = await pool.query('SELECT * FROM map_overrides WHERE id = 1');
  return rowToOverrides(rows[0]);
}

async function saveMapOverrides(overrides) {
  const { rows } = await pool.query(
    `INSERT INTO map_overrides (id, npc_pos, npc2_pos, hut_positions, forced_trees, forced_clear)
     VALUES (1, $1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       npc_pos = EXCLUDED.npc_pos, npc2_pos = EXCLUDED.npc2_pos,
       hut_positions = EXCLUDED.hut_positions,
       forced_trees = EXCLUDED.forced_trees, forced_clear = EXCLUDED.forced_clear,
       updated_at = now()
     RETURNING *`,
    [
      JSON.stringify(overrides.npcPos || null),
      JSON.stringify(overrides.npc2Pos || null),
      JSON.stringify(overrides.hutPositions || null),
      JSON.stringify(overrides.forcedTrees || []),
      JSON.stringify(overrides.forcedClear || []),
    ]
  );
  return rowToOverrides(rows[0]);
}

module.exports = { getMapOverrides, saveMapOverrides };
