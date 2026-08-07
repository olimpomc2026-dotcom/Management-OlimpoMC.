const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function initDB() {
  const client = await pool.connect();
  try {
    // Tabla de contadores
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_sanctions (
        user_id VARCHAR(32) PRIMARY KEY,
        warns INT DEFAULT 0,
        strikes INT DEFAULT 0
      );
    `);

    // Tabla de historial de eventos
    await client.query(`
      CREATE TABLE IF NOT EXISTS sanction_logs (
        id SERIAL PRIMARY KEY,
        target_id VARCHAR(32) NOT NULL,
        mod_id VARCHAR(32) NOT NULL,
        ign VARCHAR(64) NOT NULL,
        action_type VARCHAR(32) NOT NULL,
        warns_changed INT DEFAULT 0,
        strikes_changed INT DEFAULT 0,
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Base de datos PostgreSQL conectada e inicializada.');
  } finally {
    client.release();
  }
}

initDB().catch(err => console.error('❌ Error iniciando base de datos:', err));

module.exports = {
  // Obtener sanciones actuales
  getStaff: async (userId) => {
    const res = await pool.query('SELECT warns, strikes FROM staff_sanctions WHERE user_id = $1', [userId]);
    return res.rows[0] || { warns: 0, strikes: 0 };
  },

  // Actualizar contadores
  updateStaff: async (userId, warns, strikes) => {
    await pool.query(
      `INSERT INTO staff_sanctions (user_id, warns, strikes) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (user_id) 
       DO UPDATE SET warns = $2, strikes = $3`,
      [userId, warns, strikes]
    );
  },

  // Registrar en el historial
  addLog: async (targetId, modId, ign, actionType, warnsChanged, strikesChanged, reason) => {
    await pool.query(
      `INSERT INTO sanction_logs (target_id, mod_id, ign, action_type, warns_changed, strikes_changed, reason) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [targetId, modId, ign, actionType, warnsChanged, strikesChanged, reason]
    );
  },

  // Consultar historial
  getHistory: async (targetId) => {
    const res = await pool.query(
      'SELECT * FROM sanction_logs WHERE target_id = $1 ORDER BY created_at DESC LIMIT 10',
      [targetId]
    );
    return res.rows;
  }
};
