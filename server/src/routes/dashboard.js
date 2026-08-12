const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { getMssqlPool, getLocalStore, getEngine, getUserGoals } = require('../config/db');

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

// Helper to format Date as YYYY-MM-DD
function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/dashboard/stats - summary analytics and metric metrics
router.get('/stats', async (req, res) => {
  try {
    const engine = getEngine();
    const todayStr = formatDate(new Date());
    const userId = req.user.id;

    let meals = [];
    let goals = await getUserGoals(userId);

    if (engine === 'mssql') {
      const pool = getMssqlPool();
      const mealsRes = await pool.request()
        .input('user_id', sql.Int, userId)
        .query(`SELECT * FROM Meals WHERE user_id = @user_id ORDER BY logged_at DESC`);
      meals = mealsRes.recordset || [];
    } else {
      const store = getLocalStore();
      meals = (store.meals || []).filter((meal) => String(meal.user_id) === String(userId));
    }

    // Filter today's meals
    const todayMeals = meals.filter(m => {
      const mealDate = formatDate(new Date(m.logged_at));
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
      const dayFormatted = formatDate(d);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayMeals = meals.filter(m => formatDate(new Date(m.logged_at)) === dayFormatted);
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
      recent_meals: meals.slice(0, 5).map(toMealResponse),
      engine,
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    return res.status(500).json({ error: 'Failed to compute dashboard metrics', details: err.message });
  }
});

module.exports = router;
