'use strict';
require('dotenv').config();
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

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
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    ...sharedOptions,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
  });
} else {
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

// Retry up to 8 times (~2 min) - Render free PostgreSQL can take 30-90s to
// become reachable after a fresh deploy.
const connectDB = async () => {
  const MAX_RETRIES = 8;
  const BASE_DELAY  = 5000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sequelize.authenticate();
      logger.info('PostgreSQL connected');
      await sequelize.sync({ force: false, alter: false });
      logger.info('Database schema synchronized');
      return;
    } catch (err) {
      const isLast = attempt === MAX_RETRIES;
      const delay  = BASE_DELAY * attempt;
      if (isLast) {
        logger.error('Database connection failed after ' + MAX_RETRIES + ' attempts: ' + err.message);
        process.exit(1);
      }
      logger.warn('DB connect attempt ' + attempt + '/' + MAX_RETRIES + ' failed. Retrying in ' + (delay / 1000) + 's...');
      await new Promise(function(r) { setTimeout(r, delay); });
    }
  }
};

module.exports = { sequelize, connectDB };
