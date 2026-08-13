const axios = require('axios');

function getAzureChatConfig() {
  return {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    apiKey: process.env.AZURE_OPENAI_KEY || '',
    deployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
  };
}

async function sendNutritionChat({ messages, temperature = 0.3, maxTokens = 700 }) {
  const config = getAzureChatConfig();
  const isConfigured = Boolean(config.endpoint && config.apiKey && config.deployment);

  if (!isConfigured) {
    return {
      content: '',
      is_simulated: true,
      simulation_reason: 'Azure OpenAI chat is not configured.',
    };
  }

  let cleanEndpoint = config.endpoint.replace(/\/+$/, '');
  if (!cleanEndpoint.startsWith('http')) {
    cleanEndpoint = `https://${cleanEndpoint}`;
  }

  const url = `${cleanEndpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`;

  const response = await axios.post(
    url,
    {
      messages,
      temperature,
      max_completion_tokens: maxTokens,
    },
    {
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return {
    content: response.data?.choices?.[0]?.message?.content?.trim() || '',
    is_simulated: false,
  };
}

module.exports = {
  sendNutritionChat,
};