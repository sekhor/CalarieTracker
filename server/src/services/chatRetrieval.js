const { getEngine, getLocalStore, getMssqlPool, getUserGoals, getUserNutritionProfile } = require('../config/db');
const sql = require('mssql');
const { retrieveKnowledgeContext } = require('./knowledgeIngestion');
const { getRelevantCoachMemories } = require('./coachMemory');

function getDateKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function summarizeMeals(meals) {
  return meals.reduce((acc, meal) => {
    acc.calories += Number(meal.calories || 0);
    acc.protein_g += Number(meal.protein_g || 0);
    acc.carbs_g += Number(meal.carbs_g || 0);
    acc.fat_g += Number(meal.fat_g || 0);
    return acc;
  }, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
}

function averagePerDay(total, days) {
  if (!days) return 0;
  return Math.round((total / days) * 10) / 10;
}

async function getAllUserMeals(userId) {
  const engine = getEngine();
  if (engine === 'mssql') {
    const pool = getMssqlPool();
    const result = await pool.request()
      .input('user_id', sql.Int, userId)
      .query('SELECT * FROM Meals WHERE user_id = @user_id ORDER BY logged_at DESC');
    return result.recordset || [];
  }

  const store = getLocalStore();
  return (store.meals || []).filter((meal) => String(meal.user_id) === String(userId));
}

function getDateWindowMeals(meals, days) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return meals.filter((meal) => new Date(meal.logged_at) >= start);
}

async function getStructuredContext({ userId, classification, message = '' }) {
  const goals = await getUserGoals(userId);
  const profile = await getUserNutritionProfile(userId);
  const meals = await getAllUserMeals(userId);
  const todayKey = getDateKey(new Date());
  const todayMeals = meals.filter((meal) => getDateKey(meal.logged_at) === todayKey);
  const weeklyMeals = getDateWindowMeals(meals, 7);
  const recentMeals = meals.slice(0, 10);

  const todaySummary = summarizeMeals(todayMeals);
  const weeklySummary = summarizeMeals(weeklyMeals);
  const weeklyDays = [...new Set(weeklyMeals.map((meal) => getDateKey(meal.logged_at)))].length || 1;
  const avgCalories = Math.round(weeklySummary.calories / weeklyDays);
  const avgProtein = Math.round((weeklySummary.protein_g / weeklyDays) * 10) / 10;
  const avgCarbs = averagePerDay(weeklySummary.carbs_g, weeklyDays);
  const avgFat = averagePerDay(weeklySummary.fat_g, weeklyDays);

  const mealTypePatterns = ['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((type) => {
    const grouped = weeklyMeals.filter((meal) => meal.meal_type === type);
    return {
      type,
      count: grouped.length,
      total_calories: grouped.reduce((sum, meal) => sum + Number(meal.calories || 0), 0),
      avg_calories: grouped.length ? Math.round(grouped.reduce((sum, meal) => sum + Number(meal.calories || 0), 0) / grouped.length) : 0,
      avg_protein_g: grouped.length ? Math.round((grouped.reduce((sum, meal) => sum + Number(meal.protein_g || 0), 0) / grouped.length) * 10) / 10 : 0,
    };
  });

  const highestCalorieMealType = mealTypePatterns.slice().sort((a, b) => b.avg_calories - a.avg_calories)[0]?.type || 'Dinner';
  const lowestProteinMealType = mealTypePatterns.slice().sort((a, b) => a.avg_protein_g - b.avg_protein_g)[0]?.type || 'Breakfast';
  const mostFrequentMealType = mealTypePatterns.slice().sort((a, b) => b.count - a.count)[0]?.type || 'Dinner';
  const snackPattern = mealTypePatterns.find((item) => item.type === 'Snack') || { count: 0, avg_calories: 0, avg_protein_g: 0 };
  const topCalorieMeals = weeklyMeals
    .slice()
    .sort((a, b) => Number(b.calories || 0) - Number(a.calories || 0))
    .slice(0, 3)
    .map((meal) => ({
      meal_name: meal.meal_name,
      meal_type: meal.meal_type,
      calories: Number(meal.calories || 0),
      logged_at: meal.logged_at,
    }));
  const todayTopMeal = todayMeals.slice().sort((a, b) => Number(b.calories || 0) - Number(a.calories || 0))[0] || null;
  const lowestProteinRecentMeal = weeklyMeals.slice().sort((a, b) => Number(a.protein_g || 0) - Number(b.protein_g || 0))[0] || null;
  const mealsPerDayAverage = Math.round((weeklyMeals.length / weeklyDays) * 10) / 10;
  const calorieBalance = todaySummary.calories - goals.daily_calorie_target;

  const retrievalSummary = {
    today_calories: todaySummary.calories,
    goal_calories: goals.daily_calorie_target,
    remaining_calories: Math.max(0, goals.daily_calorie_target - todaySummary.calories),
    calorie_balance: calorieBalance,
    today_protein_g: Math.round(todaySummary.protein_g * 10) / 10,
    protein_target_g: goals.protein_target_g,
    remaining_protein_g: Math.max(0, Math.round((goals.protein_target_g - todaySummary.protein_g) * 10) / 10),
    today_carbs_g: Math.round(todaySummary.carbs_g * 10) / 10,
    carbs_target_g: goals.carbs_target_g,
    remaining_carbs_g: Math.round((goals.carbs_target_g - todaySummary.carbs_g) * 10) / 10,
    today_fat_g: Math.round(todaySummary.fat_g * 10) / 10,
    fat_target_g: goals.fat_target_g,
    remaining_fat_g: Math.round((goals.fat_target_g - todaySummary.fat_g) * 10) / 10,
    avg_daily_calories_7d: avgCalories,
    avg_daily_protein_7d: avgProtein,
    avg_daily_carbs_7d: avgCarbs,
    avg_daily_fat_7d: avgFat,
    highest_calorie_meal_type: highestCalorieMealType,
    lowest_protein_meal_type: lowestProteinMealType,
    most_frequent_meal_type: mostFrequentMealType,
    average_meals_per_day_7d: mealsPerDayAverage,
    snack_count_7d: snackPattern.count,
    snack_avg_calories_7d: snackPattern.avg_calories,
    profile_goal_type: profile?.goal_type || null,
    profile_dietary_style: profile?.dietary_style || null,
  };

  const knowledge = await retrieveKnowledgeContext({ userId, query: message, limit: 3 });
  const memories = await getRelevantCoachMemories(userId, 5);

  return {
    classification,
    goals,
    profile,
    today: {
      ...todaySummary,
      meals: todayMeals.slice().sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at)),
    },
    weekly: {
      meals: weeklyMeals,
      avg_calories: avgCalories,
      avg_protein_g: avgProtein,
      days_logged: weeklyDays,
    },
    recent_meals: recentMeals,
    patterns: {
      meal_type_patterns: mealTypePatterns,
      highest_calorie_meal_type: highestCalorieMealType,
      lowest_protein_meal_type: lowestProteinMealType,
      most_frequent_meal_type: mostFrequentMealType,
      snack_pattern: snackPattern,
      top_calorie_meals: topCalorieMeals,
      today_top_meal: todayTopMeal,
      lowest_protein_recent_meal: lowestProteinRecentMeal,
      average_meals_per_day: mealsPerDayAverage,
    },
    sources: [
      { type: 'goals', label: 'Daily Goals' },
      { type: 'today_meals', label: "Today's Meals" },
      { type: 'weekly_trend', label: 'Last 7 Days' },
      ...(profile ? [{ type: 'profile', label: 'Nutrition Profile' }] : []),
      ...((knowledge.matches || []).length ? [{ type: 'knowledge', label: 'Knowledge Notes' }] : []),
      ...(memories.length ? [{ type: 'memory', label: 'Coach Memory' }] : []),
    ],
    retrievalSummary,
    knowledge,
    memories,
  };
}

module.exports = {
  getStructuredContext,
};