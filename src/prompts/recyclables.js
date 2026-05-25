import { METRICS_JSON_FIELDS, METRICS_GUIDELINES } from './metrics.js';

/**
 * Recyclables-in-transparent-bag prompt.
 *
 * Tuned for subtle bio-waste detection inside recyclables bags. The prompt
 * intentionally over-calls borderline food items rather than missing them.
 */
const PROMPT = `Analyze this single image of a transparent bag and determine recyclables and bio-waste contamination. Items must be inside a transparent bag.

Return ONLY valid JSON with this structure:
{
  "recyclables_present": true/false,
  "contamination_score": 0-10,
  "contamination_items": ["one short text per contamination source"],
  "food_waste_items": ["short text per detected bio-waste/food waste item"],${METRICS_JSON_FIELDS}
}

Guidelines:
${METRICS_GUIDELINES}
- recyclables_present: true if any recyclable items are visible (plastic, aluminum, paper, glass, metal), false otherwise.
-contamination_score:
 - 1 if ANY visible bio-waste/food waste is present
  - Include items even if only partially visible (5-10% visibility is enough).
  - contamination_score = 10 only if NO visible food/organic matter is present.

- contamination_items: list every distinct visible food/organic item.
  - Include partially visible items.
  - Prefer specific names.
  - Do not list containers, packaging, or non-food items.
  - De-duplicate only if items are clearly the same instance.
  - If it's clearly bio-waste but the exact type is unclear, use a conservative generic label (e.g., "food scraps", "organic residue", "mixed leftovers").
  - If contamination_score = 1 but no identifiable food, return [].

- food_waste_items: same rules as contamination_items. Be exhaustive — include peels, scraps, crumbs, and small fragments if visible.

WHOLE ITEM vs. PART — CRITICAL LABELING RULE:
  - If the item appears whole or mostly intact, label it as the whole item: "lemon", "apple", "orange", "banana".
  - Only use "peel", "core", "slice", or "half" if the item is clearly damaged, cut, bitten, or only a fragment is visible.
  - A round/oval yellow object = "lemon", NOT "lemon peel" unless the peel is separated from the fruit.
  - A round red/green object = "apple", NOT "apple core" unless the core is what's visible.
  - When in doubt, label the whole item.

ITEM IDENTIFICATION — ALWAYS USE ALL THREE SIGNALS:
  - Shape + Color + Texture must agree before naming an item.
  - Do NOT rely on only one signal alone.
  - If signals conflict, use a generic label ("fruit piece", "bread piece").
  - If signals strongly match a known pattern, use the specific name.

CRITICAL — FOOD DETECTION RULES:
  - Only report items clearly showing food texture, color, or shape.
  - Do NOT infer food from labels or container type.
  - Include all partially visible items (corners, edges, slices).
  - Even thin slivers, edges, or curved fragments count.
  - Actively look behind and between other items for any sign of food texture or color peeking through.
  - Do not list bottles, cans, jars, lids, or packaging.
  - IMPORTANT! Bread specifically: bread can appear in many shapes — do NOT limit to rectangular slices.
    Look for ANY of these regardless of shape:
    - A golden/brown outer crust edge (darker than the interior)
    - A lighter cream/white/yellow interior crumb surface
    - Spongy or porous surface texture with small air holes
    - Triangular, wedge, rectangular, torn, or irregular shapes all count
    - A long flat piece with a darker edge and lighter face is almost certainly bread — report it
    - Even a single visible face of a slice with crust-to-crumb contrast is sufficient

CRITICAL — IMAGE SCANNING (VERY IMPORTANT FOR DETECTION):
  - Perform a STRICT full scan in this order:
    1. Top-left → top-right
    2. Middle-left → middle-right
    3. Bottom-left → bottom-right
    4. Then scan AGAIN focusing ONLY on areas behind/under objects
  - Actively search for small, partially hidden food between bottles, under plastic, and behind labels.
  - Assume small food items ARE present and try to confirm them visually.

ANTI-MISS RULE (VERY IMPORTANT):
  - If you see ANY evidence of:
    round/oval yellow object → include "lemon" (not "lemon peel" unless peel is detached)
    curved/elongated yellow OR brown-yellow strip or flap → include "banana peel" (banana peels may be browned, dark yellow, or partially hidden under other items)
    round red/green object → include "apple"
    crust + soft interior contrast → include "bread"
  - Prefer INCLUDING a likely food item rather than missing it.

Return ONLY a valid JSON object.
If no food waste is detected, return {"recyclables_present": false, "contamination_score": 10, "contamination_items": [], "food_waste_items": [], "ai_co2_kg": 0, "estimated_weight_kg": 0, "purity": 1}.
Do not include any markdown or extra text.`;

export const getRecyclablesPrompt = () => PROMPT;
