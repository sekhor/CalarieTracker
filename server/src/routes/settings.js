const express = require('express');
const router = express.Router();
const sql = require('mssql');
const {
  getDbStatus,
  connectMSSQL,
  getMssqlConfig,
  getMssqlPool,
  getEngine,
  getUserGoals,
  saveUserGoals,
} = require('../config/db');
const { updateAzureSettings, getAzureSettings } = require('../services/azureOpenAI');

// GET /api/settings - retrieve application configuration status
router.get('/', async (req, res) => {
  try {
    const dbStatus = getDbStatus();
    const azureStatus = getAzureSettings();
    const goals = await getUserGoals(req.user.id);

    return res.json({
      database: dbStatus,
      azure: azureStatus,
      goals,
    });
  } catch (err) {
    console.error('Error fetching settings:', err);
    return res.status(500).json({ error: 'Failed to fetch settings', details: err.message });
  }
});

// POST /api/settings/azure - update Azure OpenAI parameters
router.post('/azure', (req, res) => {
  try {
    const { endpoint, apiKey, deployment, apiVersion } = req.body;
    updateAzureSettings({
      endpoint,
      apiKey,
      deployment,
      apiVersion,
    });
    return res.json({ message: 'Azure OpenAI configuration updated', status: getAzureSettings() });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update Azure OpenAI config', details: err.message });
  }
});

// POST /api/settings/mssql - connect/reconnect to MSSQL database
router.post('/mssql', async (req, res) => {
  try {
    const { server, port, database, user, password, trustServerCertificate } = req.body;
    const config = {
      server,
      port: parseInt(port || '1433', 10),
      database,
      user,
      password,
      options: {
        encrypt: false,
        trustServerCertificate: trustServerCertificate !== false,
        connectTimeout: 8000,
      },
    };

    const result = await connectMSSQL(config);
    return res.json({
      success: result.success,
      engine: result.engine,
      message: result.success ? 'Connected to MSSQL Database successfully!' : 'Could not connect to MSSQL. Remaining on local store fallback.',
      error: result.error,
      databaseStatus: getDbStatus(),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update MSSQL config', details: err.message });
  }
});

// POST /api/settings/goals - update daily nutritional targets
router.post('/goals', async (req, res) => {
  try {
    const { daily_calorie_target, protein_target_g, carbs_target_g, fat_target_g } = req.body;
    const goalsObj = {
      daily_calorie_target: parseInt(daily_calorie_target || 2000, 10),
      protein_target_g: parseFloat(protein_target_g || 140),
      carbs_target_g: parseFloat(carbs_target_g || 225),
      fat_target_g: parseFloat(fat_target_g || 65),
    };

    await saveUserGoals(req.user.id, goalsObj);

    return res.json({ message: 'Goals updated successfully', goals: goalsObj });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save goals', details: err.message });
  }
});

module.exports = router;
