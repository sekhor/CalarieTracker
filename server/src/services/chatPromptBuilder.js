function formatMeals(meals = []) {
  if (!meals.length) return '- No meals logged in this range.';

  return meals
    .slice(0, 8)
    .map((meal, index) => `${index + 1}. ${meal.meal_type}: ${meal.meal_name} — ${meal.calories || 0} kcal, P:${meal.protein_g || 0}g C:${meal.carbs_g || 0}g F:${meal.fat_g || 0}g`)
    .join('\n');
}

function buildPromptMessages({ message, context, history }) {
  const goals = context.goals || {};
  const profile = context.profile || {};
  const today = context.today || {};
  const weekly = context.weekly || {};
  const patterns = context.patterns || {};
  const insights = context.insights || [];
  const recentHistory = (history || []).slice(-6).map((item) => ({ role: item.role, content: item.content }));

  const systemContent = `You are a nutrition coaching assistant inside a calorie tracking app. Use only the provided user data as factual history. Do not invent meals, trends, or exact numbers. If data is missing, say that clearly. Give practical, concise, supportive advice. Do not provide medical diagnosis or dangerous restriction advice. Calorie and macro values may be estimates.`;

  const userContent = `User question:\n${message}\n\nUser goals:\n- calorie target: ${goals.daily_calorie_target || 0}\n- protein target: ${goals.protein_target_g || 0}g\n- carbs target: ${goals.carbs_target_g || 0}g\n- fat target: ${goals.fat_target_g || 0}g\n\nProfile:\n- age: ${profile.age ?? 'not set'}\n- sex: ${profile.sex || 'not set'}\n- height: ${profile.height_cm ?? 'not set'} cm\n- weight: ${profile.weight_kg ?? 'not set'} kg\n- activity level: ${profile.activity_level || 'not set'}\n- goal type: ${profile.goal_type || 'not set'}\n- dietary style: ${profile.dietary_style || 'not set'}\n- allergies: ${(profile.allergies || []).join(', ') || 'none recorded'}\n- disliked foods: ${(profile.disliked_foods || []).join(', ') || 'none recorded'}\n- preferred cuisines: ${(profile.preferred_cuisines || []).join(', ') || 'none recorded'}\n- meals per day target: ${profile.meals_per_day_target ?? 'not set'}\n- notes: ${profile.notes || 'none'}\n\nToday summary:\n- calories: ${today.calories || 0}\n- protein: ${today.protein_g || 0}g\n- carbs: ${today.carbs_g || 0}g\n- fat: ${today.fat_g || 0}g\n\nToday's meals:\n${formatMeals(today.meals)}\n\nLast 7 days:\n- average calories: ${weekly.avg_calories || 0}\n- average protein: ${weekly.avg_protein_g || 0}g\n- days logged: ${weekly.days_logged || 0}\n- highest calorie meal type: ${patterns.highest_calorie_meal_type || 'unknown'}\n- lowest protein meal type: ${patterns.lowest_protein_meal_type || 'unknown'}\n\nTop calorie meals:\n${formatMeals(patterns.top_calorie_meals || [])}\n\nGenerated insights:\n${insights.length ? insights.map((insight, index) => `${index + 1}. ${insight.title}: ${insight.summary} Recommendation: ${insight.recommendation}`).join('\n') : '- No proactive insights generated.'}\n\nInstructions:\n- Answer directly first.\n- Reference the user's data briefly.\n- Respect profile restrictions and preferences in any meal suggestion.\n- Provide 2-3 actionable suggestions if appropriate.\n- Keep the response concise.`;

  return [
    { role: 'system', content: systemContent },
    ...recentHistory,
    { role: 'user', content: userContent },
  ];
}

module.exports = {
  buildPromptMessages,
};