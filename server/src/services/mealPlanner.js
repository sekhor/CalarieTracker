function pickProtein(profile = {}) {
  const style = String(profile.dietary_style || '').toLowerCase();
  if (style.includes('vegan')) return 'tofu or edamame';
  if (style.includes('vegetarian')) return 'Greek yogurt, eggs, or tofu';
  return 'chicken, fish, eggs, or Greek yogurt';
}

function buildShoppingList(planMeals = []) {
  return [...new Set(planMeals.flatMap((meal) => meal.items || []))];
}

function generateMealPlan({ profile = {}, retrievalSummary = {}, insights = [] }) {
  const remainingCalories = Math.max(350, Number(retrievalSummary.remaining_calories || 600));
  const remainingProtein = Math.max(20, Number(retrievalSummary.remaining_protein_g || 30));
  const proteinAnchor = pickProtein(profile);
  const cuisineHint = (profile.preferred_cuisines || [])[0] || 'simple home-style';
  const focusInsight = insights[0]?.title || 'staying aligned with your goals';

  const meals = [
    {
      name: 'Protein-forward main meal',
      calories_target: Math.round(remainingCalories * 0.55),
      protein_target_g: Math.round(remainingProtein * 0.6),
      description: `Build a ${cuisineHint} plate around ${proteinAnchor}, vegetables, and one controlled carb source.`,
      items: [proteinAnchor, 'mixed vegetables', 'rice or potatoes', 'light sauce or seasoning'],
    },
    {
      name: 'Support snack',
      calories_target: Math.round(remainingCalories * 0.2),
      protein_target_g: Math.round(remainingProtein * 0.25),
      description: 'Use a snack that closes the protein gap without adding a large calorie load.',
      items: ['Greek yogurt or tofu snack', 'berries or fruit'],
    },
    {
      name: 'Flexible add-on',
      calories_target: Math.round(remainingCalories * 0.25),
      protein_target_g: Math.round(remainingProtein * 0.15),
      description: 'Leave room for a small add-on only if hunger is still present after the main meal.',
      items: ['soup, salad, or fruit'],
    },
  ];

  return {
    title: 'Guided meal plan',
    summary: `This plan prioritizes ${focusInsight.toLowerCase()} while staying near your remaining calorie and protein targets.`,
    targets: {
      remaining_calories: remainingCalories,
      remaining_protein_g: remainingProtein,
    },
    meals,
    guided_actions: [
      'Start with the protein anchor first so fullness is easier to manage.',
      'Keep sauces, oils, and calorie-dense extras measured and intentional.',
      'If still hungry later, use the support snack before choosing a more indulgent option.',
    ],
    shopping_list: buildShoppingList(meals),
  };
}

module.exports = {
  generateMealPlan,
};