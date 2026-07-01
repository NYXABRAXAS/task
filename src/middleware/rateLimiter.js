'use strict';
const rateLimit = require('express-rate-limit');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 min
const max      = parseInt(process.env.RATE_LIMIT_MAX) || 100;
const authMax  = parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10;

const generalLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many authentication attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: true,
});

const exportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  message: { status: 'error', message: 'Export rate limit reached. Wait 1 minute.' },
});

module.exports = { generalLimiter, authLimiter, exportLimiter };
