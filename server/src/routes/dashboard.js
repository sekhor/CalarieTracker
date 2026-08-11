const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { getMssqlPool, getLocalStore, getEngine } = require('../config/db');

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

    let meals = [];
    let goals = {
      daily_calorie_target: 2000,
      protein_target_g: 140,
      carbs_target_g: 225,
      fat_target_g: 65,
    };

    if (engine === 'mssql') {
      const pool = getMssqlPool();
      const mealsRes = await pool.request().query(`SELECT * FROM Meals ORDER BY logged_at DESC`);
      meals = mealsRes.recordset || [];

      const goalsRes = await pool.request().query(`SELECT setting_value FROM UserSettings WHERE setting_key = 'daily_goals'`);
      if (goalsRes.recordset && goalsRes.recordset.length > 0) {
        try {
          goals = { ...goals, ...JSON.parse(goalsRes.recordset[0].setting_value) };
        } catch (e) {}
      }
    } else {
      const store = getLocalStore();
      meals = store.meals || [];
      if (store.user_settings && store.user_settings.daily_goals) {
        goals = { ...goals, ...store.user_settings.daily_goals };
      }
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
      recent_meals: meals.slice(0, 5),
      engine,
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    return res.status(500).json({ error: 'Failed to compute dashboard metrics', details: err.message });
  }
});

module.exports = router;
