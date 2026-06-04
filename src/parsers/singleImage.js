import {
  parseJsonResponse,
  extractArray,
  numberOr,
  boolOr
} from './common.js';

const normalizeProduct = (raw, index) => {
  const id = typeof raw?.id === 'string' && raw.id.trim().length > 0
    ? raw.id
    : `product_${index + 1}`;

  return {
    id,
    brand: raw?.brand || 'unknown',
    brand_confidence: numberOr(raw?.brand_confidence, 0),
    category: raw?.category || 'unknown',
    category_confidence: numberOr(raw?.category_confidence, 0),
    material: raw?.material || 'unknown',
    material_confidence: numberOr(raw?.material_confidence, 0),
    color: raw?.color || 'unknown',
    color_confidence: numberOr(raw?.color_confidence, 0),
    bbox: raw?.bbox || null
  };
};

/**
 * Parses the Single Image AI response into the exact shape the React UI
 * expects (`results` array + `contaminationSummary` fields).
 */
export const parseSingleImageResponse = (content) => {
  const parsed = parseJsonResponse(content);
  const rawProducts = extractArray(parsed);
  const products = rawProducts.map(normalizeProduct);

  return {
    products,
    food_waste_items: Array.isArray(parsed.food_waste_items) ? parsed.food_waste_items : [],
    containers_with_food_or_drink: Array.isArray(parsed.containers_with_food_or_drink)
      ? parsed.containers_with_food_or_drink
      : [],
    organics_contamination_present: boolOr(parsed.organics_contamination_present, false),
    organics_contamination_items: Array.isArray(parsed.organics_contamination_items)
      ? parsed.organics_contamination_items
      : []
  };
};
