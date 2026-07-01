'use strict';
require('dotenv').config();
var express     = require('express');
var helmet      = require('helmet');
var compression = require('compression');
var morgan      = require('morgan');
var path        = require('path');
var uuidv4      = require('uuid').v4;

var logger       = require('./utils/logger');
var rateLimiter  = require('./middleware/rateLimiter');
var errorHandler = require('./middleware/errorHandler');
var routes       = require('./routes');

var app = express();

// ── CORS — raw middleware, ABSOLUTE FIRST ─────────────────────────────────
// Must be before Helmet, rate limiters, and everything else.
// Reflects the requesting origin so any domain can access the API.
app.use(function(req, res, next) {
  var origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin',      origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods',     'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers',     'Content-Type, Authorization, X-Request-Id, Accept');
  res.setHeader('Access-Control-Max-Age',           '86400');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// ── Security headers ───────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy:     false, // SPA has inline scripts
}));

// ── Compression ────────────────────────────────────────────────────────────
app.use(compression());

// ── Request ID ────────────────────────────────────────────────────────────
app.use(function(req, res, next) {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// ── HTTP logging ──────────────────────────────────────────────────────────
app.use(morgan('[:date[iso]] :method :url :status :res[content-length]b - :response-time ms', {
  stream: { write: function(msg) { logger.info(msg.trim()); } },
  skip:   function(req) { return req.url === '/api/v1/health'; },
}));

// ── Body parsers ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static uploads ────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Rate limiting ─────────────────────────────────────────────────────────
app.use('/api', rateLimiter.generalLimiter);

// ── Swagger (dev/staging only) ────────────────────────────────────────────
if (process.env.SWAGGER_ENABLED === 'true') {
  try {
    var YAML       = require('yamljs');
    var swaggerUi  = require('swagger-ui-express');
    var swaggerDoc = YAML.load(path.join(__dirname, '..', 'swagger', 'swagger.yaml'));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
      customSiteTitle: 'ProHorizon API',
      customCss:       '.swagger-ui .topbar { background: #3B5BDB; }',
    }));
    logger.info('Swagger UI: /api/docs');
  } catch (e) {
    logger.warn('Swagger load failed: ' + e.message);
  }
}

// ── API routes ────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ── Serve frontend SPA ────────────────────────────────────────────────────
var publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// SPA fallback — must come AFTER express.static and API routes
app.get('*', function(req, res, next) {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ── 404 ───────────────────────────────────────────────────────────────────
app.use(function(req, res) {
  res.status(404).json({ status: 'error', message: 'Route ' + req.method + ' ' + req.originalUrl + ' not found' });
});

// ── Global error handler ──────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
