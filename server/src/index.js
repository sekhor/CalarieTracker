require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectMSSQL } = require('./config/db');

const mealsRouter = require('./routes/meals');
const analyzeRouter = require('./routes/analyze');
const dashboardRouter = require('./routes/dashboard');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 8080;

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
];

const configuredAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...configuredAllowedOrigins])];

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};

// Enable CORS and JSON parsing
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Mount API routes
app.use('/api/meals', mealsRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', settingsRouter);

// Base health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Calorie Tracker API', timestamp: new Date().toISOString() });
});

// Start Server & Initialize Database Connection
async function startServer() {
  console.log('Initializing Calorie Tracker Database connection...');
  console.log('Allowed CORS origins:', allowedOrigins);
  await connectMSSQL(); // attempts MSSQL connection, falls back to local storage if needed

  app.listen(PORT, () => {
    console.log(`🚀 Calorie Tracker Backend Server listening on http://localhost:${PORT}`);
  });
}

startServer();
