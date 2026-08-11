const express = require('express');
const router = express.Router();
const sql = require('mssql');
const {
  getDbStatus,
  connectMSSQL,
  getMssqlConfig,
  getMssqlPool,
  getLocalStore,
  saveLocalStore,
  getEngine,
} = require('../config/db');
const { updateAzureSettings, getAzureSettings } = require('../services/azureOpenAI');

// GET /api/settings - retrieve application configuration status
router.get('/', async (req, res) => {
  try {
    const dbStatus = getDbStatus();
    const azureStatus = getAzureSettings();
    const engine = getEngine();

    let goals = {
      daily_calorie_target: 2000,
      protein_target_g: 140,
      carbs_target_g: 225,
      fat_target_g: 65,
    };

    if (engine === 'mssql') {
      const pool = getMssqlPool();
      if (pool) {
        const goalsRes = await pool.request().query(`SELECT setting_value FROM UserSettings WHERE setting_key = 'daily_goals'`);
        if (goalsRes.recordset && goalsRes.recordset.length > 0) {
          try {
            goals = { ...goals, ...JSON.parse(goalsRes.recordset[0].setting_value) };
          } catch (e) {}
        }
      }
    } else {
      const store = getLocalStore();
      if (store.user_settings && store.user_settings.daily_goals) {
        goals = { ...goals, ...store.user_settings.daily_goals };
      }
    }

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

    const engine = getEngine();

    if (engine === 'mssql') {
      const pool = getMssqlPool();
      await pool.request()
        .input('key', sql.NVarChar, 'daily_goals')
        .input('val', sql.NVarChar, JSON.stringify(goalsObj))
        .query(`
          IF EXISTS (SELECT 1 FROM UserSettings WHERE setting_key = @key)
            UPDATE UserSettings SET setting_value = @val WHERE setting_key = @key
          ELSE
            INSERT INTO UserSettings (setting_key, setting_value) VALUES (@key, @val)
        `);
    } else {
      const store = getLocalStore();
      if (!store.user_settings) store.user_settings = {};
      store.user_settings.daily_goals = goalsObj;
      saveLocalStore(store);
    }

    return res.json({ message: 'Goals updated successfully', goals: goalsObj });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save goals', details: err.message });
  }
});

module.exports = router;
