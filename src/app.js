'use strict';
require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const compression= require('compression');
const morgan     = require('morgan');
const path       = require('path');
const { v4: uuidv4 } = require('uuid');
const YAML       = require('yamljs');
const swaggerUi  = require('swagger-ui-express');

const logger       = require('./utils/logger');
const { generalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const routes       = require('./routes');

const app = express();

// ══════════════════════════════════════════════════════════════════════════
// CORS — raw middleware, FIRST in the stack, before everything else.
// On Render the frontend is served from the same origin so CORS headers
// are only needed for development (Live Server, Postman, etc.).
// ══════════════════════════════════════════════════════════════════════════
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin',      origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin',      '*');
  }
  res.setHeader('Access-Control-Allow-Credentials',   'true');
  res.setHeader('Access-Control-Allow-Methods',       'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers',       'Content-Type, Authorization, X-Request-Id, Accept');
  res.setHeader('Access-Control-Max-Age',             '86400');

  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// ── Security headers (after CORS so Helmet cannot strip them) ────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Allow inline scripts and styles required by the SPA
  contentSecurityPolicy: false,
}));

// ── Compression ──────────────────────────────────────────────────────────
app.use(compression());

// ── Request ID ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// ── HTTP logging ─────────────────────────────────────────────────────────
app.use(morgan('[:date[iso]] :method :url :status :res[content-length] - :response-time ms', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip:   (req) => req.url === '/api/v1/health',
}));

// ── Body parsers ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Serve uploaded files ──────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Rate limiting ─────────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ── Swagger UI (dev only) ─────────────────────────────────────────────────
if (process.env.SWAGGER_ENABLED === 'true') {
  try {
    const swaggerDoc = YAML.load(path.join(__dirname, '..', 'swagger', 'swagger.yaml'));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
      customSiteTitle: 'ProHorizon API Docs',
      customCss:       '.swagger-ui .topbar { background: #3B5BDB; }',
    }));
    logger.info('📄  Swagger UI: /api/docs');
  } catch (e) {
    logger.warn(`Swagger load failed: ${e.message}`);
  }
}

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ── Serve Frontend SPA (production) ──────────────────────────────────────
// All non-API routes serve index.html so the SPA handles client routing.
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('*', (req, res, next) => {
  // Don't intercept API or upload paths
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    status:  'error',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ── Global error handler ──────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
