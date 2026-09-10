require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { connectMSSQL, flushLocalStoreWrites, getDbStatus } = require('./config/db');

const mealsRouter = require('./routes/meals');
const analyzeRouter = require('./routes/analyze');
const dashboardRouter = require('./routes/dashboard');
const settingsRouter = require('./routes/settings');
const authRouter = require('./routes/auth');
const chatRouter = require('./routes/chat');
const profileRouter = require('./routes/profile');
const insightsRouter = require('./routes/insights');
const knowledgeRouter = require('./routes/knowledge');
const plannerRouter = require('./routes/planner');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 8080;
const clientDistPath = path.resolve(__dirname, '..', '..', 'client', 'dist');
const hasClientBuild = fs.existsSync(path.join(clientDistPath, 'index.html'));
let databaseInitializing = false;
let databaseInitializedAt = null;
let httpServer = null;

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
];

if (process.env.WEBSITE_HOSTNAME) {
  defaultAllowedOrigins.push(`https://${process.env.WEBSITE_HOSTNAME}`);
}

const configuredAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...configuredAllowedOrigins])];

const corsOptions = {
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};

function apiCors(req, res, next) {
  const origin = req.headers.origin;
  const requestHost = String(req.headers.host || '').trim();
  const expectedProtocol = process.env.WEBSITE_HOSTNAME ? 'https' : req.protocol;
  const expectedOrigin = requestHost ? `${expectedProtocol}://${requestHost}` : '';
  let isSameHost = false;
  try {
    isSameHost = Boolean(origin) && new URL(origin).origin === expectedOrigin;
  } catch (error) {
    isSameHost = false;
  }

  if (origin && !isSameHost && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: `CORS blocked for origin: ${origin}` });
  }

  return cors({ ...corsOptions, origin: origin || true })(req, res, next);
}

// CORS is only needed by API requests; static assets are always same-origin.
app.use('/api', apiCors);
app.use(compression());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  const startedAt = process.hrtime.bigint();
  const originalEnd = res.end;
  res.end = function endWithTiming(...args) {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (!res.headersSent) {
      res.setHeader('Server-Timing', `app;dur=${durationMs.toFixed(1)}`);
    }
    if (durationMs >= 1000) {
      console.warn(`Slow API request: ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(0)}ms`);
    }
    return originalEnd.apply(this, args);
  };
  next();
});

// Liveness never exposes connection strings or raw database errors.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Calorie Tracker API', timestamp: new Date().toISOString() });
});

// Readiness is separate so Azure can distinguish a running process from a
// database initialization still in progress.
app.get('/api/ready', (req, res) => {
  const status = getDbStatus();
  const ready = status.connectionState === 'ready' || status.connectionState === 'fallback';
  return res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'initializing',
    database: { engine: status.engine, connectionState: status.connectionState },
    initializedAt: databaseInitializedAt,
  });
});

// Do not accept writes into the fallback store while MSSQL retries are pending.
app.use('/api', (req, res, next) => {
  const status = getDbStatus();
  if (status.connectionState === 'connecting' && process.env.MSSQL_SERVER) {
    res.setHeader('Retry-After', '2');
    return res.status(503).json({ error: 'Database is initializing. Please retry shortly.' });
  }
  return next();
});

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/meals', requireAuth, mealsRouter);
app.use('/api/analyze', requireAuth, analyzeRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/settings', requireAuth, settingsRouter);
app.use('/api/chat', requireAuth, chatRouter);
app.use('/api/profile', requireAuth, profileRouter);
app.use('/api/insights', requireAuth, insightsRouter);
app.use('/api/knowledge', requireAuth, knowledgeRouter);
app.use('/api/planner', requireAuth, plannerRouter);

if (hasClientBuild) {
  app.use('/assets', express.static(path.join(clientDistPath, 'assets'), {
    immutable: true,
    maxAge: '1y',
  }));
  app.use(express.static(clientDistPath, {
    index: false,
    maxAge: '1h',
    setHeaders(res, filePath) {
      if (path.basename(filePath) === 'index.html') {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

async function initializeDatabase(attempt = 1) {
  const configuredAttempts = Number.parseInt(process.env.MSSQL_CONNECT_RETRIES || '3', 10);
  const maxAttempts = process.env.MSSQL_SERVER ? Math.max(1, configuredAttempts) : 1;
  databaseInitializing = true;

  const isFinalAttempt = attempt >= maxAttempts;
  const result = await connectMSSQL(null, { fallbackOnFailure: isFinalAttempt });

  if (!result.success && attempt < maxAttempts) {
    const delayMs = Math.min(30000, 2000 * (2 ** (attempt - 1)));
    console.warn(`Retrying MSSQL connection in ${delayMs}ms (attempt ${attempt + 1}/${maxAttempts})...`);
    const retryTimer = setTimeout(() => initializeDatabase(attempt + 1), delayMs);
    retryTimer.unref?.();
    return;
  }

  databaseInitializing = false;
  databaseInitializedAt = new Date().toISOString();
}

// Start HTTP immediately; database initialization continues in the background.
function startServer() {
  console.log('Allowed CORS origins:', allowedOrigins);
  console.log('Client build detected:', hasClientBuild ? clientDistPath : 'not found');

  httpServer = app.listen(PORT, () => {
    console.log(`🚀 Calorie Tracker server listening on port ${PORT}`);
  });

  console.log('Initializing Calorie Tracker Database connection in the background...');
  initializeDatabase().catch((error) => {
    databaseInitializing = false;
    console.error('Unexpected database initialization error:', error);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down gracefully...`);
  await flushLocalStoreWrites();
  if (!httpServer) {
    process.exit(0);
    return;
  }

  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

startServer();
