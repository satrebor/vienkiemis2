-- Vienkiemis Online - PostgreSQL schema.
-- Taikoma prisijungus prie DB su `npm run db:migrate` (žr. db/migrate.js) - idempotentiška
-- (IF NOT EXISTS visur), tad saugu paleisti pakartotinai.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  blocked       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Herojaus būsena - buvęs localStorage "vienkiemis_accounts_v1" hero objektas, dabar priklauso
-- nuo paskyros serverio pusėje. Laukai atitinka kliento hero state 1:1, kad autosave/persist
-- kodas keistųsi kuo mažiau.
CREATE TABLE IF NOT EXISTS heroes (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  body_color     TEXT NOT NULL DEFAULT '#4a6fa5',
  accent_color   TEXT NOT NULL DEFAULT '#e6a13c',

  x              DOUBLE PRECISION NOT NULL DEFAULT 45,
  y              DOUBLE PRECISION NOT NULL DEFAULT 45,
  hp             DOUBLE PRECISION NOT NULL DEFAULT 100,
  max_hp         DOUBLE PRECISION NOT NULL DEFAULT 100,
  hunger         DOUBLE PRECISION NOT NULL DEFAULT 100,
  thirst         DOUBLE PRECISION NOT NULL DEFAULT 100,
  xp             INTEGER NOT NULL DEFAULT 0,
  level          INTEGER NOT NULL DEFAULT 1,
  kills          INTEGER NOT NULL DEFAULT 0,

  wood           INTEGER NOT NULL DEFAULT 0,
  matches        INTEGER NOT NULL DEFAULT 0,
  coins          INTEGER NOT NULL DEFAULT 0,
  meat           INTEGER NOT NULL DEFAULT 0,
  chocolate      INTEGER NOT NULL DEFAULT 0,
  bandage        INTEGER NOT NULL DEFAULT 0,
  medicine       INTEGER NOT NULL DEFAULT 0,
  gira           INTEGER NOT NULL DEFAULT 0,
  arrows         INTEGER NOT NULL DEFAULT 0,
  fish           INTEGER NOT NULL DEFAULT 0,

  collected_pickups JSONB NOT NULL DEFAULT '[]',

  weapon         TEXT NOT NULL DEFAULT 'fists',
  owned_weapons  JSONB NOT NULL DEFAULT '["fists"]',
  weapon_counts  JSONB NOT NULL DEFAULT '{}',
  helmet_count   INTEGER NOT NULL DEFAULT 0,
  helmet_on      BOOLEAN NOT NULL DEFAULT FALSE,

  quest_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  quest_chopped  INTEGER NOT NULL DEFAULT 0,
  quest_claimed  BOOLEAN NOT NULL DEFAULT FALSE,

  alive_since    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Numatytoji administratoriaus paskyra (buvęs kliento "admin/admin" apėjimas be jokio serverio) -
-- dabar TIKRA paskyra su is_admin=TRUE, slaptažodis saugomas bcrypt (per pgcrypto crypt()+gen_salt('bf'),
-- suderinama su bcryptjs tikrinimu serverio pusėje). BŪTINAI pakeiskite slaptažodį po pirmo prisijungimo
-- production aplinkoje (žr. README) - "ON CONFLICT DO NOTHING" reiškia, kad pakeitimas per app'ą išliks
-- net paleidus migraciją pakartotinai.
INSERT INTO users (username, password_hash, is_admin)
VALUES ('admin', crypt('admin123', gen_salt('bf')), TRUE)
ON CONFLICT (username) DO NOTHING;

-- Papildomi stulpeliai, pridėti vėliau prie jau egzistuojančios `heroes` lentelės - CREATE TABLE
-- IF NOT EXISTS aukščiau jų nepridės senai DB, tad naudojame ALTER TABLE ... ADD COLUMN IF NOT EXISTS,
-- kad migracija liktų idempotentiška ir saugi paleisti pakartotinai bet kurioje aplinkoje.
ALTER TABLE heroes ADD COLUMN IF NOT EXISTS collected_pickups JSONB NOT NULL DEFAULT '[]';

-- Globalūs žemėlapio nustatymai (buvęs admin "vienkiemis_map_overrides_v1" localStorage'e) -
-- dabar BENDRI visiems žaidėjams, nes pasaulis dabar vienas bendras (id visada = 1, viena eilutė).
CREATE TABLE IF NOT EXISTS map_overrides (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  npc_pos       JSONB,
  npc2_pos      JSONB,
  hut_positions JSONB,
  forced_trees  JSONB NOT NULL DEFAULT '[]',
  forced_clear  JSONB NOT NULL DEFAULT '[]',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
