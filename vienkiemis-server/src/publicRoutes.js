const express = require('express');
const mapOverrides = require('../db/mapOverrides');

const router = express.Router();

// Viešas endpoint'as - klientui reikia žemėlapio nustatymų (NPC pozicijos, priverstiniai medžiai)
// dar PRIEŠ prisijungiant (jog žemėlapis piešiamas teisingai nuo pat pradžių).
router.get('/map-overrides', async (req, res) => {
  const overrides = await mapOverrides.getMapOverrides();
  res.json({ overrides });
});

router.get('/health', (req, res) => res.json({ ok: true }));

module.exports = router;
