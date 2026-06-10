import {
  parseJsonResponse,
  numberOr,
  boolOr
} from './common.js';
import { attachAnalysisMetrics } from './metrics.js';

/**
 * Intentionally broad regex — we prefer flagging plastic/paper/metal/glass
 * in the caddy over missing it. Same wording the original frontend used.
 */
const RECYCLABLE_HINT_RE =
  /\b(plastic|bottle|cap|lid|container|tub|cup|wrapper|wrapping|film|bag|pouch|sachet|paper|cardboard|carton|box|sleeve|glass|jar|metal|alumin(?:um|ium)|tin|steel|can|foil)\b/i;

const asCleanStrings = (value) =>
  Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [];

const dedupe = (items) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

/**
 * Safety net: if the model forgets to populate the recyclables fields but
 * mentions recyclable materials in the contamination list, infer them and
 * surface them anyway.
 */
const deriveRecyclablesFromText = ({
  recyclables_present,
  recyclable_items,
  organics_contamination_items
}) => {
  const existing = asCleanStrings(recyclable_items);
  const contamination = asCleanStrings(organics_contamination_items);
  const inferred = contamination.filter((item) => RECYCLABLE_HINT_RE.test(item));

  const mergedItems = dedupe([...existing, ...inferred]);
  const present = Boolean(recyclables_present) || mergedItems.length > 0;

  return { recyclables_present: present, recyclable_items: mergedItems };
};

const normalizeOtherItem = (raw, index) => ({
  id: typeof raw?.id === 'string' && raw.id.trim().length > 0 ? raw.id : `item_${index + 1}`,
  brand: raw?.brand || 'unknown',
  brand_confidence: numberOr(raw?.brand_confidence, 0),
  category: raw?.category || 'unknown',
  category_confidence: numberOr(raw?.category_confidence, 0),
  material: raw?.material || 'unknown',
  material_confidence: numberOr(raw?.material_confidence, 0),
  color: raw?.color || 'unknown',
  color_confidence: numberOr(raw?.color_confidence, 0),
  bbox: raw?.bbox || null
});

export const parseFoodWasteResponse = (content) => {
  const parsed = parseJsonResponse(content);

  const caddyDetected = boolOr(parsed.caddy_detected, false);

  const baseResult = {
    caddy_detected: caddyDetected,
    has_organic_food_waste: caddyDetected ? boolOr(parsed.has_organic_food_waste, false) : false,
    food_waste_confidence: caddyDetected ? numberOr(parsed.food_waste_confidence, 0) : 0,
    organics_contamination_present: boolOr(parsed.organics_contamination_present, false),
    organics_contamination_items: Array.isArray(parsed.organics_contamination_items)
      ? parsed.organics_contamination_items
      : [],
    recyclables_present: boolOr(parsed.recyclables_present, false),
    recyclable_items: Array.isArray(parsed.recyclable_items) ? parsed.recyclable_items : [],
    other_items: Array.isArray(parsed.other_items)
      ? parsed.other_items.map(normalizeOtherItem)
      : []
  };

  const derived = deriveRecyclablesFromText(baseResult);
  baseResult.recyclables_present = derived.recyclables_present;
  baseResult.recyclable_items = derived.recyclable_items;

  return attachAnalysisMetrics(baseResult, parsed);
};
