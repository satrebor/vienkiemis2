// Paprastas migracijos skriptas: paleidžia db/schema.sql prieš DATABASE_URL nurodytą duomenų
// bazę. Idempotentiškas (CREATE ... IF NOT EXISTS), saugu paleisti kiekvieno deploy'aus metu.
// Naudojimas: node db/migrate.js  (arba `npm run db:migrate`)
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL nenustatytas (.env faile arba aplinkos kintamajame).');
    process.exit(1);
  }
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=require') || process.env.PGSSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
  });
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('Vykdoma db/schema.sql prieš', connectionString.replace(/:[^:@]+@/, ':****@'));
  await pool.query(sql);
  console.log('Migracija baigta sėkmingai.');
  await pool.end();
}

main().catch((err) => {
  console.error('Migracija nepavyko:', err);
  process.exit(1);
});
