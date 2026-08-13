function evaluateMessageRisk(message = '') {
  const text = String(message || '').toLowerCase();

  return {
    extremeRestriction: /eat as little as possible|starve|stop eating|skip meals tomorrow|very low calorie/.test(text),
    purgeRelated: /purge|throw up|vomit after eating|make up for binge/.test(text),
    diagnosisRequest: /diagnose|diagnosis|medical condition|disease/.test(text),
  };
}

function shouldRefuse(flags) {
  return Boolean(flags.extremeRestriction || flags.purgeRelated);
}

function buildSafetyReply() {
  return 'I can help with balanced nutrition and calorie tracking, but I can’t help with dangerous restriction or purge-related advice. A safer next step is to return to regular balanced meals, hydration, and, if this feels hard to manage, consider speaking with a qualified healthcare professional or dietitian.';
}

module.exports = {
  evaluateMessageRisk,
  shouldRefuse,
  buildSafetyReply,
};