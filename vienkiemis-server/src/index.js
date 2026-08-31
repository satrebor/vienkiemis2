require('dotenv').config({ quiet: true });
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const publicRoutes = require('./publicRoutes');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const terrain = require('./terrain');
const mapOverridesDb = require('../db/mapOverrides');
const { attachGameServer } = require('./gameServer');

const PORT = process.env.PORT || 8080;

async function main() {
  // Įkeliame globalius žemėlapio nustatymus iš DB į atmintį PRIEŠ startuojant serverį, kad
  // pirmieji prisijungę žaidėjai iškart matytų teisingą (admin nustatytą) žemėlapį.
  const overrides = await mapOverridesDb.getMapOverrides();
  terrain.applyOverrides(overrides);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api', publicRoutes);
  app.use('/api', authRoutes);
  app.use('/api/admin', adminRoutes);

  // Kliento statiniai failai (žr. client/ katalogą) - vienas puslapis, prisijungiantis prie
  // šio paties serverio per REST + Socket.IO.
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  app.set('io', io);
  attachGameServer(io);

  server.listen(PORT, () => {
    console.log(`Vienkiemis Online serveris veikia ant ${PORT} porto.`);
  });
}

main().catch((err) => {
  console.error('Nepavyko paleisti serverio:', err);
  process.exit(1);
});
