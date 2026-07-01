'use strict';
require('dotenv').config();
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// ── Connection config ─────────────────────────────────────────────────────
// Render provides DATABASE_URL automatically when a PostgreSQL database is
// linked to the service.  Fall back to individual params for local dev.
const poolConfig = {
  max:     parseInt(process.env.DB_POOL_MAX)     || 10,
  min:     parseInt(process.env.DB_POOL_MIN)     || 2,
  acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
  idle:    parseInt(process.env.DB_POOL_IDLE)    || 10000,
};

const sharedOptions = {
  dialect: 'postgres',
  pool: poolConfig,
  logging: (msg) => {
    if (process.env.NODE_ENV === 'development') logger.debug(msg);
  },
  define: {
    underscored:     false,
    freezeTableName: true,
    timestamps:      true,
    createdAt:       'created_at',
    updatedAt:       'updated_at',
  },
};

let sequelize;

if (process.env.DATABASE_URL) {
  // ── Render / cloud PostgreSQL (uses connection string + SSL) ─────────
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    ...sharedOptions,
    dialectOptions: {
      ssl: {
        require:            true,
        rejectUnauthorized: false, // Render uses self-signed certs internally
      },
    },
  });
} else {
  // ── Local development (individual params) ────────────────────────────
  sequelize = new Sequelize(
    process.env.DB_NAME     || 'prohorizon_db',
    process.env.DB_USER     || 'postgres',
    process.env.DB_PASSWORD || '',
    {
      ...sharedOptions,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      dialectOptions: process.env.DB_SSL === 'true'
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
    }
  );
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅  PostgreSQL connected');
    // sync({ alter: true }) in dev so columns stay in sync;
    // sync({ force: false }) in prod — never drop tables on cloud
    await sequelize.sync({
      alter: process.env.NODE_ENV === 'development',
      force: false,
    });
    logger.info('✅  Database schema synchronized');
  } catch (err) {
    logger.error(`❌  Database connection failed: ${err.message}`);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
