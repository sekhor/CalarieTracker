const express = require('express');
const { getUserNutritionProfile, saveUserNutritionProfile, getUserGoals, saveUserGoals } = require('../config/db');

const router = express.Router();

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeProfilePayload(body = {}) {
  return {
    age: body.age === '' || body.age == null ? null : Number(body.age),
    sex: body.sex ? String(body.sex).trim() : null,
    height_cm: body.height_cm === '' || body.height_cm == null ? null : Number(body.height_cm),
    weight_kg: body.weight_kg === '' || body.weight_kg == null ? null : Number(body.weight_kg),
    activity_level: body.activity_level ? String(body.activity_level).trim() : null,
    goal_type: body.goal_type ? String(body.goal_type).trim() : null,
    dietary_style: body.dietary_style ? String(body.dietary_style).trim() : null,
    allergies: normalizeList(body.allergies),
    disliked_foods: normalizeList(body.disliked_foods),
    preferred_cuisines: normalizeList(body.preferred_cuisines),
    meals_per_day_target: body.meals_per_day_target === '' || body.meals_per_day_target == null ? null : Number(body.meals_per_day_target),
    medical_disclaimer_ack: Boolean(body.medical_disclaimer_ack),
    notes: body.notes ? String(body.notes).trim() : '',
  };
}

router.get('/', async (req, res) => {
  try {
    const [profile, goals] = await Promise.all([
      getUserNutritionProfile(req.user.id),
      getUserGoals(req.user.id),
    ]);
    return res.json({ profile, goals });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load nutrition profile.', details: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const profile = normalizeProfilePayload(req.body);
    const savedProfile = await saveUserNutritionProfile(req.user.id, profile);

    let savedGoals = null;
    if (
      req.body.daily_calorie_target !== undefined ||
      req.body.protein_target_g !== undefined ||
      req.body.carbs_target_g !== undefined ||
      req.body.fat_target_g !== undefined ||
      req.body.goals
    ) {
      const g = req.body.goals || req.body;
      savedGoals = {
        daily_calorie_target: parseInt(g.daily_calorie_target || 2000, 10),
        protein_target_g: parseFloat(g.protein_target_g || 140),
        carbs_target_g: parseFloat(g.carbs_target_g || 225),
        fat_target_g: parseFloat(g.fat_target_g || 65),
      };
      await saveUserGoals(req.user.id, savedGoals);
    }

    return res.json({
      message: 'Profile and nutrition goals saved successfully.',
      profile: savedProfile,
      goals: savedGoals,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save nutrition profile.', details: error.message });
  }
});

module.exports = router;