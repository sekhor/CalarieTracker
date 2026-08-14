const { getCoachMemories, saveCoachMemory } = require('../config/db');

function buildMemoryCandidates({ profile, insights, retrievalSummary }) {
  const memories = [];

  if (profile?.goal_type) {
    memories.push({
      memoryType: 'profile_goal',
      title: 'Primary goal',
      summary: `User is currently focused on ${profile.goal_type.replace(/_/g, ' ')}.`,
      metadata: { goal_type: profile.goal_type },
    });
  }

  if (profile?.dietary_style || (profile?.allergies || []).length || (profile?.disliked_foods || []).length) {
    memories.push({
      memoryType: 'food_preferences',
      title: 'Food preferences and restrictions',
      summary: `Dietary style: ${profile?.dietary_style || 'not set'}. Allergies: ${(profile?.allergies || []).join(', ') || 'none'}. Disliked foods: ${(profile?.disliked_foods || []).join(', ') || 'none'}.`,
      metadata: {
        dietary_style: profile?.dietary_style || null,
        allergies: profile?.allergies || [],
        disliked_foods: profile?.disliked_foods || [],
      },
    });
  }

  if ((insights || []).length > 0) {
    const topInsight = insights[0];
    memories.push({
      memoryType: 'recent_pattern',
      title: 'Recent coaching pattern',
      summary: `${topInsight.title}: ${topInsight.summary}`,
      metadata: { insight_id: topInsight.id, priority: topInsight.priority },
    });
  }

  if (retrievalSummary?.remaining_protein_g > 20) {
    memories.push({
      memoryType: 'macro_focus',
      title: 'Protein support needed',
      summary: `User frequently has a meaningful protein gap; remaining protein today is ${retrievalSummary.remaining_protein_g}g.`,
      metadata: { remaining_protein_g: retrievalSummary.remaining_protein_g },
    });
  }

  return memories;
}

async function updateCoachMemories({ userId, context }) {
  const candidates = buildMemoryCandidates({
    profile: context.profile,
    insights: context.insights,
    retrievalSummary: context.retrievalSummary,
  });

  const saved = [];
  for (const memory of candidates) {
    // eslint-disable-next-line no-await-in-loop
    saved.push(await saveCoachMemory({ userId, ...memory }));
  }
  return saved;
}

async function getRelevantCoachMemories(userId, limit = 5) {
  return getCoachMemories(userId, limit);
}

module.exports = {
  getRelevantCoachMemories,
  updateCoachMemories,
};