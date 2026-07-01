'use strict';
require('dotenv').config();
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const poolConfig = {
  max:     parseInt(process.env.DB_POOL_MAX)     || 10,
  min:     parseInt(process.env.DB_POOL_MIN)     || 2,
  acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
  idle:    parseInt(process.env.DB_POOL_IDLE)    || 10000,
};

const sharedOptions = {
  dialect: 'postgres',
  pool: poolConfig,
  logging: false,
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

// Retry up to 10 times with linear backoff.
// Throws on final failure — caller decides whether to crash or continue.
const connectDB = async function() {
  var MAX_RETRIES = 10;
  var BASE_DELAY  = 6000; // ms

  for (var attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sequelize.authenticate();
      logger.info('PostgreSQL connected');
      await sequelize.sync({ force: false, alter: false });
      logger.info('Database schema synchronized');
      return; // success
    } catch (err) {
      var isLast = attempt === MAX_RETRIES;
      var delay  = BASE_DELAY * attempt;

      if (isLast) {
        throw new Error('DB connect failed after ' + MAX_RETRIES + ' attempts: ' + err.message);
      }

      logger.warn('DB connect attempt ' + attempt + '/' + MAX_RETRIES + ' failed (' + err.message.substring(0, 80) + '). Retry in ' + (delay / 1000) + 's...');
      await new Promise(function(resolve) { setTimeout(resolve, delay); });
    }
  }
};

module.exports = { sequelize, connectDB };
