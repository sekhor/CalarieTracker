const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { getMssqlPool, getLocalStore, saveLocalStore, getEngine } = require('../config/db');

function toMealResponse(meal) {
  if (!meal) return meal;

  const normalizedMeal = { ...meal };
  const hasImageData = Boolean(normalizedMeal.image_data);

  if (hasImageData) {
    normalizedMeal.image_url = `/api/meals/${normalizedMeal.id}/photo`;
  }

  delete normalizedMeal.image_data;
  return normalizedMeal;
}

// GET /api/meals - list all meals with filtering
router.get('/', async (req, res) => {
  try {
    const { search, meal_type, from_date, to_date, limit = 100 } = req.query;
    const engine = getEngine();
    const userId = req.user.id;

    if (engine === 'mssql') {
      const pool = getMssqlPool();
      let query = `SELECT TOP (@limit) * FROM Meals WHERE user_id = @user_id`;
      const request = pool.request();
      request.input('limit', sql.Int, parseInt(limit, 10));
      request.input('user_id', sql.Int, userId);

      if (search) {
        query += ` AND (meal_name LIKE @search OR notes LIKE @search)`;
        request.input('search', sql.NVarChar, `%${search}%`);
      }
      if (meal_type && meal_type !== 'All') {
        query += ` AND meal_type = @meal_type`;
        request.input('meal_type', sql.NVarChar, meal_type);
      }
      if (from_date) {
        query += ` AND logged_at >= @from_date`;
        request.input('from_date', sql.DateTime2, `${from_date}T00:00:00`);
      }
      if (to_date) {
        query += ` AND logged_at <= @to_date`;
        request.input('to_date', sql.DateTime2, `${to_date}T23:59:59`);
      }

      query += ` ORDER BY logged_at DESC`;
      const result = await request.query(query);
      return res.json({ meals: result.recordset.map(toMealResponse), engine: 'mssql' });
    } else {
      // Local Fallback
      const store = getLocalStore();
      let meals = [...store.meals].filter((meal) => String(meal.user_id) === String(userId));

      if (search) {
        const q = search.toLowerCase();
        meals = meals.filter(m => (m.meal_name && m.meal_name.toLowerCase().includes(q)) || (m.notes && m.notes.toLowerCase().includes(q)));
      }
      if (meal_type && meal_type !== 'All') {
        meals = meals.filter(m => m.meal_type === meal_type);
      }
      if (from_date) {
        meals = meals.filter(m => m.logged_at >= `${from_date}T00:00:00`);
      }
      if (to_date) {
        meals = meals.filter(m => m.logged_at <= `${to_date}T23:59:59`);
      }

      meals.sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
      meals = meals.slice(0, parseInt(limit, 10));

      return res.json({ meals: meals.map(toMealResponse), engine: 'local_fallback' });
    }
  } catch (err) {
    console.error('Error fetching meals:', err);
    return res.status(500).json({ error: 'Failed to fetch meals', details: err.message });
  }
});

// POST /api/meals - create a new meal
router.post('/', async (req, res) => {
  try {
    const {
      meal_name,
      meal_type = 'Lunch',
      calories = 0,
      protein_g = 0,
      carbs_g = 0,
      fat_g = 0,
      image_url = null,
      image_base64 = null,
      image_mime_type = null,
      notes = '',
      logged_at = new Date().toISOString(),
    } = req.body;

    let imageBuffer = null;
    let normalizedImageMimeType = image_mime_type || null;

    if (image_base64) {
      const mimeMatch = image_base64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      normalizedImageMimeType = normalizedImageMimeType || mimeMatch?.[1] || 'image/jpeg';
      imageBuffer = Buffer.from(image_base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, ''), 'base64');
    }

    if (!meal_name) {
      return res.status(400).json({ error: 'Meal name is required' });
    }

    const engine = getEngine();
    const userId = req.user.id;

    if (engine === 'mssql') {
      const pool = getMssqlPool();
      const result = await pool.request()
        .input('user_id', sql.Int, userId)
        .input('meal_name', sql.NVarChar, meal_name)
        .input('meal_type', sql.NVarChar, meal_type)
        .input('calories', sql.Int, parseInt(calories, 10))
        .input('protein_g', sql.Float, parseFloat(protein_g))
        .input('carbs_g', sql.Float, parseFloat(carbs_g))
        .input('fat_g', sql.Float, parseFloat(fat_g))
        .input('image_url', sql.NVarChar, image_url)
        .input('image_data', sql.VarBinary(sql.MAX), imageBuffer)
        .input('image_mime_type', sql.NVarChar, normalizedImageMimeType)
        .input('notes', sql.NVarChar, notes)
        .input('logged_at', sql.DateTime2, new Date(logged_at))
        .query(`
          INSERT INTO Meals (user_id, meal_name, meal_type, calories, protein_g, carbs_g, fat_g, image_url, image_data, image_mime_type, notes, logged_at)
          OUTPUT INSERTED.*
          VALUES (@user_id, @meal_name, @meal_type, @calories, @protein_g, @carbs_g, @fat_g, @image_url, @image_data, @image_mime_type, @notes, @logged_at)
        `);

      return res.status(201).json({ meal: toMealResponse(result.recordset[0]), engine: 'mssql' });
    } else {
      const store = getLocalStore();
      const newId = store.meals.length > 0 ? Math.max(...store.meals.map(m => m.id || 0)) + 1 : 1;
      
      const newMeal = {
        id: newId,
        user_id: userId,
        meal_name,
        meal_type,
        calories: parseInt(calories, 10),
        protein_g: parseFloat(protein_g),
        carbs_g: parseFloat(carbs_g),
        fat_g: parseFloat(fat_g),
        image_url,
        image_data: image_base64,
        image_mime_type: normalizedImageMimeType,
        notes,
        logged_at: new Date(logged_at).toISOString(),
        created_at: new Date().toISOString(),
      };

      store.meals.push(newMeal);
      saveLocalStore(store);

      return res.status(201).json({ meal: toMealResponse(newMeal), engine: 'local_fallback' });
    }
  } catch (err) {
    console.error('Error creating meal:', err);
    return res.status(500).json({ error: 'Failed to save meal record', details: err.message });
  }
});

// PUT /api/meals/:id - update existing meal
router.put('/:id', async (req, res) => {
  try {
    const mealId = req.params.id;
    const { meal_name, meal_type, calories, protein_g, carbs_g, fat_g, image_url, image_base64, image_mime_type, notes, logged_at } = req.body;
    const engine = getEngine();
    const userId = req.user.id;

    let imageBuffer;
    let normalizedImageMimeType = image_mime_type;
    if (image_base64 !== undefined && image_base64 !== null) {
      const mimeMatch = image_base64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      normalizedImageMimeType = normalizedImageMimeType || mimeMatch?.[1] || 'image/jpeg';
      imageBuffer = Buffer.from(image_base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, ''), 'base64');
    }

    if (engine === 'mssql') {
      const pool = getMssqlPool();
      const result = await pool.request()
        .input('id', sql.Int, parseInt(mealId, 10))
        .input('user_id', sql.Int, userId)
        .input('meal_name', sql.NVarChar, meal_name)
        .input('meal_type', sql.NVarChar, meal_type)
        .input('calories', sql.Int, parseInt(calories, 10))
        .input('protein_g', sql.Float, parseFloat(protein_g))
        .input('carbs_g', sql.Float, parseFloat(carbs_g))
        .input('fat_g', sql.Float, parseFloat(fat_g))
        .input('image_url', sql.NVarChar, image_url)
        .input('image_data', sql.VarBinary(sql.MAX), imageBuffer)
        .input('image_mime_type', sql.NVarChar, normalizedImageMimeType)
        .input('notes', sql.NVarChar, notes)
        .input('logged_at', sql.DateTime2, new Date(logged_at))
        .query(`
          UPDATE Meals
          SET meal_name = @meal_name, meal_type = @meal_type, calories = @calories,
              protein_g = @protein_g, carbs_g = @carbs_g, fat_g = @fat_g,
              image_url = @image_url,
              image_data = COALESCE(@image_data, image_data),
              image_mime_type = COALESCE(@image_mime_type, image_mime_type),
              notes = @notes, logged_at = @logged_at
          OUTPUT INSERTED.*
          WHERE id = @id AND user_id = @user_id
        `);

      if (!result.recordset || result.recordset.length === 0) {
        return res.status(404).json({ error: 'Meal record not found' });
      }
      return res.json({ meal: toMealResponse(result.recordset[0]), engine: 'mssql' });
    } else {
      const store = getLocalStore();
      const index = store.meals.findIndex(m => String(m.id) === String(mealId) && String(m.user_id) === String(userId));
      if (index === -1) {
        return res.status(404).json({ error: 'Meal record not found' });
      }

      store.meals[index] = {
        ...store.meals[index],
        meal_name: meal_name ?? store.meals[index].meal_name,
        meal_type: meal_type ?? store.meals[index].meal_type,
        calories: calories !== undefined ? parseInt(calories, 10) : store.meals[index].calories,
        protein_g: protein_g !== undefined ? parseFloat(protein_g) : store.meals[index].protein_g,
        carbs_g: carbs_g !== undefined ? parseFloat(carbs_g) : store.meals[index].carbs_g,
        fat_g: fat_g !== undefined ? parseFloat(fat_g) : store.meals[index].fat_g,
        image_url: image_url !== undefined ? image_url : store.meals[index].image_url,
        image_data: image_base64 !== undefined ? image_base64 : store.meals[index].image_data,
        image_mime_type: normalizedImageMimeType !== undefined ? normalizedImageMimeType : store.meals[index].image_mime_type,
        notes: notes !== undefined ? notes : store.meals[index].notes,
        logged_at: logged_at ? new Date(logged_at).toISOString() : store.meals[index].logged_at,
      };

      saveLocalStore(store);
      return res.json({ meal: toMealResponse(store.meals[index]), engine: 'local_fallback' });
    }
  } catch (err) {
    console.error('Error updating meal:', err);
    return res.status(500).json({ error: 'Failed to update meal', details: err.message });
  }
});

// DELETE /api/meals/:id - delete a meal record
router.delete('/:id', async (req, res) => {
  try {
    const mealId = req.params.id;
    const engine = getEngine();
    const userId = req.user.id;

    if (engine === 'mssql') {
      const pool = getMssqlPool();
      await pool.request()
        .input('id', sql.Int, parseInt(mealId, 10))
        .input('user_id', sql.Int, userId)
        .query(`DELETE FROM Meals WHERE id = @id AND user_id = @user_id`);

      return res.json({ message: 'Meal deleted successfully', id: mealId, engine: 'mssql' });
    } else {
      const store = getLocalStore();
      store.meals = store.meals.filter(m => !(String(m.id) === String(mealId) && String(m.user_id) === String(userId)));
      saveLocalStore(store);
      return res.json({ message: 'Meal deleted successfully', id: mealId, engine: 'local_fallback' });
    }
  } catch (err) {
    console.error('Error deleting meal:', err);
    return res.status(500).json({ error: 'Failed to delete meal', details: err.message });
  }
});

// GET /api/meals/:id/photo - get stored meal image from DB/local store
router.get('/:id/photo', async (req, res) => {
  try {
    const mealId = req.params.id;
    const engine = getEngine();
    const userId = req.user.id;

    if (engine === 'mssql') {
      const pool = getMssqlPool();
      const result = await pool.request()
        .input('id', sql.Int, parseInt(mealId, 10))
        .input('user_id', sql.Int, userId)
        .query(`SELECT id, image_data, image_mime_type FROM Meals WHERE id = @id AND user_id = @user_id`);

      const meal = result.recordset?.[0];
      if (!meal || !meal.image_data) {
        return res.status(404).json({ error: 'Meal image not found' });
      }

      res.setHeader('Content-Type', meal.image_mime_type || 'image/jpeg');
      return res.send(meal.image_data);
    }

    const store = getLocalStore();
    const meal = store.meals.find(m => String(m.id) === String(mealId) && String(m.user_id) === String(userId));
    if (!meal || !meal.image_data) {
      return res.status(404).json({ error: 'Meal image not found' });
    }

    const base64Payload = meal.image_data;
    const mimeMatch = base64Payload.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const mimeType = meal.image_mime_type || mimeMatch?.[1] || 'image/jpeg';
    const buffer = Buffer.from(base64Payload.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, ''), 'base64');

    res.setHeader('Content-Type', mimeType);
    return res.send(buffer);
  } catch (err) {
    console.error('Error fetching meal image:', err);
    return res.status(500).json({ error: 'Failed to fetch meal image', details: err.message });
  }
});

module.exports = router;
