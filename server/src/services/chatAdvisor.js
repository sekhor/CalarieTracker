const { sendNutritionChat } = require('./azureChat');
const { classifyMessage } = require('./chatClassifier');
const { appendMessage, ensureSession, listMessages } = require('./chatHistory');
const { buildPromptMessages } = require('./chatPromptBuilder');
const { getStructuredContext } = require('./chatRetrieval');
const { buildSafetyReply, evaluateMessageRisk, shouldRefuse } = require('./chatSafety');

function asMealLabel(meal) {
  if (!meal?.meal_name) return 'your recent meals';
  return `${meal.meal_name}${meal.meal_type ? ` (${meal.meal_type})` : ''}`;
}

function buildMetricReply(metric, summary, patterns) {
  if (metric === 'protein') {
    return `Your protein intake is the clearest gap right now. Today you are at ${summary.today_protein_g}g versus a target of ${summary.protein_target_g}g, and your 7-day average is ${summary.avg_daily_protein_7d}g. The weakest meal type is usually ${patterns.lowest_protein_meal_type}, so the most effective fix is to add a reliable lean protein there.`;
  }

  if (metric === 'carbs') {
    return `Your carbs today are ${summary.today_carbs_g}g versus a target of ${summary.carbs_target_g}g, and your 7-day average is ${summary.avg_daily_carbs_7d}g. If your energy feels inconsistent, look at ${patterns.most_frequent_meal_type} first and keep carbs more intentional around that meal.`;
  }

  if (metric === 'fat') {
    return `Your fat intake today is ${summary.today_fat_g}g against a target of ${summary.fat_target_g}g, with a 7-day average of ${summary.avg_daily_fat_7d}g. Since ${patterns.highest_calorie_meal_type} is your densest meal type, checking oils, dressings, fried foods, and extras there would likely help most.`;
  }

  return `Today you are at ${summary.today_calories} calories against a ${summary.goal_calories} calorie goal, and your 7-day average is ${summary.avg_daily_calories_7d}. Your highest-calorie meal type is usually ${patterns.highest_calorie_meal_type}, so that is the first place I would tighten portions or calorie-dense add-ons.`;
}

function buildFallbackReply(message, classification, context) {
  const lowerMessage = String(message || '').toLowerCase();
  const { retrievalSummary, patterns, today, weekly } = context;
  const topMeal = patterns.today_top_meal || patterns.top_calorie_meals?.[0] || null;
  const lowProteinMeal = patterns.lowest_protein_recent_meal || null;

  if (classification.intent === 'daily_summary') {
    return `Today you are at ${retrievalSummary.today_calories} of ${retrievalSummary.goal_calories} calories, with ${retrievalSummary.today_protein_g}g protein, ${retrievalSummary.today_carbs_g}g carbs, and ${retrievalSummary.today_fat_g}g fat. ${topMeal ? `Your biggest meal so far is ${asMealLabel(topMeal)} at about ${topMeal.calories || 0} kcal. ` : ''}You still have about ${Math.max(0, retrievalSummary.remaining_calories)} calories and ${Math.max(0, retrievalSummary.remaining_protein_g)}g protein left if you want to stay near target.`;
  }

  if (classification.intent === 'weekly_summary') {
    return `Over the last 7 days, you have averaged ${retrievalSummary.avg_daily_calories_7d} calories and ${retrievalSummary.avg_daily_protein_7d}g protein per day across ${weekly.days_logged} logged days. Your most frequent meal type is ${patterns.most_frequent_meal_type}, your highest-calorie meal type is ${patterns.highest_calorie_meal_type}, and your lowest-protein meal type is ${patterns.lowest_protein_meal_type}. The cleanest improvement would be to keep ${patterns.highest_calorie_meal_type.toLowerCase()} a little lighter and make ${patterns.lowest_protein_meal_type.toLowerCase()} more protein-forward.`;
  }

  if (classification.intent === 'macro_gap_analysis') {
    return buildMetricReply(classification.requestedMetric, retrievalSummary, patterns);
  }

  if (classification.intent === 'goal_adherence') {
    if (retrievalSummary.calorie_balance > 0) {
      return `You are currently ${retrievalSummary.calorie_balance} calories over your daily target today. The main pressure point looks like ${patterns.highest_calorie_meal_type}, and ${topMeal ? `${asMealLabel(topMeal)} is one of the bigger calorie contributors. ` : ''}A practical fix is to reduce calorie-dense extras in that meal type and protect protein so you stay fuller.`;
    }

    return `Right now you are still within your calorie target window, with about ${retrievalSummary.remaining_calories} calories remaining. To stay on track, keep your next meal moderate and continue prioritizing protein, since your biggest consistent gap is usually around ${patterns.lowest_protein_meal_type}.`;
  }

  if (classification.intent === 'habit_analysis') {
    if (classification.focusArea === 'snacks' || /snack/.test(lowerMessage)) {
      return `You logged ${retrievalSummary.snack_count_7d} snacks over the last 7 days, averaging about ${retrievalSummary.snack_avg_calories_7d} calories each. That does not automatically mean snacking is a problem, but if calories are drifting up, snacks are worth auditing first—especially if they are low in protein and easy to overeat.`;
    }

    return `Your current pattern suggests ${patterns.highest_calorie_meal_type} tends to be your heaviest meal type, while ${patterns.lowest_protein_meal_type} tends to be the weakest for protein. You also average about ${retrievalSummary.average_meals_per_day_7d} eating occasions per day. ${lowProteinMeal ? `A good example is ${asMealLabel(lowProteinMeal)}, which was relatively low in protein. ` : ''}If you want faster progress, tighten the highest-calorie meal type first and make the lower-protein meals more structured.`;
  }

  if (classification.intent === 'meal_recommendation') {
    const mealFocus = classification.focusArea || 'next meal';
    const calorieTarget = Math.max(300, Math.min(650, retrievalSummary.remaining_calories || 500));
    return `For ${mealFocus}, I would aim for roughly ${calorieTarget} calories and prioritize protein because you still have about ${Math.max(0, retrievalSummary.remaining_protein_g)}g protein left to target today. A strong template would be lean protein + vegetables + one controlled carb source. Since ${patterns.highest_calorie_meal_type.toLowerCase()} is usually your highest-calorie meal type, keep sauces, oils, and extras simple.`;
  }

  return `Today you are at ${retrievalSummary.today_calories} calories out of a ${retrievalSummary.goal_calories} calorie goal, and over the last 7 days you have averaged ${retrievalSummary.avg_daily_calories_7d} calories. Your main pattern is that ${patterns.highest_calorie_meal_type} runs highest in calories while ${patterns.lowest_protein_meal_type} tends to lag in protein. The best next step depends on your question, but the two highest-value changes are trimming calorie-dense extras and making lower-protein meals more filling.`;
}

async function handleChatMessage({ userId, sessionId, message }) {
  const classification = classifyMessage(message);
  const riskFlags = evaluateMessageRisk(message);
  const session = await ensureSession(userId, sessionId, 'Nutrition Coach');

  await appendMessage({
    sessionId: session.id,
    userId,
    role: 'user',
    content: message,
    messageType: 'question',
  });

  if (shouldRefuse(riskFlags)) {
    const refusal = buildSafetyReply();
    await appendMessage({
      sessionId: session.id,
      userId,
      role: 'assistant',
      content: refusal,
      messageType: 'safety_refusal',
      sources: [],
      retrievalSummary: null,
    });

    return {
      session_id: session.id,
      intent: 'safety_refusal',
      reply: refusal,
      sources: [],
      retrieval_summary: null,
      safety: { medical_disclaimer: false, estimate_disclaimer: false },
    };
  }

  const history = await listMessages(userId, session.id, 12);
  const context = await getStructuredContext({ userId, classification, message });
  const promptMessages = buildPromptMessages({ message, context, history });

  let reply = '';
  let usedFallback = false;
  let fallbackReason = null;

  try {
    const completion = await sendNutritionChat({ messages: promptMessages });
    if (completion.is_simulated || !completion.content) {
      fallbackReason = completion.simulation_reason || 'azure_empty_response';
      reply = buildFallbackReply(message, classification, context);
      usedFallback = true;
    } else {
      reply = completion.content;
    }
  } catch (error) {
    fallbackReason = error.response?.data?.error?.message || error.message || 'azure_request_failed';
    console.warn('Nutrition Coach Azure chat fallback:', fallbackReason);
    reply = buildFallbackReply(message, classification, context);
    usedFallback = true;
  }

  await appendMessage({
    sessionId: session.id,
    userId,
    role: 'assistant',
    content: reply,
    messageType: classification.intent,
    sources: context.sources,
    retrievalSummary: context.retrievalSummary,
  });

  return {
    session_id: session.id,
    intent: classification.intent,
    reply,
    sources: context.sources,
    retrieval_summary: context.retrievalSummary,
    response_mode: usedFallback ? 'fallback' : 'azure',
    fallback_reason: fallbackReason,
    safety: {
      medical_disclaimer: /diagnose|medical/.test(String(message || '').toLowerCase()),
      estimate_disclaimer: usedFallback,
    },
  };
}

module.exports = {
  handleChatMessage,
};