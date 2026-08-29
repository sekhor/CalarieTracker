const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { getMssqlPool, getLocalStore, getEngine, getUserGoals } = require('../config/db');
const { toMalaysiaDateKey, getMalaysiaWeekday } = require('../utils/datetime');

const DASHBOARD_MEAL_COLUMNS = `
  id, user_id, meal_name, meal_type, calories, protein_g, carbs_g, fat_g,
  image_url, image_mime_type, notes, logged_at, created_at,
  CASE WHEN image_data IS NOT NULL OR thumbnail_data IS NOT NULL THEN 1 ELSE 0 END AS has_image
`;

function toMealResponse(meal) {
  if (!meal) return meal;

  const normalizedMeal = { ...meal };
  const hasImageData = Boolean(normalizedMeal.image_data || normalizedMeal.has_image);

  if (hasImageData) {
    normalizedMeal.image_url = `/api/meals/${normalizedMeal.id}/photo`;
  }

  delete normalizedMeal.image_data;
  delete normalizedMeal.thumbnail_data;
  delete normalizedMeal.thumbnail_mime_type;
  delete normalizedMeal.has_image;
  return normalizedMeal;
}

// GET /api/dashboard/stats - summary analytics and metric metrics
router.get('/stats', async (req, res) => {
  try {
    const engine = getEngine();
    const todayStr = toMalaysiaDateKey(new Date());
    const userId = req.user.id;

    let meals = [];
    let recentMeals = [];
    let goals;

    if (engine === 'mssql') {
      const pool = getMssqlPool();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 8);

      const [resolvedGoals, mealsRes, recentMealsRes] = await Promise.all([
        getUserGoals(userId),
        pool.request()
          .input('user_id', sql.Int, userId)
          .input('cutoff', sql.DateTime2, cutoff)
          .query(`SELECT ${DASHBOARD_MEAL_COLUMNS} FROM Meals WHERE user_id = @user_id AND logged_at >= @cutoff ORDER BY logged_at DESC`),
        pool.request()
          .input('user_id', sql.Int, userId)
          .query(`SELECT TOP (5) ${DASHBOARD_MEAL_COLUMNS} FROM Meals WHERE user_id = @user_id ORDER BY logged_at DESC`),
      ]);
      goals = resolvedGoals;
      meals = mealsRes.recordset || [];
      recentMeals = recentMealsRes.recordset || [];
    } else {
      const store = getLocalStore();
      goals = await getUserGoals(userId);
      const userMeals = (store.meals || [])
        .filter((meal) => String(meal.user_id) === String(userId))
        .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 8);
      meals = userMeals.filter((meal) => new Date(meal.logged_at) >= cutoff);
      recentMeals = userMeals.slice(0, 5);
    }

    // Filter today's meals
    const todayMeals = meals.filter(m => {
      const mealDate = toMalaysiaDateKey(m.logged_at);
      return mealDate === todayStr;
    });

    const todayStats = todayMeals.reduce(
      (acc, m) => {
        acc.calories += Number(m.calories || 0);
        acc.protein += Number(m.protein_g || 0);
        acc.carbs += Number(m.carbs_g || 0);
        acc.fat += Number(m.fat_g || 0);
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Calculate Last 7 Days Calorie Intake Array
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayFormatted = toMalaysiaDateKey(d);
      const dayName = getMalaysiaWeekday(d);

      const dayMeals = meals.filter(m => toMalaysiaDateKey(m.logged_at) === dayFormatted);
      const dayCalories = dayMeals.reduce((sum, m) => sum + Number(m.calories || 0), 0);
      const dayProtein = dayMeals.reduce((sum, m) => sum + Number(m.protein_g || 0), 0);
      const dayCarbs = dayMeals.reduce((sum, m) => sum + Number(m.carbs_g || 0), 0);
      const dayFat = dayMeals.reduce((sum, m) => sum + Number(m.fat_g || 0), 0);

      last7Days.push({
        date: dayFormatted,
        day: dayName,
        calories: dayCalories,
        target: goals.daily_calorie_target,
        protein: dayProtein,
        carbs: dayCarbs,
        fat: dayFat,
      });
    }

    // Meal Type Distribution for Today / Total
    const categoryBreakdown = {
      Breakfast: { count: 0, calories: 0 },
      Lunch: { count: 0, calories: 0 },
      Dinner: { count: 0, calories: 0 },
      Snack: { count: 0, calories: 0 },
    };

    todayMeals.forEach(m => {
      const type = m.meal_type || 'Lunch';
      if (categoryBreakdown[type]) {
        categoryBreakdown[type].count += 1;
        categoryBreakdown[type].calories += Number(m.calories || 0);
      }
    });

    const categoryData = Object.keys(categoryBreakdown).map(type => ({
      name: type,
      value: categoryBreakdown[type].calories,
      count: categoryBreakdown[type].count,
    }));

    return res.json({
      today: {
        calories: todayStats.calories,
        protein_g: Math.round(todayStats.protein * 10) / 10,
        carbs_g: Math.round(todayStats.carbs * 10) / 10,
        fat_g: Math.round(todayStats.fat * 10) / 10,
        meal_count: todayMeals.length,
      },
      goals,
      weekly_trend: last7Days,
      category_breakdown: categoryData,
      recent_meals: recentMeals.map(toMealResponse),
      engine,
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    return res.status(500).json({ error: 'Failed to compute dashboard metrics', details: err.message });
  }
});

module.exports = router;
