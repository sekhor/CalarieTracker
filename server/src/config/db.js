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
      user_profiles: {},
      chat_sessions: [],
      chat_messages: [],
      knowledge_documents: [],
      coach_memories: [],
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
      user_profiles: parsed.user_profiles && typeof parsed.user_profiles === 'object' ? parsed.user_profiles : {},
      chat_sessions: Array.isArray(parsed.chat_sessions) ? parsed.chat_sessions : [],
      chat_messages: Array.isArray(parsed.chat_messages) ? parsed.chat_messages : [],
      knowledge_documents: Array.isArray(parsed.knowledge_documents) ? parsed.knowledge_documents : [],
      coach_memories: Array.isArray(parsed.coach_memories) ? parsed.coach_memories : [],
    };
  } catch (e) {
    return {
      meals: [],
      users: [],
      user_settings: {},
      user_profiles: {},
      chat_sessions: [],
      chat_messages: [],
      knowledge_documents: [],
      coach_memories: [],
    };
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

    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserNutritionProfiles]') AND type in (N'U'))
    BEGIN
      CREATE TABLE [dbo].[UserNutritionProfiles] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [user_id] INT NOT NULL UNIQUE,
        [age] INT NULL,
        [sex] NVARCHAR(20) NULL,
        [height_cm] FLOAT NULL,
        [weight_kg] FLOAT NULL,
        [activity_level] NVARCHAR(50) NULL,
        [goal_type] NVARCHAR(50) NULL,
        [dietary_style] NVARCHAR(50) NULL,
        [allergies_json] NVARCHAR(MAX) NULL,
        [disliked_foods_json] NVARCHAR(MAX) NULL,
        [preferred_cuisines_json] NVARCHAR(MAX) NULL,
        [meals_per_day_target] INT NULL,
        [medical_disclaimer_ack] BIT DEFAULT 0,
        [notes] NVARCHAR(MAX) NULL,
        [updated_at] DATETIME2 DEFAULT GETDATE()
      );
    END;

    IF COL_LENGTH('dbo.UserNutritionProfiles', 'age') IS NULL
      ALTER TABLE [dbo].[UserNutritionProfiles] ADD [age] INT NULL;
    IF COL_LENGTH('dbo.UserNutritionProfiles', 'sex') IS NULL
      ALTER TABLE [dbo].[UserNutritionProfiles] ADD [sex] NVARCHAR(20) NULL;
    IF COL_LENGTH('dbo.UserNutritionProfiles', 'height_cm') IS NULL
      ALTER TABLE [dbo].[UserNutritionProfiles] ADD [height_cm] FLOAT NULL;
    IF COL_LENGTH('dbo.UserNutritionProfiles', 'weight_kg') IS NULL
      ALTER TABLE [dbo].[UserNutritionProfiles] ADD [weight_kg] FLOAT NULL;
    IF COL_LENGTH('dbo.UserNutritionProfiles', 'activity_level') IS NULL
      ALTER TABLE [dbo].[UserNutritionProfiles] ADD [activity_level] NVARCHAR(50) NULL;
    IF COL_LENGTH('dbo.UserNutritionProfiles', 'preferred_cuisines_json') IS NULL
      ALTER TABLE [dbo].[UserNutritionProfiles] ADD [preferred_cuisines_json] NVARCHAR(MAX) NULL;
    IF COL_LENGTH('dbo.UserNutritionProfiles', 'meals_per_day_target') IS NULL
      ALTER TABLE [dbo].[UserNutritionProfiles] ADD [meals_per_day_target] INT NULL;
    IF COL_LENGTH('dbo.UserNutritionProfiles', 'medical_disclaimer_ack') IS NULL
      ALTER TABLE [dbo].[UserNutritionProfiles] ADD [medical_disclaimer_ack] BIT NOT NULL CONSTRAINT [DF_UserNutritionProfiles_MedicalDisclaimerAck] DEFAULT 0;

    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ChatSessions]') AND type in (N'U'))
    BEGIN
      CREATE TABLE [dbo].[ChatSessions] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [user_id] INT NOT NULL,
        [title] NVARCHAR(255) NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
      );
    END;

    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ChatMessages]') AND type in (N'U'))
    BEGIN
      CREATE TABLE [dbo].[ChatMessages] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [session_id] INT NOT NULL,
        [user_id] INT NOT NULL,
        [role] NVARCHAR(20) NOT NULL,
        [content] NVARCHAR(MAX) NOT NULL,
        [message_type] NVARCHAR(50) NULL,
        [sources_json] NVARCHAR(MAX) NULL,
        [retrieval_summary_json] NVARCHAR(MAX) NULL,
        [insights_json] NVARCHAR(MAX) NULL,
        [plan_json] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 DEFAULT GETDATE()
      );
    END;

    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[KnowledgeDocuments]') AND type in (N'U'))
    BEGIN
      CREATE TABLE KnowledgeDocuments (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [user_id] INT NOT NULL,
        [title] NVARCHAR(255) NOT NULL,
        [doc_type] NVARCHAR(100) NULL,
        [source_name] NVARCHAR(255) NULL,
        [content_text] NVARCHAR(MAX) NOT NULL,
        [chunks_json] NVARCHAR(MAX) NULL,
        [tags_json] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 DEFAULT GETDATE()
      );
    END

    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CoachMemories]') AND type in (N'U'))
    BEGIN
      CREATE TABLE CoachMemories (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [user_id] INT NOT NULL,
        [memory_type] NVARCHAR(100) NOT NULL,
        [title] NVARCHAR(255) NOT NULL,
        [summary] NVARCHAR(MAX) NOT NULL,
        [metadata_json] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
      );
    END;

  `);

  await req.query(`
    IF COL_LENGTH('ChatMessages', 'insights_json') IS NULL
      ALTER TABLE ChatMessages ADD [insights_json] NVARCHAR(MAX) NULL;
    IF COL_LENGTH('ChatMessages', 'plan_json') IS NULL
      ALTER TABLE ChatMessages ADD [plan_json] NVARCHAR(MAX) NULL;
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

async function getUserNutritionProfile(userId) {
  if (currentEngine === 'mssql' && mssqlPool) {
    const result = await mssqlPool.request()
      .input('user_id', sql.Int, userId)
      .query('SELECT TOP 1 * FROM UserNutritionProfiles WHERE user_id = @user_id');

    const row = result.recordset?.[0];
    if (!row) return null;

    return {
      age: row.age ?? null,
      sex: row.sex || null,
      height_cm: row.height_cm ?? null,
      weight_kg: row.weight_kg ?? null,
      activity_level: row.activity_level || null,
      goal_type: row.goal_type || null,
      dietary_style: row.dietary_style || null,
      allergies: row.allergies_json ? JSON.parse(row.allergies_json) : [],
      disliked_foods: row.disliked_foods_json ? JSON.parse(row.disliked_foods_json) : [],
      preferred_cuisines: row.preferred_cuisines_json ? JSON.parse(row.preferred_cuisines_json) : [],
      meals_per_day_target: row.meals_per_day_target ?? null,
      medical_disclaimer_ack: Boolean(row.medical_disclaimer_ack),
      notes: row.notes || '',
      updated_at: row.updated_at,
    };
  }

  const store = getLocalStore();
  return store.user_profiles?.[String(userId)] || null;
}

async function saveUserNutritionProfile(userId, profile) {
  const normalizedProfile = {
    age: Number.isFinite(Number(profile?.age)) ? Number(profile.age) : null,
    sex: profile?.sex ? String(profile.sex) : null,
    height_cm: Number.isFinite(Number(profile?.height_cm)) ? Number(profile.height_cm) : null,
    weight_kg: Number.isFinite(Number(profile?.weight_kg)) ? Number(profile.weight_kg) : null,
    activity_level: profile?.activity_level ? String(profile.activity_level) : null,
    goal_type: profile?.goal_type || null,
    dietary_style: profile?.dietary_style || null,
    allergies: Array.isArray(profile?.allergies) ? profile.allergies : [],
    disliked_foods: Array.isArray(profile?.disliked_foods) ? profile.disliked_foods : [],
    preferred_cuisines: Array.isArray(profile?.preferred_cuisines) ? profile.preferred_cuisines : [],
    meals_per_day_target: Number.isFinite(Number(profile?.meals_per_day_target)) ? Number(profile.meals_per_day_target) : null,
    medical_disclaimer_ack: Boolean(profile?.medical_disclaimer_ack),
    notes: profile?.notes || '',
    updated_at: new Date().toISOString(),
  };

  if (currentEngine === 'mssql' && mssqlPool) {
    await mssqlPool.request()
      .input('user_id', sql.Int, userId)
      .input('age', sql.Int, normalizedProfile.age)
      .input('sex', sql.NVarChar, normalizedProfile.sex)
      .input('height_cm', sql.Float, normalizedProfile.height_cm)
      .input('weight_kg', sql.Float, normalizedProfile.weight_kg)
      .input('activity_level', sql.NVarChar, normalizedProfile.activity_level)
      .input('goal_type', sql.NVarChar, normalizedProfile.goal_type)
      .input('dietary_style', sql.NVarChar, normalizedProfile.dietary_style)
      .input('allergies_json', sql.NVarChar, JSON.stringify(normalizedProfile.allergies))
      .input('disliked_foods_json', sql.NVarChar, JSON.stringify(normalizedProfile.disliked_foods))
      .input('preferred_cuisines_json', sql.NVarChar, JSON.stringify(normalizedProfile.preferred_cuisines))
      .input('meals_per_day_target', sql.Int, normalizedProfile.meals_per_day_target)
      .input('medical_disclaimer_ack', sql.Bit, normalizedProfile.medical_disclaimer_ack)
      .input('notes', sql.NVarChar, normalizedProfile.notes)
      .query(`
        IF EXISTS (SELECT 1 FROM UserNutritionProfiles WHERE user_id = @user_id)
          UPDATE UserNutritionProfiles
          SET age = @age,
              sex = @sex,
              height_cm = @height_cm,
              weight_kg = @weight_kg,
              activity_level = @activity_level,
              goal_type = @goal_type,
              dietary_style = @dietary_style,
              allergies_json = @allergies_json,
              disliked_foods_json = @disliked_foods_json,
              preferred_cuisines_json = @preferred_cuisines_json,
              meals_per_day_target = @meals_per_day_target,
              medical_disclaimer_ack = @medical_disclaimer_ack,
              notes = @notes,
              updated_at = GETDATE()
          WHERE user_id = @user_id
        ELSE
          INSERT INTO UserNutritionProfiles (user_id, age, sex, height_cm, weight_kg, activity_level, goal_type, dietary_style, allergies_json, disliked_foods_json, preferred_cuisines_json, meals_per_day_target, medical_disclaimer_ack, notes)
          VALUES (@user_id, @age, @sex, @height_cm, @weight_kg, @activity_level, @goal_type, @dietary_style, @allergies_json, @disliked_foods_json, @preferred_cuisines_json, @meals_per_day_target, @medical_disclaimer_ack, @notes)
      `);

    return normalizedProfile;
  }

  const store = getLocalStore();
  store.user_profiles[String(userId)] = normalizedProfile;
  saveLocalStore(store);
  return normalizedProfile;
}

async function createChatSession(userId, title = 'New Coach Chat') {
  if (currentEngine === 'mssql' && mssqlPool) {
    const result = await mssqlPool.request()
      .input('user_id', sql.Int, userId)
      .input('title', sql.NVarChar, title)
      .query(`
        INSERT INTO ChatSessions (user_id, title)
        OUTPUT INSERTED.id, INSERTED.user_id, INSERTED.title, INSERTED.created_at, INSERTED.updated_at
        VALUES (@user_id, @title)
      `);
    return result.recordset[0];
  }

  const store = getLocalStore();
  const nextId = store.chat_sessions.reduce((max, session) => Math.max(max, Number(session.id) || 0), 0) + 1;
  const now = new Date().toISOString();
  const session = { id: nextId, user_id: userId, title, created_at: now, updated_at: now };
  store.chat_sessions.push(session);
  saveLocalStore(store);
  return session;
}

async function updateChatSessionTimestamp(userId, sessionId) {
  if (currentEngine === 'mssql' && mssqlPool) {
    await mssqlPool.request()
      .input('user_id', sql.Int, userId)
      .input('id', sql.Int, sessionId)
      .query('UPDATE ChatSessions SET updated_at = GETDATE() WHERE id = @id AND user_id = @user_id');
    return;
  }

  const store = getLocalStore();
  const session = store.chat_sessions.find((item) => String(item.id) === String(sessionId) && String(item.user_id) === String(userId));
  if (session) {
    session.updated_at = new Date().toISOString();
    saveLocalStore(store);
  }
}

async function getChatSessions(userId) {
  if (currentEngine === 'mssql' && mssqlPool) {
    const result = await mssqlPool.request()
      .input('user_id', sql.Int, userId)
      .query('SELECT * FROM ChatSessions WHERE user_id = @user_id ORDER BY updated_at DESC');
    return result.recordset || [];
  }

  const store = getLocalStore();
  return store.chat_sessions
    .filter((session) => String(session.user_id) === String(userId))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

async function getChatMessages(userId, sessionId, limit = 50) {
  if (currentEngine === 'mssql' && mssqlPool) {
    const result = await mssqlPool.request()
      .input('user_id', sql.Int, userId)
      .input('session_id', sql.Int, sessionId)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) * FROM ChatMessages
        WHERE user_id = @user_id AND session_id = @session_id
        ORDER BY created_at ASC
      `);

    return (result.recordset || []).map((message) => ({
      ...message,
      sources: message.sources_json ? JSON.parse(message.sources_json) : [],
      retrieval_summary: message.retrieval_summary_json ? JSON.parse(message.retrieval_summary_json) : null,
      insights: message.insights_json ? JSON.parse(message.insights_json) : [],
      plan: message.plan_json ? JSON.parse(message.plan_json) : null,
    }));
  }

  const store = getLocalStore();
  return store.chat_messages
    .filter((message) => String(message.user_id) === String(userId) && String(message.session_id) === String(sessionId))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-limit);
}

async function saveChatMessage({ sessionId, userId, role, content, messageType = null, sources = [], retrievalSummary = null }) {
  if (currentEngine === 'mssql' && mssqlPool) {
    const result = await mssqlPool.request()
      .input('session_id', sql.Int, sessionId)
      .input('user_id', sql.Int, userId)
      .input('role', sql.NVarChar, role)
      .input('content', sql.NVarChar, content)
      .input('message_type', sql.NVarChar, messageType)
      .input('sources_json', sql.NVarChar, JSON.stringify(sources || []))
      .input('retrieval_summary_json', sql.NVarChar, retrievalSummary ? JSON.stringify(retrievalSummary) : null)
      .input('insights_json', sql.NVarChar, JSON.stringify(arguments[0].insights || []))
      .input('plan_json', sql.NVarChar, arguments[0].plan ? JSON.stringify(arguments[0].plan) : null)
      .query(`
        INSERT INTO ChatMessages (session_id, user_id, role, content, message_type, sources_json, retrieval_summary_json, insights_json, plan_json)
        OUTPUT INSERTED.*
        VALUES (@session_id, @user_id, @role, @content, @message_type, @sources_json, @retrieval_summary_json, @insights_json, @plan_json)
      `);

    await updateChatSessionTimestamp(userId, sessionId);
    const message = result.recordset[0];
    return {
      ...message,
      sources,
      retrieval_summary: retrievalSummary,
      insights: arguments[0].insights || [],
      plan: arguments[0].plan || null,
    };
  }

  const store = getLocalStore();
  const nextId = store.chat_messages.reduce((max, message) => Math.max(max, Number(message.id) || 0), 0) + 1;
  const createdAt = new Date().toISOString();
  const message = {
    id: nextId,
    session_id: sessionId,
    user_id: userId,
    role,
    content,
    message_type: messageType,
    sources,
    retrieval_summary: retrievalSummary,
    insights: arguments[0].insights || [],
    plan: arguments[0].plan || null,
    created_at: createdAt,
  };
  store.chat_messages.push(message);
  const session = store.chat_sessions.find((item) => String(item.id) === String(sessionId) && String(item.user_id) === String(userId));
  if (session) {
    session.updated_at = createdAt;
  }
  saveLocalStore(store);
  return message;
}

async function saveKnowledgeDocument({ userId, title, docType = 'note', sourceName = null, contentText = '', chunks = [], tags = [] }) {
  if (currentEngine === 'mssql' && mssqlPool) {
    const result = await mssqlPool.request()
      .input('user_id', sql.Int, userId)
      .input('title', sql.NVarChar, title)
      .input('doc_type', sql.NVarChar, docType)
      .input('source_name', sql.NVarChar, sourceName)
      .input('content_text', sql.NVarChar, contentText)
      .input('chunks_json', sql.NVarChar, JSON.stringify(chunks || []))
      .input('tags_json', sql.NVarChar, JSON.stringify(tags || []))
      .query(`
        INSERT INTO KnowledgeDocuments (user_id, title, doc_type, source_name, content_text, chunks_json, tags_json)
        OUTPUT INSERTED.*
        VALUES (@user_id, @title, @doc_type, @source_name, @content_text, @chunks_json, @tags_json)
      `);

    const row = result.recordset[0];
    return {
      ...row,
      chunks,
      tags,
    };
  }

  const store = getLocalStore();
  const nextId = store.knowledge_documents.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  const document = {
    id: nextId,
    user_id: userId,
    title,
    doc_type: docType,
    source_name: sourceName,
    content_text: contentText,
    chunks,
    tags,
    created_at: new Date().toISOString(),
  };
  store.knowledge_documents.push(document);
  saveLocalStore(store);
  return document;
}

async function getKnowledgeDocuments(userId) {
  if (currentEngine === 'mssql' && mssqlPool) {
    const result = await mssqlPool.request()
      .input('user_id', sql.Int, userId)
      .query('SELECT * FROM KnowledgeDocuments WHERE user_id = @user_id ORDER BY created_at DESC');

    return (result.recordset || []).map((item) => ({
      ...item,
      chunks: item.chunks_json ? JSON.parse(item.chunks_json) : [],
      tags: item.tags_json ? JSON.parse(item.tags_json) : [],
    }));
  }

  const store = getLocalStore();
  return store.knowledge_documents
    .filter((item) => String(item.user_id) === String(userId))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

async function saveCoachMemory({ userId, memoryType, title, summary, metadata = {} }) {
  if (currentEngine === 'mssql' && mssqlPool) {
    const existing = await mssqlPool.request()
      .input('user_id', sql.Int, userId)
      .input('memory_type', sql.NVarChar, memoryType)
      .input('title', sql.NVarChar, title)
      .query('SELECT TOP 1 * FROM CoachMemories WHERE user_id = @user_id AND memory_type = @memory_type AND title = @title ORDER BY updated_at DESC');

    if (existing.recordset?.[0]) {
      const updated = await mssqlPool.request()
        .input('id', sql.Int, existing.recordset[0].id)
        .input('summary', sql.NVarChar, summary)
        .input('metadata_json', sql.NVarChar, JSON.stringify(metadata || {}))
        .query(`
          UPDATE CoachMemories
          SET summary = @summary, metadata_json = @metadata_json, updated_at = GETDATE()
          OUTPUT INSERTED.*
          WHERE id = @id
        `);
      return {
        ...updated.recordset[0],
        metadata,
      };
    }

    const inserted = await mssqlPool.request()
      .input('user_id', sql.Int, userId)
      .input('memory_type', sql.NVarChar, memoryType)
      .input('title', sql.NVarChar, title)
      .input('summary', sql.NVarChar, summary)
      .input('metadata_json', sql.NVarChar, JSON.stringify(metadata || {}))
      .query(`
        INSERT INTO CoachMemories (user_id, memory_type, title, summary, metadata_json)
        OUTPUT INSERTED.*
        VALUES (@user_id, @memory_type, @title, @summary, @metadata_json)
      `);

    return {
      ...inserted.recordset[0],
      metadata,
    };
  }

  const store = getLocalStore();
  const existingIndex = store.coach_memories.findIndex((item) => String(item.user_id) === String(userId) && item.memory_type === memoryType && item.title === title);
  const timestamp = new Date().toISOString();

  if (existingIndex >= 0) {
    store.coach_memories[existingIndex] = {
      ...store.coach_memories[existingIndex],
      summary,
      metadata,
      updated_at: timestamp,
    };
    saveLocalStore(store);
    return store.coach_memories[existingIndex];
  }

  const nextId = store.coach_memories.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  const memory = {
    id: nextId,
    user_id: userId,
    memory_type: memoryType,
    title,
    summary,
    metadata,
    created_at: timestamp,
    updated_at: timestamp,
  };
  store.coach_memories.push(memory);
  saveLocalStore(store);
  return memory;
}

async function getCoachMemories(userId, limit = 10) {
  if (currentEngine === 'mssql' && mssqlPool) {
    const result = await mssqlPool.request()
      .input('user_id', sql.Int, userId)
      .input('limit', sql.Int, limit)
      .query('SELECT TOP (@limit) * FROM CoachMemories WHERE user_id = @user_id ORDER BY updated_at DESC');

    return (result.recordset || []).map((item) => ({
      ...item,
      metadata: item.metadata_json ? JSON.parse(item.metadata_json) : {},
    }));
  }

  const store = getLocalStore();
  return store.coach_memories
    .filter((item) => String(item.user_id) === String(userId))
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, limit);
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
  createChatSession,
  createUser,
  findUserByEmail,
  findUserByToken,
  getChatMessages,
  getChatSessions,
  getCoachMemories,
  getDbStatus,
  getDefaultGoals,
  getLocalStore,
  getKnowledgeDocuments,
  getUserNutritionProfile,
  getUserGoals,
  saveChatMessage,
  saveCoachMemory,
  saveKnowledgeDocument,
  saveLocalStore,
  saveUserNutritionProfile,
  saveUserGoals,
  updateUserToken,
  updateChatSessionTimestamp,
  getMssqlPool: () => mssqlPool,
  getEngine: () => currentEngine,
  getMssqlConfig: () => mssqlConfig,
};
