const sql = require('mssql');
const path = require('path');
const fs = require('fs');

let mssqlPool = null;
let currentEngine = 'local_fallback'; // 'mssql' or 'local_fallback'
let lastConnectionError = null;

// JSON File Storage Path for fallback
const dataDir = path.join(__dirname, '../../data');
const jsonDbPath = path.join(dataDir, 'meals_data.json');

function ensureLocalStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(jsonDbPath)) {
    const initialData = {
      meals: [],
      user_settings: {
        daily_goals: {
          daily_calorie_target: 2000,
          protein_target_g: 140,
          carbs_target_g: 225,
          fat_target_g: 65,
        },
      },
    };
    fs.writeFileSync(jsonDbPath, JSON.stringify(initialData, null, 2));
  }
}

function getLocalStore() {
  ensureLocalStore();
  try {
    const raw = fs.readFileSync(jsonDbPath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { meals: [], user_settings: {} };
  }
}

function saveLocalStore(data) {
  ensureLocalStore();
  fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2));
}

// Default MSSQL connection config
let mssqlConfig = {
  user: process.env.MSSQL_USER || 'sa',
  password: process.env.MSSQL_PASSWORD || 'YourStrong@Password',
  server: process.env.MSSQL_SERVER || 'localhost',
  port: parseInt(process.env.MSSQL_PORT || '1433', 10),
  database: process.env.MSSQL_DATABASE || 'CalorieTrackerDB',
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_CERT !== 'false',
    connectTimeout: 50000,
  },
};

// Attempt to connect to MSSQL
async function connectMSSQL(configOverride = null) {
  const configToUse = configOverride || mssqlConfig;
  try {
    if (mssqlPool) {
      try { await mssqlPool.close(); } catch (e) {}
    }
    mssqlPool = await new sql.ConnectionPool(configToUse).connect();
    currentEngine = 'mssql';
    lastConnectionError = null;
    mssqlConfig = configToUse;

    await initMSSQLTables(mssqlPool);
    console.log('Successfully connected to MSSQL Database!');
    return { success: true, engine: 'mssql' };
  } catch (err) {
    console.warn('MSSQL connection failed, using resilient local storage fallback:', err.message);
    lastConnectionError = err.message;
    currentEngine = 'local_fallback';
    mssqlPool = null;
    ensureLocalStore();
    return { success: false, engine: 'local_fallback', error: err.message };
  }
}

// Initialize tables in MSSQL
async function initMSSQLTables(pool) {
  const req = pool.request();
  await req.query(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Meals]') AND type in (N'U'))
    BEGIN
      CREATE TABLE [dbo].[Meals] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [meal_name] NVARCHAR(255) NOT NULL,
        [meal_type] NVARCHAR(50) NOT NULL DEFAULT 'Lunch',
        [calories] INT NOT NULL DEFAULT 0,
        [protein_g] FLOAT DEFAULT 0,
        [carbs_g] FLOAT DEFAULT 0,
        [fat_g] FLOAT DEFAULT 0,
        [image_url] NVARCHAR(MAX) NULL,
        [image_data] VARBINARY(MAX) NULL,
        [image_mime_type] NVARCHAR(100) NULL,
        [notes] NVARCHAR(MAX) NULL,
        [logged_at] DATETIME2 NOT NULL,
        [created_at] DATETIME2 DEFAULT GETDATE()
      );
    END;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Meals]') AND name = 'image_data')
    BEGIN
      ALTER TABLE [dbo].[Meals] ADD [image_data] VARBINARY(MAX) NULL;
    END;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Meals]') AND name = 'image_mime_type')
    BEGIN
      ALTER TABLE [dbo].[Meals] ADD [image_mime_type] NVARCHAR(100) NULL;
    END;

    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserSettings]') AND type in (N'U'))
    BEGIN
      CREATE TABLE [dbo].[UserSettings] (
        [setting_key] NVARCHAR(100) PRIMARY KEY,
        [setting_value] NVARCHAR(MAX) NOT NULL
      );
    END;
  `);

  const checkGoals = await pool.request().query(`SELECT setting_value FROM UserSettings WHERE setting_key = 'daily_goals'`);
  if (!checkGoals.recordset || checkGoals.recordset.length === 0) {
    const defaultGoals = JSON.stringify({
      daily_calorie_target: 2000,
      protein_target_g: 140,
      carbs_target_g: 225,
      fat_target_g: 65,
    });
    await pool.request()
      .input('key', sql.NVarChar, 'daily_goals')
      .input('val', sql.NVarChar, defaultGoals)
      .query(`INSERT INTO UserSettings (setting_key, setting_value) VALUES (@key, @val)`);
  }
}

// Get DB connection status
function getDbStatus() {
  return {
    engine: currentEngine,
    mssqlConnected: currentEngine === 'mssql',
    config: {
      server: mssqlConfig.server,
      port: mssqlConfig.port,
      database: mssqlConfig.database,
      user: mssqlConfig.user,
    },
    lastError: lastConnectionError,
  };
}

module.exports = {
  connectMSSQL,
  getDbStatus,
  getLocalStore,
  saveLocalStore,
  getMssqlPool: () => mssqlPool,
  getEngine: () => currentEngine,
  getMssqlConfig: () => mssqlConfig,
};
