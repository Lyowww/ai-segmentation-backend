import { parseJsonResponse } from './common.js';

const pickFinite = (parsed, keys) => {
  for (const key of keys) {
    const value = parsed?.[key];
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return null;
};

export const normalizeAnalysisMetrics = (parsed) => ({
  ai_co2_kg: pickFinite(parsed, ['ai_co2_kg', 'estimated_co2_kg', 'co2_kg', 'ai_co2']),
  estimated_weight_kg: pickFinite(parsed, [
    'estimated_weight_kg',
    'weight_kg',
    'estimated_weight',
    'total_weight_kg'
  ])
});

export const extractMetricsFromContent = (content) => {
  const parsed = parseJsonResponse(content);
  return normalizeAnalysisMetrics(parsed);
};

export const mergeAnalysisMetrics = (metricsList = []) => {
  const valid = metricsList.filter(Boolean);
  if (valid.length === 0) {
    return { ai_co2_kg: null, estimated_weight_kg: null };
  }

  const sum = (key) => {
    const values = valid.map((m) => m[key]).filter((v) => Number.isFinite(v));
    return values.length > 0 ? values.reduce((total, v) => total + v, 0) : null;
  };

  return {
    ai_co2_kg: sum('ai_co2_kg'),
    estimated_weight_kg: sum('estimated_weight_kg')
  };
};

export const attachAnalysisMetrics = (data, parsed) => ({
  ...data,
  ...normalizeAnalysisMetrics(parsed)
});
