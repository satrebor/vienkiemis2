const pool = require('./pool');

async function findUserByUsername(username) {
  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return rows[0] || null;
}

async function findUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

async function createUser(username, passwordHash) {
  const { rows } = await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
    [username, passwordHash]
  );
  return rows[0];
}

async function listUsers() {
  const { rows } = await pool.query(
    'SELECT id, username, is_admin, blocked, created_at FROM users ORDER BY created_at DESC'
  );
  return rows;
}

async function setBlocked(userId, blocked) {
  await pool.query('UPDATE users SET blocked = $1 WHERE id = $2', [blocked, userId]);
}

async function deleteUser(userId) {
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
}

module.exports = { findUserByUsername, findUserById, createUser, listUsers, setBlocked, deleteUser };
