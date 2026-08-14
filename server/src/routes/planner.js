const express = require('express');
const { classifyMessage } = require('../services/chatClassifier');
const { getStructuredContext } = require('../services/chatRetrieval');
const { generateInsightsFromContext } = require('../services/insightEngine');
const { generateMealPlan } = require('../services/mealPlanner');

const router = express.Router();

router.post('/meal-plan', async (req, res) => {
  try {
    const message = String(req.body.message || 'Generate a guided meal plan.').trim();
    const classification = classifyMessage(message);
    const context = await getStructuredContext({ userId: req.user.id, classification, message });
    context.insights = generateInsightsFromContext(context);
    const plan = generateMealPlan({
      profile: context.profile,
      retrievalSummary: context.retrievalSummary,
      insights: context.insights,
    });

    return res.json({
      generated_at: new Date().toISOString(),
      plan,
      insights: context.insights,
      retrieval_summary: context.retrievalSummary,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate meal plan.', details: error.message });
  }
});

module.exports = router;