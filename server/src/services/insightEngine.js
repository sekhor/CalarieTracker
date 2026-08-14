const { getStructuredContext } = require('./chatRetrieval');

function toTitleCase(value = '') {
  return String(value || '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function generateInsightsFromContext(context) {
  const retrievalSummary = context?.retrievalSummary || {};
  const patterns = context?.patterns || {};
  const weekly = context?.weekly || {};
  const profile = context?.profile || {};
  const insights = [];

  if ((weekly.days_logged || 0) > 0) {
    const aboveGoal = (retrievalSummary.avg_daily_calories_7d || 0) > (retrievalSummary.goal_calories || 0);
    insights.push({
      id: 'calorie-trend',
      type: 'trend_alert',
      title: 'Weekly calorie trend',
      summary: `You averaged ${retrievalSummary.avg_daily_calories_7d || 0} kcal over the last 7 days against a ${retrievalSummary.goal_calories || 0} kcal goal.`,
      evidence: [
        `Logged days: ${weekly.days_logged || 0}`,
        `Highest calorie meal type: ${patterns.highest_calorie_meal_type || 'Unknown'}`,
        `Average meals per day: ${patterns.average_meals_per_day || 0}`,
      ],
      recommendation: aboveGoal
        ? `Focus first on ${String(patterns.highest_calorie_meal_type || 'dinner').toLowerCase()} portions and calorie-dense extras.`
        : 'You are close to target overall—keep portions consistent and protect your current routine.',
      priority: aboveGoal ? 'high' : 'medium',
      tag: 'calories',
    });
  }

  if ((retrievalSummary.avg_daily_protein_7d || 0) < (retrievalSummary.protein_target_g || 0)) {
    insights.push({
      id: 'protein-gap',
      type: 'macro_gap',
      title: 'Protein pattern needs support',
      summary: `Your 7-day average protein is ${retrievalSummary.avg_daily_protein_7d || 0}g versus a ${retrievalSummary.protein_target_g || 0}g target.`,
      evidence: [
        `Lowest protein meal type: ${patterns.lowest_protein_meal_type || 'Unknown'}`,
        `Today protein: ${retrievalSummary.today_protein_g || 0}g`,
        `Remaining protein today: ${retrievalSummary.remaining_protein_g || 0}g`,
      ],
      recommendation: `Add a reliable protein anchor to ${String(patterns.lowest_protein_meal_type || 'your lowest-protein meal').toLowerCase()}, such as Greek yogurt, eggs, chicken, fish, tofu, or protein-rich dairy depending on your preferences.`,
      priority: 'high',
      tag: 'protein',
    });
  }

  if ((retrievalSummary.snack_count_7d || 0) >= 5) {
    insights.push({
      id: 'snack-pattern',
      type: 'habit_pattern',
      title: 'Snacking pattern is a meaningful driver',
      summary: `You logged ${retrievalSummary.snack_count_7d || 0} snacks in the last 7 days with an average of ${retrievalSummary.snack_avg_calories_7d || 0} kcal each.`,
      evidence: [
        `Most frequent meal type: ${patterns.most_frequent_meal_type || 'Unknown'}`,
        `Average meals per day: ${patterns.average_meals_per_day || 0}`,
      ],
      recommendation: 'Use one planned protein-forward snack and reduce unplanned grazing or high-calorie add-ons.',
      priority: 'medium',
      tag: 'habits',
    });
  }

  if (profile?.goal_type || profile?.dietary_style) {
    insights.push({
      id: 'profile-alignment',
      type: 'personalization',
      title: 'Coaching is personalized to your profile',
      summary: `Advice is now shaped around your ${profile.goal_type ? toTitleCase(profile.goal_type) : 'nutrition'} goal and ${profile.dietary_style ? toTitleCase(profile.dietary_style) : 'recorded'} eating style.`,
      evidence: [
        `Goal type: ${profile.goal_type || 'Not set'}`,
        `Dietary style: ${profile.dietary_style || 'Not set'}`,
        `Preferred cuisines: ${(profile.preferred_cuisines || []).join(', ') || 'None recorded'}`,
      ],
      recommendation: 'Keep your profile current so recommendations stay practical and aligned with your food preferences and constraints.',
      priority: 'low',
      tag: 'profile',
    });
  }

  return insights.slice(0, 4);
}

async function getUserInsights(userId) {
  const context = await getStructuredContext({
    userId,
    classification: { intent: 'weekly_summary', dateRange: 'last_7_days', requestedMetric: null },
    message: 'Generate weekly coaching insights.',
  });

  return {
    generated_at: new Date().toISOString(),
    insights: generateInsightsFromContext(context),
    retrieval_summary: context.retrievalSummary,
  };
}

module.exports = {
  generateInsightsFromContext,
  getUserInsights,
};