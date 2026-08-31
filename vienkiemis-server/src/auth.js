const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET nenustatytas - žr. .env.example');
}

function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username, isAdmin: user.is_admin }, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Express middleware - reikalauja "Authorization: Bearer <token>" antraštės.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Reikia prisijungti.' });
  try {
    req.auth = verifyToken(token);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Neteisingas arba pasibaigęs prisijungimo raktas.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.auth || !req.auth.isAdmin) return res.status(403).json({ error: 'Reikia administratoriaus teisių.' });
  next();
}

module.exports = { signToken, verifyToken, hashPassword, comparePassword, requireAuth, requireAdmin };
