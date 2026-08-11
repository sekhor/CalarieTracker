require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectMSSQL } = require('./config/db');

const mealsRouter = require('./routes/meals');
const analyzeRouter = require('./routes/analyze');
const dashboardRouter = require('./routes/dashboard');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
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
  await connectMSSQL(); // attempts MSSQL connection, falls back to local storage if needed

  app.listen(PORT, () => {
    console.log(`🚀 Calorie Tracker Backend Server listening on http://localhost:${PORT}`);
  });
}

startServer();
