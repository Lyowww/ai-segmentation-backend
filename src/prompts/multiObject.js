import { METRICS_JSON_FIELDS, METRICS_GUIDELINES } from './metrics.js';

/**
 * Multi-object identification prompts (used for both images in the dual-image
 * Multi Object screen).
 *
 * v1 — full detail with bbox, color, cap_color, zindex, visible_part
 * v2 — medium detail (brand, category, material only) with constrained enums
 * v3 — fast: category and material only with constrained enums
 * v4 — Nespresso capsule group counting (uses a different response shape;
 *       parsed by `parseCapsuleGroupResponse`)
 */

const V1 = `Analyze this image of a transparent bug container and identify absolutely ALL daily consumer used products, bottles, containers, etc. visible inside the transparent bug. For each product, return a JSON object with a "products" key containing an array of products. Each product should have the following structure:
{
  "products": [
    {
      "id": "unique_id_for_product",
      "brand": "brand_name",
      "brand_confidence": 0.0-1.0,
      "category": "product_category, always drop the confidence score below 0.5 if you are not sure about the category",
      "category_confidence": 0.0-1.0,
      "material": "material_type",
      "material_confidence": 0.0-1.0,
      "cap_color": "when the color of the cap is evedently visible, return the color, otherwise return unknown",
      "cap_color_confidence": 0.0-1.0,
      "color": "when the color is evedently visible and product seem to contain that color from all anglnes, return the color, otherwise return unknown",
      "color_confidence": 0.0-1.0,
      "zindex": "this must show if the the given product is in front of or behind other products in the image, value can be front, back, middle or side",
      "zindex_confidence": 0.0-1.0,
      "visible_part": "percentage of the item visible in the image (0.0-1.0), representing how much of the item is visible versus covered by other items",
      "bbox": {
        "x": 0.0-1.0,
        "y": 0.0-1.0,
        "width": 0.0-1.0,
        "height": 0.0-1.0
      }
    }
  ]
}

- category should be only on of from this list as accurate as possible and most close to one of the items in this list: shampoo_bottle, beverage_bottle, edible_product,coffee_capsule, coffee, tes, drugs, cleaning_product, beverage_bottle, personal_hygiene_product.
- material should be only on of from this list: plastic, glass, metal, paper, aluminum, leather, wood.
- brand should identified brand name all lowercase
- color should be the dominant/main color of the product (e.g., "red", "blue", "green", "white", "transparent", "brown", etc.) - use simple color names
- Return all the products in the image regardless of the confidence score of any attribute, its critical to get all the products in the image with their material, category, and color.
- If the item is too far away from the camera just ignore it.
- If you cannot identify a specific attribute (brand, category, material, or color), use "unknown" as the value, but try your best to identify all attributes.

Return ONLY valid JSON object with a "products" array and these root fields:${METRICS_JSON_FIELDS}
${METRICS_GUIDELINES}
If no products are detected, return {"products": [], "ai_co2_kg": 0, "estimated_weight_kg": 0, "purity": 1}. Do not include any markdown formatting or additional text.`;

const V2 = `Analyze this image of a transparent bug container and identify absolutely ALL daily consumer used products, bottles, containers, etc. visible inside the transparent bug. Return ONLY the requested fields.
{
  "products": [
    {
      "id": "unique_id_for_product",
      "brand": "brand_name",
      "brand_confidence": 0.0-1.0,
      "category": "product_category",
      "category_confidence": 0.0-1.0,
      "material": "material_type",
      "material_confidence": 0.0-1.0
    }
  ]
}

- category should be only one of: shampoo_bottle, beverage_bottle, edible_product, coffee_capsule, coffee, tes, drugs, cleaning_product, personal_hygiene_product.
- material should be only one of: plastic, glass, metal, paper, aluminum, leather, wood.
- brand should be identified brand name all lowercase
- Return all the products in the image regardless of confidence score.
- If an attribute is unknown, use "unknown".

Return ONLY valid JSON object with a "products" array and these root fields:${METRICS_JSON_FIELDS}
${METRICS_GUIDELINES}
If no products are detected, return {"products": [], "ai_co2_kg": 0, "estimated_weight_kg": 0, "purity": 1}. Do not include any markdown formatting or additional text.`;

const V3 = `List ALL products in the image and return ONLY category and material.
{"products":[{"id":"unique_id_for_product","category":"product_category","category_confidence":0.0-1.0,"material":"material_type","material_confidence":0.0-1.0}]}
- category must be one of: shampoo_bottle, beverage_bottle, edible_product, coffee_capsule, coffee, tes, drugs, cleaning_product, personal_hygiene_product.
- material must be one of: plastic, glass, metal, paper, aluminum, leather, wood.
- If unknown, use "unknown".
Return ONLY JSON object with these root fields:${METRICS_JSON_FIELDS}
${METRICS_GUIDELINES}`;

const V4 = `Estimate the approximate number of Nespresso capsules visible in this single image of a transparent bug container. We only need an approximate count, not an exact number. Also identify capsule brand, category, and material. Return ONLY valid JSON:
{
  "approx_count": number,
  "count_range": { "min": number, "max": number },
  "brand": "brand_name_or_unknown",
  "brand_confidence": 0.0-1.0,
  "category": "coffee_capsule",
  "category_confidence": 0.0-1.0,
  "material": "plastic|aluminum|paper|unknown",
  "material_confidence": 0.0-1.0,${METRICS_JSON_FIELDS}
}
${METRICS_GUIDELINES}
- Use lowercase brand names.
- If unsure, use "unknown".
- Return JSON only, no markdown or extra text.`;

const PROMPTS = {
  v1: V1,
  v2: V2,
  v3: V3,
  v4: V4
};

export const MULTI_OBJECT_PROMPT_VERSIONS = Object.freeze(['v1', 'v2', 'v3', 'v4']);
export const MULTI_OBJECT_CAPSULE_VERSION = 'v4';

export const isMultiObjectCapsuleVersion = (version) => version === MULTI_OBJECT_CAPSULE_VERSION;

export const getMultiObjectPrompt = (version = 'v1') => {
  return PROMPTS[version] || PROMPTS.v1;
};
