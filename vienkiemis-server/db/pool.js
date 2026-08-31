// Bendras PostgreSQL prisijungimų fondas (connection pool), naudojamas visame backend'e.
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL nenustatytas - žr. .env.example');
}

const pool = new Pool({
  connectionString,
  // Dauguma hostingo platformų (Railway, Render ir pan.) valdomam PostgreSQL reikalauja SSL,
  // bet naudoja pačių pasirašytus sertifikatus - todėl rejectUnauthorized:false.
  ssl: connectionString.includes('sslmode=require') || process.env.PGSSL === 'true'
    ? { rejectUnauthorized: false }
    : false,
});

module.exports = pool;
