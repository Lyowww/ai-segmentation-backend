import { METRICS_JSON_FIELDS, METRICS_GUIDELINES } from './metrics.js';

/**
 * Single-image product identification prompts.
 *
 * v1 — full detail with bounding boxes, color, and contamination
 * v2 — medium detail without bbox/color
 * v3 — fast: category and material only
 */

const V1 = `Analyze this image and identify absolutely ALL products/bottles visible. For each product, return a JSON object with a "products" key containing an array of products. Each product should have the following structure:
{
  "products": [
    {
      "id": "unique_id_for_product",
      "brand": "brand_name",
      "brand_confidence": 0.0-1.0,
      "category": "product_category",
      "category_confidence": 0.0-1.0,
      "material": "material_type",
      "material_confidence": 0.0-1.0,
      "color": "dominant_color",
      "color_confidence": 0.0-1.0,
      "bbox": {
        "x": 0.0-1.0,
        "y": 0.0-1.0,
        "width": 0.0-1.0,
        "height": 0.0-1.0
      }
    }
  ]
}

- category should include things like shampoo_bottle, beverage_bottle, yogurt_cup, etc, never only shampoo or bottle
- material should include things like plastic, glass, metal, paper, aluminum, etc
- brand should identified brand name all lowercase
- color should be the dominant/main color of the product (e.g., "red", "blue", "green", "white", "transparent", "brown", etc.) - use simple color names
- Return all the products in the image regardless of the confidence score of any attribute, its critical to get all the products in the image with their material, category, and color.
- If the item is too far away from the camera just ignore it.
- If you cannot identify a specific attribute (brand, category, material, or color), use "unknown" as the value, but try your best to identify all attributes.
- IMPORTANT: include food/drink containers as products too (e.g., soda bottle, ketchup bottle, sauce jar, coffee cup), even if they look empty.
- IMPORTANT: include non-food consumer-product containers as products too (e.g., shampoo bottle, cleaning spray bottle, detergent bottle, lotion bottle, medicine bottle).
The bbox (bounding box) coordinates should be normalized (0.0 to 1.0) relative to the image dimensions:
- x: left edge position (0.0 = left edge, 1.0 = right edge)
- y: top edge position (0.0 = top edge, 1.0 = bottom edge)
- width: width of the bounding box (0.0-1.0)
- height: height of the bounding box (0.0-1.0)

Also detect any food waste items and containers with visible food/drink residue. Return ONLY valid JSON:
{
  "products": [...],
  "food_waste_items": ["short text per detected food waste item"],
  "containers_with_food_or_drink": ["short text per detected container with food/drink residue"],
  "organics_contamination_present": true/false,
  "organics_contamination_items": ["one short text per non-organic item that should be removed before putting waste in the organic bin"],${METRICS_JSON_FIELDS}
}
${METRICS_GUIDELINES}
- food_waste_items: list ALL visible food/organic matter (treat ALL food as food waste). Include partial/unclear food too. If none, return [].
- containers_with_food_or_drink: list ONLY containers (and container components like caps/lids/closures) that have VISIBLE residue, liquid, remaining product, or contents. This includes NON-FOOD liquids/contents too (e.g., shampoo, soap, cleaning product, detergent, lotion/cream) ONLY when contents/residue are actually visible. If residue/contents are visible, describe them (e.g., "ketchup bottle with ketchup residue", "jar with sauce residue", "cup with coffee residue", "bottle with liquid", "shampoo bottle with shampoo inside", "cleaning bottle with liquid", "lotion bottle with cream residue").
  Visibility rules (STRICT):
  - Do NOT infer residue/contents from the label/branding or container type.
  - If the container/packaging is NOT transparent (opaque paper box, cardboard carton, metal can, non-clear plastic bottle), you cannot see inside. Therefore, DO NOT claim residue/contents inside it.
  - Only include an opaque container if residue/contents are directly visible at an opening (open lid/mouth), on the rim/inside surface, through a clear window, or as a visible spill/stain on the outside.
  - Do NOT include clearly empty packaging (e.g., an empty paper coffee box/carton) unless residue/contents are visibly present by the rules above.
- organics_contamination_present: true if ANY visible non-food, non-organic item is present that should be excluded from the organic waste bin.
- organics_contamination_items: list EVERY visible packaging/wrapping/non-organic item that a user should remove before using the organic bin. Examples include "sandwich paper wrap", "plastic film", "aluminium foil", "napkin".
  Important: paper wrapping around food (e.g., sandwich paper wrap) should be INCLUDED here so the user knows to exclude it from organics unless clearly labeled compostable.
- If a container appears in containers_with_food_or_drink, it MUST also appear in products (as a product/container).

Return ONLY valid JSON object. If no products are detected, return {"products": [], "food_waste_items": [], "containers_with_food_or_drink": [], "organics_contamination_present": false, "organics_contamination_items": [], "ai_co2_kg": 0, "estimated_weight_kg": 0, "purity": 1}. Do not include any markdown formatting or additional text.`;

const V2 = `Analyze this image and identify ALL products/bottles/containers visible. Return ONLY the requested fields.
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

- category should include things like shampoo_bottle, beverage_bottle, yogurt_cup, etc, never only shampoo or bottle
- material should include things like plastic, glass, metal, paper, aluminum, etc
- brand should identified brand name all lowercase
- Return all the products in the image regardless of confidence score.
- If an attribute is unknown, use "unknown".
- IMPORTANT: include food/drink containers as products too (e.g., soda bottle, ketchup bottle, sauce jar, coffee cup), even if they look empty.
- IMPORTANT: include non-food consumer-product containers as products too (e.g., shampoo bottle, cleaning spray bottle, lotion bottle, medicine bottle).

Also detect any food waste items and containers with visible food/drink residue. Return ONLY valid JSON:
{
  "products": [...],
  "food_waste_items": ["short text per detected food waste item"],
  "containers_with_food_or_drink": ["short text per detected container with food/drink residue"],
  "organics_contamination_present": true/false,
  "organics_contamination_items": ["one short text per non-organic item that should be removed before putting waste in the organic bin"],${METRICS_JSON_FIELDS}
}
${METRICS_GUIDELINES}
- food_waste_items: list ALL visible food/organic matter (treat ALL food as food waste). Include partial/unclear food too (e.g., "banana peel", "apple core", "bread", "leftover pasta", "vegetable scraps"). If none, return [].
- containers_with_food_or_drink: list ONLY containers (and container components like caps/lids/closures) that have VISIBLE residue, liquid, remaining product, or contents. This includes NON-FOOD liquids/contents too (e.g., shampoo, soap, cleaning product, detergent, lotion/cream) ONLY when contents/residue are actually visible. Examples: "ketchup bottle with ketchup residue", "jar with sauce residue", "cup with coffee residue", "shampoo bottle with shampoo inside", "cleaning spray bottle with liquid", "lotion bottle with cream residue".
  Visibility rules (STRICT):
  - Do NOT infer residue/contents from the label, brand, or "this is usually a drink container".
  - If the container/packaging is NOT transparent (opaque paper box, cardboard carton, metal can, non-clear plastic bottle), you cannot see inside. Therefore, DO NOT claim residue/contents inside it.
  - Only include an opaque container if residue/contents are directly visible at an opening (open lid/mouth), on the rim/inside surface, through a clear window, or as a visible spill/stain on the outside.
  - Do NOT include clearly empty packaging (e.g., an empty paper coffee box/carton) unless residue/contents are visibly present by the rules above.
- organics_contamination_present: true if ANY visible non-food, non-organic item is present that should be excluded from the organic waste bin.
- organics_contamination_items: list EVERY visible packaging/wrapping/non-organic item that a user should remove before using the organic bin. Examples:
  - "sandwich paper wrap / parchment / waxed paper"
  - "napkin / paper towel"
  - "plastic film / cling wrap / snack wrapper"
  - "aluminium foil"
  - "sticker / label / rubber band / cutlery"
  Important: paper wrapping around food (e.g., sandwich paper wrap) should be INCLUDED here so the user knows to exclude it from organics unless it is clearly labeled "certified compostable" in the image.
- If a container appears in containers_with_food_or_drink, it MUST also appear in products (as a product/container).

Return ONLY valid JSON object. If no products are detected, return {"products": [], "food_waste_items": [], "containers_with_food_or_drink": [], "organics_contamination_present": false, "organics_contamination_items": [], "ai_co2_kg": 0, "estimated_weight_kg": 0, "purity": 1}. Do not include any markdown formatting or additional text.`;

const V3 = `List ALL products in the image and return ONLY category and material.
{"products":[{"id":"unique_id_for_product","category":"product_category","category_confidence":0.0-1.0,"material":"material_type","material_confidence":0.0-1.0}]}
- category should include things like shampoo_bottle, beverage_bottle, yogurt_cup, etc, never only shampoo or bottle
- material should include things like plastic, glass, metal, paper, aluminum, etc
- If unknown, use "unknown".
Also detect any food waste items and containers with VISIBLE residue/contents. Return ONLY JSON:
{
  "products": [...],
  "food_waste_items": ["short text per detected food waste item"],
  "containers_with_food_or_drink": ["short text per detected container with food/drink residue"],
  "organics_contamination_present": true/false,
  "organics_contamination_items": ["one short text per non-organic item that should be removed before putting waste in the organic bin"],${METRICS_JSON_FIELDS}
}
${METRICS_GUIDELINES}
- food_waste_items: list ALL visible food/organic matter (treat ALL food as food waste). If none, return [].
- containers_with_food_or_drink: list ONLY containers (and small components like caps/lids/closures) showing visible residue or remaining contents/liquid/cream/gel/powder (including non-food contents like shampoo/soap/cleaner/detergent/lotion). If residue/contents are visible, describe it (e.g., "ketchup bottle with ketchup residue", "jar with sauce residue", "cup with coffee residue", "shampoo bottle with shampoo inside", "cleaning bottle with liquid").
  Visibility rules (STRICT):
  - Do NOT infer residue/contents from the label/branding or container type.
  - If the container/packaging is opaque (paper box, cardboard carton, metal can, non-clear plastic), you cannot see inside. Do NOT claim residue/contents inside it.
  - Only include opaque containers if residue/contents are directly visible at an opening/rim, through a clear window, or as an obvious spill/stain on the outside.
  - Do NOT include clearly empty packaging (e.g., empty paper coffee box) unless residue/contents are visibly present by the rules above.
- organics_contamination_present: true if ANY visible non-food, non-organic item is present that should be excluded from the organic waste bin.
- organics_contamination_items: list EVERY visible packaging/wrapping/non-organic item that a user should remove before using the organic bin. Include "sandwich paper wrap" if present.
- If a container appears in containers_with_food_or_drink, it MUST also appear in products.

Return ONLY JSON object. If no products are detected, include "ai_co2_kg": 0, "estimated_weight_kg": 0, "purity": 1.`;

const PROMPTS = {
  v1: V1,
  v2: V2,
  v3: V3
};

export const SINGLE_IMAGE_PROMPT_VERSIONS = Object.freeze(['v1', 'v2', 'v3']);

export const getSingleImagePrompt = (version = 'v1') => {
  return PROMPTS[version] || PROMPTS.v1;
};
