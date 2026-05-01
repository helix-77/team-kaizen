import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('[db] Users table ready');
  } catch (err) {
    console.error('[db] Init error:', err.message);
    // Retry after 2s on startup
    await new Promise((r) => setTimeout(r, 2000));
    return initDb();
  }
}

export { pool, initDb };
