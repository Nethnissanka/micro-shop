const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'admin',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'shopping_site',
  password: process.env.POSTGRES_PASSWORD || 'password',
  port: process.env.POSTGRES_PORT || 5432,
});

const initDB = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) DEFAULT 'Placed',
      items JSONB NOT NULL,
      delivery_details JSONB,
      payment_method VARCHAR(50),
      payment_status VARCHAR(50) DEFAULT 'Pending',
      stripe_payment_intent_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Ensure columns exist for existing tables
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_details JSONB;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Pending';
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
  `;
  try {
    await pool.query(queryText);
    console.log('Orders table created or exists');
  } catch (err) {
    console.error('Error creating orders table', err);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDB
};
