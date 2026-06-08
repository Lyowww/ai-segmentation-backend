/**
 * Token counting and cost calculation. Mirrors the pricing table the
 * frontend used to compute on the client and returns the same shape that the
 * <UsageDetails> component renders.
 */

const PRICING_PER_MILLION = {
  'gpt-4o': { input: 5, output: 15, currency: 'USD' },
  'gpt-4.1': { input: 5, output: 15, currency: 'USD' },
  'gemini-2.5-pro': { input: 1.25, output: 10, currency: 'USD' }
};

const finiteOrNull = (value) => (Number.isFinite(value) ? value : null);

const getPricingForModel = (model) => {
  if (!model) return null;
  return PRICING_PER_MILLION[model] || null;
};

export const buildUsageSummary = ({ provider, model, response }) => {
  if (!response) return null;

  let inputTokens = null;
  let outputTokens = null;
  let totalTokens = null;

  if (provider === 'openai') {
    inputTokens = finiteOrNull(response?.usage?.prompt_tokens);
    outputTokens = finiteOrNull(response?.usage?.completion_tokens);
    totalTokens = finiteOrNull(response?.usage?.total_tokens);
  } else if (provider === 'gemini') {
    inputTokens = finiteOrNull(response?.usageMetadata?.promptTokenCount);
    outputTokens = finiteOrNull(response?.usageMetadata?.candidatesTokenCount);
    totalTokens = finiteOrNull(response?.usageMetadata?.totalTokenCount);
  }

  if (!Number.isFinite(totalTokens) && Number.isFinite(inputTokens) && Number.isFinite(outputTokens)) {
    totalTokens = inputTokens + outputTokens;
  }

  const pricing = getPricingForModel(model);
  const currency = pricing?.currency || 'USD';

  const inputCost = pricing && Number.isFinite(inputTokens)
    ? (inputTokens / 1_000_000) * pricing.input
    : null;
  const outputCost = pricing && Number.isFinite(outputTokens)
    ? (outputTokens / 1_000_000) * pricing.output
    : null;
  const totalCost = Number.isFinite(inputCost) && Number.isFinite(outputCost)
    ? inputCost + outputCost
    : null;

  return {
    provider: provider || 'unknown',
    model: model || 'unknown',
    inputTokens,
    outputTokens,
    totalTokens,
    inputCost,
    outputCost,
    totalCost,
    currency
  };
};

export const mergeUsageSummaries = (summaries = []) => {
  const valid = summaries.filter(Boolean);
  if (valid.length === 0) return null;

  const providers = new Set(valid.map((s) => s.provider));
  const models = new Set(valid.map((s) => s.model));
  const currencies = new Set(valid.map((s) => s.currency));

  const sum = (key) => valid.reduce((total, s) => total + (Number.isFinite(s[key]) ? s[key] : 0), 0);
  const hasFinite = (key) => valid.some((s) => Number.isFinite(s[key]));

  const inputTokens = hasFinite('inputTokens') ? sum('inputTokens') : null;
  const outputTokens = hasFinite('outputTokens') ? sum('outputTokens') : null;
  const totalTokens = hasFinite('totalTokens')
    ? sum('totalTokens')
    : (Number.isFinite(inputTokens) && Number.isFinite(outputTokens)
      ? inputTokens + outputTokens
      : null);

  const inputCost = hasFinite('inputCost') ? sum('inputCost') : null;
  const outputCost = hasFinite('outputCost') ? sum('outputCost') : null;
  const totalCost = hasFinite('totalCost')
    ? sum('totalCost')
    : (Number.isFinite(inputCost) && Number.isFinite(outputCost)
      ? inputCost + outputCost
      : null);

  return {
    provider: providers.size === 1 ? [...providers][0] : 'mixed',
    model: models.size === 1 ? [...models][0] : 'mixed',
    inputTokens,
    outputTokens,
    totalTokens,
    inputCost,
    outputCost,
    totalCost,
    currency: currencies.size === 1 ? [...currencies][0] : 'USD'
  };
};
