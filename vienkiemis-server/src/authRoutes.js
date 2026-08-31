const express = require('express');
const users = require('../db/users');
const heroes = require('../db/heroes');
const { signToken, hashPassword, comparePassword, requireAuth } = require('./auth');

const router = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_ąčęėįšųūžĄČĘĖĮŠŲŪŽ-]{3,20}$/;

router.post('/register', async (req, res) => {
  const { username, password, bodyColor, accentColor } = req.body || {};
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Vartotojo vardas turi būti 3-20 simbolių (raidės, skaičiai, _ arba -).' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Slaptažodis turi būti bent 6 simbolių.' });
  }
  const existing = await users.findUserByUsername(username);
  if (existing) return res.status(409).json({ error: 'Toks vartotojo vardas jau užimtas.' });

  const passwordHash = await hashPassword(password);
  const user = await users.createUser(username, passwordHash);
  const hero = await heroes.createDefaultHero(user.id, username, bodyColor, accentColor);
  const token = signToken(user);
  res.json({ token, username: user.username, isAdmin: user.is_admin, hero });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Trūksta vartotojo vardo arba slaptažodžio.' });
  }
  const user = await users.findUserByUsername(username);
  if (!user) return res.status(401).json({ error: 'Neteisingas vartotojo vardas arba slaptažodis.' });
  if (user.blocked) return res.status(403).json({ error: 'Ši paskyra užblokuota administratoriaus.' });
  const ok = await comparePassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Neteisingas vartotojo vardas arba slaptažodis.' });

  const hero = await heroes.getHeroByUserId(user.id);
  const token = signToken(user);
  res.json({ token, username: user.username, isAdmin: user.is_admin, hero });
});

router.get('/hero', requireAuth, async (req, res) => {
  const hero = await heroes.getHeroByUserId(req.auth.sub);
  if (!hero) return res.status(404).json({ error: 'Herojus nerastas.' });
  res.json({ hero });
});

router.put('/hero', requireAuth, async (req, res) => {
  const hero = await heroes.saveHero(req.auth.sub, req.body || {});
  res.json({ hero });
});

module.exports = router;
