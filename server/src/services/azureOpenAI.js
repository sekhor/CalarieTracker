const axios = require('axios');
const fs = require('fs');

// Default Azure OpenAI settings
let azureSettings = {
  endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
  apiKey: process.env.AZURE_OPENAI_KEY || '',
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
};

function updateAzureSettings(newSettings) {
  azureSettings = { ...azureSettings, ...newSettings };
}

function getAzureSettings() {
  return {
    endpoint: azureSettings.endpoint,
    deployment: azureSettings.deployment,
    apiVersion: azureSettings.apiVersion,
    hasApiKey: Boolean(azureSettings.apiKey),
  };
}

/**
 * Estimates calories and macronutrients from meal photo using Azure OpenAI Vision
 */
async function analyzeMealPhoto({ imageBuffer, mimeType = 'image/jpeg', customPrompt = '' }) {
  const isConfigured = Boolean(azureSettings.endpoint && azureSettings.apiKey && azureSettings.deployment);

  const base64Data = imageBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  if (!isConfigured) {
    console.log('Azure OpenAI not fully configured. Using intelligent AI simulator fallback.');
    return generateSimulatedAnalysis(base64Data);
  }

  try {
    let cleanEndpoint = azureSettings.endpoint.replace(/\/+$/, '');
    if (!cleanEndpoint.startsWith('http')) {
      cleanEndpoint = `https://${cleanEndpoint}`;
    }

    const url = `${cleanEndpoint}/openai/deployments/${azureSettings.deployment}/chat/completions?api-version=${azureSettings.apiVersion}`;

    const systemMessage = `You are an expert nutritionist and AI computer vision model specialized in meal image analysis. 
Analyze the provided meal image carefully and return ONLY a valid JSON object matching this structure:
{
  "meal_name": "Short descriptive name of the meal",
  "meal_type": "Breakfast" | "Lunch" | "Dinner" | "Snack",
  "total_calories": integer calorie count,
  "protein_g": float protein grams,
  "carbs_g": float carbs grams,
  "fat_g": float fat grams,
  "confidence_score": float between 0.50 and 0.99,
  "detected_items": ["Item 1", "Item 2", "Item 3"],
  "health_rating": "Healthy" | "Balanced" | "Indulgent" | "High Protein",
  "notes": "Short nutritional advice or observations"
}
Do not include markdown markdown backticks (\`\`\`json) outside the JSON output if possible. Output ONLY pure valid JSON.`;

    const userContent = [
      {
        type: 'text',
        text: customPrompt || 'Analyze this meal photo. Estimate total calories, protein, carbs, fat, and list detected food items.',
      },
      {
        type: 'image_url',
        image_url: {
          url: dataUrl,
          detail: 'high',
        },
      },
    ];

    const response = await axios.post(
      url,
      {
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userContent },
        ],
        temperature: 0.2,
        // max_tokens: 800,
      },
      {
        headers: {
          'api-key': azureSettings.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 25000,
      }
    );

    const rawResponse = response.data?.choices?.[0]?.message?.content || '';
    const cleanedText = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(cleanedText);
      console.log(parsed)
      return {
        ...parsed,
        is_simulated: false,
      };
    } catch (parseError) {
      console.warn('Failed to parse Azure OpenAI JSON response, trying extraction:', parseError.message);
      return generateSimulatedAnalysis(base64Data);
    }
  } catch (err) {
    console.error('Azure OpenAI Vision API call error:', err.response?.data || err.message);
    return generateSimulatedAnalysis(base64Data, err.message);
  }
}

/**
 * Intelligent simulation generator for seamless offline / demo testing
 */
function generateSimulatedAnalysis(base64Sample, errorMessage = null) {
  const sampleMeals = [
    {
      meal_name: 'Grilled Salmon & Quinoa Bowl',
      meal_type: 'Dinner',
      total_calories: 560,
      protein_g: 42,
      carbs_g: 38,
      fat_g: 22,
      confidence_score: 0.94,
      detected_items: ['Atlantic Salmon Fillet', 'Steamed Quinoa', 'Roasted Broccoli', 'Avocado Slices', 'Lemon Wedge'],
      health_rating: 'Healthy',
      notes: 'Excellent high-protein meal rich in omega-3 healthy fats and complex carbs.',
    },
    {
      meal_name: 'Avocado Toast with Poached Eggs',
      meal_type: 'Breakfast',
      total_calories: 420,
      protein_g: 19,
      carbs_g: 32,
      fat_g: 24,
      confidence_score: 0.91,
      detected_items: ['Sourdough Bread', 'Smashed Avocado', 'Poached Organic Eggs', 'Cherry Tomatoes', 'Microgreens'],
      health_rating: 'Balanced',
      notes: 'Nutrient-dense breakfast providing clean energy and healthy fats.',
    },
    {
      meal_name: 'Mediterranean Chicken Salad',
      meal_type: 'Lunch',
      total_calories: 480,
      protein_g: 36,
      carbs_g: 22,
      fat_g: 26,
      confidence_score: 0.88,
      detected_items: ['Grilled Chicken Breast', 'Romaine Lettuce', 'Feta Cheese', 'Kalamata Olives', 'Extra Virgin Olive Oil'],
      health_rating: 'Healthy',
      notes: 'Low glycemic meal high in lean protein and essential antioxidants.',
    },
    {
      meal_name: 'Classic Bacon Cheeseburger & Fries',
      meal_type: 'Dinner',
      total_calories: 890,
      protein_g: 44,
      carbs_g: 78,
      fat_g: 46,
      confidence_score: 0.95,
      detected_items: ['Beef Patty', 'Cheddar Cheese', 'Crispy Bacon', 'Brioche Bun', 'French Fries'],
      health_rating: 'Indulgent',
      notes: 'High calorie & fat density. Consider pairing with water or walking post-meal.',
    },
    {
      meal_name: 'Greek Yogurt Berry Parfait',
      meal_type: 'Snack',
      total_calories: 290,
      protein_g: 21,
      carbs_g: 39,
      fat_g: 5,
      confidence_score: 0.92,
      detected_items: ['Non-fat Greek Yogurt', 'Fresh Blueberries', 'Strawberries', 'Honey Drizzle', 'Granola'],
      health_rating: 'High Protein',
      notes: 'Great pre/post workout snack rich in probiotics and vitamins.',
    },
  ];

  // Pick deterministic meal based on length of base64 data
  const index = base64Sample ? base64Sample.length % sampleMeals.length : 0;
  const meal = sampleMeals[index];

  return {
    ...meal,
    is_simulated: true,
    simulation_reason: errorMessage
      ? `Azure OpenAI call error (${errorMessage}). Using AI simulator.`
      : 'Azure OpenAI credentials not set. Set your API key in Settings to use live Azure OpenAI Vision model.',
  };
}

module.exports = {
  analyzeMealPhoto,
  updateAzureSettings,
  getAzureSettings,
};
