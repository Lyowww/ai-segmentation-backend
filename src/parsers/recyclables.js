import { parseJsonResponse, boolOr } from './common.js';

/**
 * Extract contamination items from a parsed AI response. Handles three
 * historical formats:
 *   - `contamination_items` as a clean array (current format)
 *   - `contamination_reason` as an array (legacy)
 *   - `contamination_reason` as a comma-separated string (oldest legacy)
 */
const contaminationItemsFromResponse = (parsed) => {
  if (!parsed || typeof parsed !== 'object') return [];

  const fromArray = (value) =>
    Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : null;

  const direct = fromArray(parsed.contamination_items);
  if (direct) return direct;

  const legacyArray = fromArray(parsed.contamination_reason);
  if (legacyArray) return legacyArray;

  if (typeof parsed.contamination_reason === 'string') {
    const raw = parsed.contamination_reason.trim();
    if (!raw || raw.toLowerCase() === 'unknown') return [];
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  return [];
};

export const parseRecyclablesResponse = (content) => {
  const parsed = parseJsonResponse(content);

  return {
    bag_detected: boolOr(parsed.bag_detected, false),
    recyclables_present: boolOr(parsed.recyclables_present, false),
    contamination_score: Number.isFinite(parsed.contamination_score)
      ? parsed.contamination_score
      : null,
    contamination_items: contaminationItemsFromResponse(parsed),
    // Legacy field — kept so any consumer that still expects a string keeps working.
    contamination_reason:
      typeof parsed.contamination_reason === 'string' ? parsed.contamination_reason : 'unknown',
    food_waste_items: Array.isArray(parsed.food_waste_items) ? parsed.food_waste_items : []
  };
};
