'use strict';
require('dotenv').config();
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// ── Connection pool ───────────────────────────────────────────────────────
const poolConfig = {
  max:     parseInt(process.env.DB_POOL_MAX)     || 10,
  min:     parseInt(process.env.DB_POOL_MIN)     || 2,
  acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
  idle:    parseInt(process.env.DB_POOL_IDLE)    || 10000,
};

const baseOptions = {
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

// ── Build sequelize instance ──────────────────────────────────────────────
// Supports two config styles:
//   1. DATABASE_URL  (Render managed PostgreSQL, Heroku, Railway, Supabase, etc.)
//   2. Individual vars DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD
//
// SSL is enabled whenever NODE_ENV=production OR DB_SSL=true.
// rejectUnauthorized:false is required for Render's self-signed certs.
// ─────────────────────────────────────────────────────────────────────────
var isProduction = process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true';
var sslOptions   = isProduction ? { require: true, rejectUnauthorized: false } : false;

var sequelize;

if (process.env.DATABASE_URL) {
  logger.info('DB config: using DATABASE_URL (Render/cloud PostgreSQL)');
  sequelize = new Sequelize(process.env.DATABASE_URL, Object.assign({}, baseOptions, {
    dialectOptions: sslOptions ? { ssl: sslOptions } : {},
  }));
} else {
  var dbHost = process.env.DB_HOST     || 'localhost';
  var dbPort = parseInt(process.env.DB_PORT) || 5432;
  var dbName = process.env.DB_NAME     || 'prohorizon_db';
  var dbUser = process.env.DB_USER     || 'postgres';
  var dbPass = process.env.DB_PASSWORD || '';

  logger.info('DB config: using individual vars — ' + dbUser + '@' + dbHost + ':' + dbPort + '/' + dbName + (sslOptions ? ' (SSL on)' : ' (SSL off)'));

  sequelize = new Sequelize(dbName, dbUser, dbPass, Object.assign({}, baseOptions, {
    host: dbHost,
    port: dbPort,
    dialectOptions: sslOptions ? { ssl: sslOptions } : {},
  }));
}

// ── connectDB — retry with linear backoff ─────────────────────────────────
// Throws on final failure so the caller can decide to crash or degrade.
var connectDB = async function() {
  var MAX_RETRIES = 10;
  var BASE_DELAY  = 5000; // ms — increases by 5s each attempt

  for (var attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sequelize.authenticate();
      logger.info('PostgreSQL connected successfully');

      // Safe schema sync — never drops or alters columns in production
      await sequelize.sync({ force: false, alter: false });
      logger.info('Database schema synchronized');
      return; // success
    } catch (err) {
      var delay  = BASE_DELAY * attempt;
      var isLast = attempt === MAX_RETRIES;

      if (isLast) {
        throw new Error('Database unreachable after ' + MAX_RETRIES + ' attempts. Last error: ' + err.message);
      }

      logger.warn('[DB] Attempt ' + attempt + '/' + MAX_RETRIES + ' failed: ' + err.message.slice(0, 120) + ' — retry in ' + (delay / 1000) + 's');
      await new Promise(function(r) { setTimeout(r, delay); });
    }
  }
};

module.exports = { sequelize, connectDB };
