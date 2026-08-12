const sql = require('mssql');
const path = require('path');
const fs = require('fs');

const DEFAULT_GOALS = {
  daily_calorie_target: 2000,
  protein_target_g: 140,
  carbs_target_g: 225,
  fat_target_g: 65,
};

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
      users: [],
      user_settings: {},
    };
    fs.writeFileSync(jsonDbPath, JSON.stringify(initialData, null, 2));
  }
}

function getLocalStore() {
  ensureLocalStore();
  try {
    const raw = fs.readFileSync(jsonDbPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      meals: Array.isArray(parsed.meals) ? parsed.meals : [],
      users: Array.isArray(parsed.users) ? parsed.users : [],
      user_settings: parsed.user_settings && typeof parsed.user_settings === 'object' ? parsed.user_settings : {},
    };
  } catch (e) {
    return { meals: [], users: [], user_settings: {} };
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
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
    BEGIN
      CREATE TABLE [dbo].[Users] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [email] NVARCHAR(255) NOT NULL UNIQUE,
        [name] NVARCHAR(255) NOT NULL,
        [password_hash] NVARCHAR(255) NOT NULL,
        [token_hash] NVARCHAR(255) NULL,
        [created_at] DATETIME2 DEFAULT GETDATE()
      );
    END;

    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Meals]') AND type in (N'U'))
    BEGIN
      CREATE TABLE [dbo].[Meals] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [user_id] INT NOT NULL,
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
        [created_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT [FK_Meals_Users] FOREIGN KEY ([user_id]) REFERENCES [dbo].[Users]([id])
      );
    END;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Meals]') AND name = 'user_id')
    BEGIN
      ALTER TABLE [dbo].[Meals] ADD [user_id] INT NULL;
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
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [user_id] INT NOT NULL,
        [setting_key] NVARCHAR(100) NOT NULL,
        [setting_value] NVARCHAR(MAX) NOT NULL
      );
    END;

    IF COL_LENGTH('dbo.UserSettings', 'user_id') IS NULL
    BEGIN
      ALTER TABLE [dbo].[UserSettings] ADD [user_id] INT NULL;
    END;

    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE name = 'UX_UserSettings_UserKey' AND object_id = OBJECT_ID(N'[dbo].[UserSettings]')
    )
    BEGIN
      CREATE UNIQUE INDEX [UX_UserSettings_UserKey] ON [dbo].[UserSettings]([user_id], [setting_key]);
    END;
  `);
}

function getDefaultGoals() {
  return { ...DEFAULT_GOALS };
}

async function findUserByEmail(email) {
  if (currentEngine === 'mssql' && mssqlPool) {
    const result = await mssqlPool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT TOP 1 * FROM Users WHERE email = @email');
    return result.recordset?.[0] || null;
  }

  const store = getLocalStore();
  return store.users.find((user) => user.email === email) || null;
}

async function findUserByToken(tokenHash) {
  if (currentEngine === 'mssql' && mssqlPool) {
    const result = await mssqlPool.request()
      .input('token_hash', sql.NVarChar, tokenHash)
      .query('SELECT TOP 1 id, email, name FROM Users WHERE token_hash = @token_hash');
    return result.recordset?.[0] || null;
  }

  const store = getLocalStore();
  return store.users.find((user) => user.token_hash === tokenHash) || null;
}

async function createUser({ email, name, passwordHash, tokenHash }) {
  if (currentEngine === 'mssql' && mssqlPool) {
    const result = await mssqlPool.request()
      .input('email', sql.NVarChar, email)
      .input('name', sql.NVarChar, name)
      .input('password_hash', sql.NVarChar, passwordHash)
      .input('token_hash', sql.NVarChar, tokenHash)
      .query(`
        INSERT INTO Users (email, name, password_hash, token_hash)
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.name
        VALUES (@email, @name, @password_hash, @token_hash)
      `);
    return result.recordset[0];
  }

  const store = getLocalStore();
  const nextId = store.users.reduce((max, user) => Math.max(max, Number(user.id) || 0), 0) + 1;
  const user = {
    id: nextId,
    email,
    name,
    password_hash: passwordHash,
    token_hash: tokenHash,
    created_at: new Date().toISOString(),
  };
  store.users.push(user);
  if (!store.user_settings[String(nextId)]) {
    store.user_settings[String(nextId)] = { daily_goals: getDefaultGoals() };
  }
  saveLocalStore(store);
  return { id: user.id, email: user.email, name: user.name };
}

async function updateUserToken(userId, tokenHash) {
  if (currentEngine === 'mssql' && mssqlPool) {
    await mssqlPool.request()
      .input('user_id', sql.Int, userId)
      .input('token_hash', sql.NVarChar, tokenHash)
      .query('UPDATE Users SET token_hash = @token_hash WHERE id = @user_id');
    return;
  }

  const store = getLocalStore();
  const user = store.users.find((item) => String(item.id) === String(userId));
  if (user) {
    user.token_hash = tokenHash;
    saveLocalStore(store);
  }
}

async function getUserGoals(userId) {
  if (currentEngine === 'mssql' && mssqlPool) {
    const result = await mssqlPool.request()
      .input('user_id', sql.Int, userId)
      .input('key', sql.NVarChar, 'daily_goals')
      .query('SELECT TOP 1 setting_value FROM UserSettings WHERE user_id = @user_id AND setting_key = @key');

    if (result.recordset?.length) {
      try {
        return { ...getDefaultGoals(), ...JSON.parse(result.recordset[0].setting_value) };
      } catch (error) {
        return getDefaultGoals();
      }
    }

    return getDefaultGoals();
  }

  const store = getLocalStore();
  const settings = store.user_settings?.[String(userId)] || {};
  return { ...getDefaultGoals(), ...(settings.daily_goals || {}) };
}

async function saveUserGoals(userId, goalsObj) {
  if (currentEngine === 'mssql' && mssqlPool) {
    await mssqlPool.request()
      .input('user_id', sql.Int, userId)
      .input('key', sql.NVarChar, 'daily_goals')
      .input('val', sql.NVarChar, JSON.stringify(goalsObj))
      .query(`
        IF EXISTS (SELECT 1 FROM UserSettings WHERE user_id = @user_id AND setting_key = @key)
          UPDATE UserSettings SET setting_value = @val WHERE user_id = @user_id AND setting_key = @key
        ELSE
          INSERT INTO UserSettings (user_id, setting_key, setting_value) VALUES (@user_id, @key, @val)
      `);
    return;
  }

  const store = getLocalStore();
  if (!store.user_settings[String(userId)]) {
    store.user_settings[String(userId)] = {};
  }
  store.user_settings[String(userId)].daily_goals = goalsObj;
  saveLocalStore(store);
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
  createUser,
  findUserByEmail,
  findUserByToken,
  getDbStatus,
  getDefaultGoals,
  getLocalStore,
  getUserGoals,
  saveLocalStore,
  saveUserGoals,
  updateUserToken,
  getMssqlPool: () => mssqlPool,
  getEngine: () => currentEngine,
  getMssqlConfig: () => mssqlConfig,
};
