function classifyMessage(message = '') {
  const text = String(message || '').toLowerCase();

  let intent = 'general_nutrition_coaching';
  let dateRange = 'last_7_days';
  let requestedMetric = null;
  let needsRecommendation = false;
  let focusArea = null;

  if (/today|tonight|so far/.test(text)) {
    dateRange = 'today';
  } else if (/week|weekly|last 7/.test(text)) {
    dateRange = 'last_7_days';
  } else if (/month|last 30/.test(text)) {
    dateRange = 'last_30_days';
  }

  if (/protein/.test(text)) requestedMetric = 'protein';
  else if (/carb/.test(text)) requestedMetric = 'carbs';
  else if (/fat\b|fats\b/.test(text)) requestedMetric = 'fat';
  else if (/calorie|kcal/.test(text)) requestedMetric = 'calories';

  if (/snack/.test(text)) focusArea = 'snacks';
  else if (/breakfast/.test(text)) focusArea = 'breakfast';
  else if (/lunch/.test(text)) focusArea = 'lunch';
  else if (/dinner|tonight/.test(text)) focusArea = 'dinner';
  else if (/meal/.test(text)) focusArea = 'meal';

  if (/do i snack too much|snack too much|too many snacks/.test(text)) {
    intent = 'habit_analysis';
    focusArea = 'snacks';
  } else if (/what should i eat|suggest|recommend|dinner|lunch|breakfast|snack/.test(text)) {
    intent = 'meal_recommendation';
    needsRecommendation = true;
  } else if (/why am i going over|why do i go over|overeating|over calories|too many calories/.test(text)) {
    intent = 'goal_adherence';
    requestedMetric = requestedMetric || 'calories';
    focusArea = focusArea || 'calorie_overage';
  } else if (/what should i improve|what can i improve|improve/.test(text)) {
    intent = 'habit_analysis';
  } else if (/why|pattern|habit|always/.test(text)) {
    intent = 'habit_analysis';
  } else if (/how am i doing|summarize|summary|review/.test(text)) {
    intent = dateRange === 'today' ? 'daily_summary' : 'weekly_summary';
  } else if (/hit|target|goal|over|under/.test(text) || requestedMetric) {
    intent = requestedMetric === 'protein' || requestedMetric === 'carbs' || requestedMetric === 'fat'
      ? 'macro_gap_analysis'
      : 'goal_adherence';
  }

  return {
    intent,
    dateRange,
    requestedMetric,
    needsRecommendation,
    focusArea,
    confidence: 0.78,
  };
}

module.exports = {
  classifyMessage,
};