const express = require('express');
const users = require('../db/users');
const heroes = require('../db/heroes');
const mapOverrides = require('../db/mapOverrides');
const terrain = require('./terrain');
const { requireAuth, requireAdmin } = require('./auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/users', async (req, res) => {
  const list = await users.listUsers();
  res.json({ users: list });
});

// Vieno konkretaus žaidėjo herojaus detalė - naudojama admin panelės nario išsamios peržiūros
// lange (žr. AdminScreen klientas). Grąžina 404, jei paskyra yra be herojaus (pvz. admin pati).
router.get('/users/:id/hero', async (req, res) => {
  const user = await users.findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Vartotojas nerastas.' });
  const hero = await heroes.getHeroByUserId(req.params.id);
  if (!hero) return res.status(404).json({ error: 'Šis vartotojas neturi herojaus.' });
  res.json({ user: { id: user.id, username: user.username, isAdmin: user.is_admin, blocked: user.blocked }, hero });
});

router.post('/users/:id/block', async (req, res) => {
  await users.setBlocked(req.params.id, !!(req.body && req.body.blocked));
  res.json({ ok: true });
});

router.delete('/users/:id', async (req, res) => {
  await users.deleteUser(req.params.id);
  res.json({ ok: true });
});

router.put('/map-overrides', async (req, res) => {
  const saved = await mapOverrides.saveMapOverrides(req.body || {});
  terrain.applyOverrides(saved);
  const io = req.app.get('io');
  if (io) io.to('world').emit('mapOverrides:updated', saved);
  res.json({ overrides: saved });
});

module.exports = router;
