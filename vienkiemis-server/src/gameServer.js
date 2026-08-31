// Socket.IO realaus laiko sluoksnis - žaidėjų buvimas (presence), bendras lauko pasaulis
// (zombiai/kritteriai/bosas/grobis/laužai serverio pusėje), kova ir pokalbiai.
//
// Protokolo apžvalga (žr. taip pat client/README.md):
//   Klientas -> serveris:
//     player:move    { x, y, facing, moving, chopping, attacking, weapon, helmetOn,
//                       hpDisplay, maxHpDisplay, level, name, bodyColor, accentColor }
//                     - siunčiama periodiškai (~130ms), grynai pozicijai/vaizdui - hpDisplay
//                       NĖRA autoritetingas (žr. player:heal žemiau), naudojamas tik kitų
//                       žaidėjų HP juostelei virš galvos parodyti.
//     player:heal    { hp, maxHp } - vienintelis kelias PADIDINTI serverio žinomą HP (bintas/
//                       vaistai/maistas/lygio pakėlimas) - serveris tiesiog pasitiki šia reikšme.
//     player:attack  { targetId, weapon, ranged } (su ack callback) - bandymas trenkti zombiui.
//     loot:collect   { lootId } (su ack callback) - bandymas paimti grobį.
//     campfire:place { x, y } - naujo laužo įkūrimas (bendras, matomas visiems).
//     chat:message   { text }
//   Serveris -> klientas (broadcast 'world' kambaryje, jei nenurodyta kitaip):
//     players:snapshot [player...]           - pilnas sąrašas naujai prisijungus.
//     player:joined / player:left            { player } / { id }
//     player:moved                           relay'intas player:move (be siuntėjo).
//     world:zombies / world:lootDrops / world:campfires  - pilnas sąrašas kas ~200ms.
//     player:hpSync  { hp }                  - TIK konkrečiam žaidėjui, kai zombis sužeidžia.
//     mapOverrides:updated { ... }
//     chat:message   { username, text, ts }
const { verifyToken } = require('./auth');
const world = require('./worldState');
const C = require('./gameConstants');

const TICK_MS = 180;
let lastTickAt = Date.now();

function publicPlayer(p) {
  return {
    id: p.id, username: p.username, x: p.x, y: p.y, facing: p.facing,
    moving: p.moving, chopping: p.chopping, attacking: p.attacking,
    weapon: p.weapon, helmetOn: p.helmetOn,
    hpDisplay: p.hpDisplay, maxHpDisplay: p.maxHpDisplay, level: p.level,
    name: p.name, bodyColor: p.bodyColor, accentColor: p.accentColor,
  };
}

function attachGameServer(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error('Reikia prisijungimo rakto.'));
      socket.auth = verifyToken(token);
      next();
    } catch (e) {
      next(new Error('Neteisingas arba pasibaigęs prisijungimo raktas.'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.auth.sub;
    // Jei ta pati paskyra jau prisijungusi kitur (kita kortelė/įrenginys), atjungiame senąją
    // sesiją - vienas žaidėjas negali "dubliuotis" bendrame pasaulyje.
    for (const [sid, p] of world.state.players) {
      if (p.userId === userId) {
        io.sockets.sockets.get(sid)?.disconnect(true);
        world.state.players.delete(sid);
      }
    }

    const player = {
      id: socket.id, userId, username: socket.auth.username,
      x: 45, y: 45, hp: 100, maxHp: 100, facing: 'down',
      moving: false, chopping: false, attacking: false,
      weapon: 'fists', helmetOn: false,
      hpDisplay: 100, maxHpDisplay: 100, level: 1,
      name: socket.auth.username, bodyColor: '#4a6fa5', accentColor: '#e6a13c',
      lastAttackAt: 0, lastMoveAt: 0,
    };
    world.state.players.set(socket.id, player);
    socket.join('world');

    socket.emit('players:snapshot', [...world.state.players.values()].map(publicPlayer));
    socket.emit('world:zombies', world.state.zombies);
    socket.emit('world:lootDrops', world.state.lootDrops);
    socket.emit('world:campfires', world.state.campfires);
    socket.to('world').emit('player:joined', { player: publicPlayer(player) });

    socket.on('player:move', (payload) => {
      if (!payload || typeof payload.x !== 'number' || typeof payload.y !== 'number') return;
      const clampedX = Math.max(0, Math.min(C.WORLD_SIZE, payload.x));
      const clampedY = Math.max(0, Math.min(C.WORLD_SIZE, payload.y));
      Object.assign(player, {
        x: clampedX, y: clampedY,
        facing: payload.facing || player.facing,
        moving: !!payload.moving, chopping: !!payload.chopping, attacking: !!payload.attacking,
        weapon: payload.weapon || player.weapon, helmetOn: !!payload.helmetOn,
        hpDisplay: typeof payload.hpDisplay === 'number' ? payload.hpDisplay : player.hpDisplay,
        maxHpDisplay: typeof payload.maxHpDisplay === 'number' ? payload.maxHpDisplay : player.maxHpDisplay,
        level: typeof payload.level === 'number' ? payload.level : player.level,
        name: payload.name || player.name,
        bodyColor: payload.bodyColor || player.bodyColor,
        accentColor: payload.accentColor || player.accentColor,
      });
      player.lastMoveAt = Date.now();
      socket.to('world').emit('player:moved', publicPlayer(player));
    });

    socket.on('player:heal', (payload) => {
      if (!payload) return;
      if (typeof payload.maxHp === 'number') player.maxHp = payload.maxHp;
      if (typeof payload.hp === 'number') player.hp = Math.max(0, Math.min(player.maxHp, payload.hp));
    });

    socket.on('player:attack', (payload, ack) => {
      const safeAck = typeof ack === 'function' ? ack : () => {};
      if (!payload || typeof payload.targetId !== 'number') return safeAck({ ok: false, reason: 'bad-request' });
      const result = world.resolveAttack(player, payload.targetId, payload.weapon, !!payload.ranged);
      safeAck(result);
    });

    socket.on('loot:collect', (payload, ack) => {
      const safeAck = typeof ack === 'function' ? ack : () => {};
      if (!payload || !payload.lootId) return safeAck(null);
      const loot = world.collectLoot(player, payload.lootId);
      safeAck(loot);
    });

    socket.on('campfire:place', (payload) => {
      if (!payload || typeof payload.x !== 'number' || typeof payload.y !== 'number') return;
      if (Math.hypot(payload.x - player.x, payload.y - player.y) > 2.5) return;
      world.placeCampfire(payload.x, payload.y, Date.now());
    });

    socket.on('chat:message', (payload) => {
      if (!payload || typeof payload.text !== 'string') return;
      const text = payload.text.slice(0, 240).trim();
      if (!text) return;
      io.to('world').emit('chat:message', { username: player.username, text, ts: Date.now() });
    });

    socket.on('disconnect', () => {
      world.state.players.delete(socket.id);
      socket.to('world').emit('player:left', { id: socket.id });
    });
  });

  setInterval(() => {
    const now = Date.now();
    const dtSec = Math.min(0.5, (now - lastTickAt) / 1000);
    lastTickAt = now;
    const hurt = world.tick(dtSec);
    for (const { player } of hurt) {
      const socket = io.sockets.sockets.get(player.id);
      if (socket) socket.emit('player:hpSync', { hp: player.hp });
    }
    io.to('world').emit('world:zombies', world.state.zombies);
    io.to('world').emit('world:lootDrops', world.state.lootDrops);
    io.to('world').emit('world:campfires', world.state.campfires);
  }, TICK_MS);
}

module.exports = { attachGameServer };
