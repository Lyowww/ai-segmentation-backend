import { parseJsonResponse, boolOr } from './common.js';

const clamp01 = (value) => Math.min(1, Math.max(0, value));

const pickFinite = (parsed, keys) => {
  for (const key of keys) {
    const value = parsed?.[key];
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return null;
};

const pickPurity = (parsed) => {
  if (Number.isFinite(parsed?.purity)) {
    return clamp01(parsed.purity);
  }
  if (Number.isFinite(parsed?.purity_percent)) {
    return clamp01(parsed.purity_percent / 100);
  }
  if (Number.isFinite(parsed?.purity_score)) {
    const score = parsed.purity_score;
    return clamp01(score > 1 ? score / 100 : score);
  }
  return null;
};

const countStrings = (value) => {
  if (!Array.isArray(value)) return 0;
  return value.map((item) => String(item).trim()).filter(Boolean).length;
};

const derivePurity = (parsed, options = {}) => {
  if (options.kind === 'recyclables') {
    const score = parsed?.contamination_score;
    if (Number.isFinite(score)) {
      return clamp01(score / 10);
    }
    const foodCount = countStrings(parsed?.food_waste_items) + countStrings(parsed?.contamination_items);
    if (!boolOr(parsed?.recyclables_present, false) && foodCount === 0) return 1;
    return foodCount === 0 ? 0.95 : clamp01(1 - foodCount * 0.12);
  }

  if (options.kind === 'foodWaste') {
    const contaminationCount =
      countStrings(parsed?.organics_contamination_items) + countStrings(parsed?.recyclable_items);
    if (!boolOr(parsed?.organics_contamination_present, false) && contaminationCount === 0) {
      return boolOr(parsed?.has_organic_food_waste, false) ? 1 : 0.5;
    }
    return clamp01(1 - contaminationCount * 0.1);
  }

  const contaminationCount = countStrings(parsed?.organics_contamination_items);
  if (!boolOr(parsed?.organics_contamination_present, false) && contaminationCount === 0) {
    return 1;
  }
  return clamp01(1 - contaminationCount * 0.1);
};

/**
 * Normalize AI CO2, estimated weight, and purity from a parsed LLM object.
 * Fills purity (and optionally other fields) when the model omits them.
 */
export const normalizeAnalysisMetrics = (parsed, options = {}) => {
  const ai_co2_kg = pickFinite(parsed, ['ai_co2_kg', 'estimated_co2_kg', 'co2_kg', 'ai_co2']);
  const estimated_weight_kg = pickFinite(parsed, [
    'estimated_weight_kg',
    'weight_kg',
    'estimated_weight',
    'total_weight_kg'
  ]);

  let purity = pickPurity(parsed);
  if (purity === null) {
    purity = derivePurity(parsed, options);
  }

  return { ai_co2_kg, estimated_weight_kg, purity };
};

export const extractMetricsFromContent = (content, options = {}) => {
  const parsed = parseJsonResponse(content);
  return normalizeAnalysisMetrics(parsed, options);
};

export const mergeAnalysisMetrics = (metricsList = []) => {
  const valid = metricsList.filter(Boolean);
  if (valid.length === 0) {
    return { ai_co2_kg: null, estimated_weight_kg: null, purity: null };
  }

  const sum = (key) => {
    const values = valid.map((m) => m[key]).filter((v) => Number.isFinite(v));
    return values.length > 0 ? values.reduce((total, v) => total + v, 0) : null;
  };

  const purities = valid.map((m) => m.purity).filter((v) => Number.isFinite(v));

  return {
    ai_co2_kg: sum('ai_co2_kg'),
    estimated_weight_kg: sum('estimated_weight_kg'),
    purity: purities.length > 0 ? Math.min(...purities) : null
  };
};

export const attachAnalysisMetrics = (data, parsed, options = {}) => ({
  ...data,
  ...normalizeAnalysisMetrics(parsed, options)
});
