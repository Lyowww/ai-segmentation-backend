/**
 * Food-waste caddy recognition prompt.
 *
 * Client note: we must capture not only "hard" packaging (bottles/cans/jars),
 * but also "soft" plastics (film, bags, wrappers) and paper/cardboard packaging.
 *
 * Keep the JSON schema stable — the parser depends on these exact keys.
 */
const PROMPT = `Analyze this image of a transparent food-waste caddy/bin and detect what is INSIDE the caddy.

Tasks:

RULE: IF caddy is not detected exit immediately with "caddy_detected": false, ignore the rest of the prompt.

1. Determine if a food waste caddy is present in the image. A caddy is a RIGID small kitchen bin/container used to collect food/organic waste — it may be transparent or opaque, have a handle and/or lid, and often contains a plastic liner bag inside. 
IMPORTANT: a flexible transparent plastic bag (even if it contains food waste) is NOT a caddy — do NOT detect it as one. A caddy must have a rigid, structured body.
2. Detect ANY packaging inside the caddy (this includes BOTH hard packaging AND soft packaging):
   - Hard packaging: plastic bottles, aluminium cans, glass jars/bottles, rigid plastic tubs, etc.
   - Soft packaging: plastic film, soft plastic bags, snack wrappers, cling wrap, pouches/sachets, etc.
   - Paper packaging: paper/cardboard packaging, cartons, sleeves, paper bags, etc.
3. For anything that is NOT food waste, decide whether it is:
   - Organics contamination to REMOVE before using the organic bin (ALWAYS list it)
   - A recyclable item to REMOVE and place in recycling (list it when applicable)
4. Identify other non-food, non-packaging items

Return ONLY a valid JSON object with EXACTLY this structure:
{
  "caddy_detected": true,
  "has_organic_food_waste": true,
  "food_waste_confidence": 0.0,
  "organics_contamination_present": true,
  "organics_contamination_items": ["one short text per packaging/contamination item to remove before using the organic bin"],
  "recyclables_present": true,
  "recyclable_items": ["short text per detected recyclable item or packaging to remove"],
  "other_items": [
    {
      "id": "unique_id_for_item",
      "brand": "brand_or_unknown",
      "brand_confidence": 0.0,
      "category": "product_category_or_unknown",
      "category_confidence": 0.0,
      "material": "material_or_unknown",
      "material_confidence": 0.0,
      "color": "color_or_unknown",
      "color_confidence": 0.0,
      "bbox": [0, 0, 0, 0]
    }
  ]
}

Critical guidance for TRANSPARENT caddies (this is where you must be careful):
- Only report items that are inside the caddy. Ignore objects outside/behind the caddy.
- A flexible transparent plastic bag is NOT a caddy — set caddy_detected=false and stop.
- Packaging and recyclables can be hard to see through transparent plastic. Actively look for cues even when the full object is not visible:
  - Hard containers (bottle/can/jar): circular cap, ridged cap edge, narrow neck, bottle shoulder curve, molded seams, barcode-like stripes, label blocks, can top ring silhouette, jar mouth/rim.
  - Soft plastics (film/wrappers/bags): crinkles/folds, glossy thin reflections, heat-sealed edges, torn corners, irregular shapes, printed graphics on thin film.
  - Paper/cardboard: matte fibrous texture, flat folded planes, boxy edges, carton seams, paper sleeves, printed paper with creases.
- If you see ANY part consistent with packaging/recyclables (even 10–20% of it), INCLUDE it (better to over-call than miss soft plastic or paper packaging).
- IMPORTANT: treat ALL packaging/wrapping (including paper wraps/napkins/paper towels and soft plastic film/wrappers) as organics contamination to REMOVE unless it is clearly certified compostable in the image.

Field rules:
- caddy_detected: true ONLY if a RIGID food waste caddy/bin is present (transparent or opaque, with or without lid/handle). A flexible transparent plastic bag is NOT a caddy. If not detected, return all other fields as empty/false/zero.
- has_organic_food_waste: true if ANY food or organic matter is visible AND a caddy was detected. If caddy_detected is false, always set this to false. This includes raw/cooked food, fruit (whole or partial), vegetables, bread/pastries, peels/scraps, leftovers, tea bags, coffee grounds, eggshells, bones, and any other organic matter. Treat ALL food as food waste.
- food_waste_confidence: 0.0-1.0 confidence for food waste detection.
- IMPORTANT DE-DUPLICATION RULE (applies to organics_contamination_items, recyclable_items, and other_items):
  - Do NOT repeat the same real-world object multiple times.
  - If the same object could be described multiple ways, pick ONE best description (prefer most specific).
  - If an item is just a part/variant of the same object, treat it as ONE item (e.g., "banana peel" and "banana" should be a single entry like "banana peel" or "banana").
  - Only list multiples when there are clearly multiple separate instances visible (e.g., two distinct banana peels → list it twice).
  - Do NOT list the same object in multiple arrays. Put it in the single best-fitting place:
    - If it is packaging/recyclable: prefer listing it in recyclable_items (and still set organics_contamination_present=true).
    - If it is non-recyclable packaging/contamination: list it in organics_contamination_items.
    - If it is neither packaging/recyclable nor food waste: list it in other_items.
- organics_contamination_present: true if ANY non-food item is visible in the caddy that a user should remove before placing waste in the organic bin. This includes ALL packaging/wrapping (hard, soft plastic, paper).
- organics_contamination_items: list EVERY packaging/wrapping/contamination item to remove (short phrases). If none, return [].
  Include (but do not limit to): paper sandwich wrap / parchment / waxed paper / napkins / paper towels / cardboard sleeves / cartons / plastic film / cling wrap / plastic bag / snack wrapper / candy wrapper / aluminium foil / stickers / labels / rubber bands / cutlery / takeaway packaging.
- recyclables_present: true if ANY item visible inside the caddy should be removed for recycling, INCLUDING:
  - hard recyclables: plastic bottle, aluminium can, glass jar, glass bottle, rigid plastic container
  - paper/cardboard packaging that looks clean enough to recycle (boxes/sleeves/cartons)
  - soft plastic packaging/film (still list it if you see it; note it as "soft plastic/film" even if local rules vary)
- IMPORTANT: do NOT limit recyclables to aluminium cans. You MUST actively look for and report:
  - plastic (clear/colored bottles, caps/lids, rigid tubs/cups, film/wrappers/bags)
  - paper/cardboard (cartons, sleeves, boxes, paper packaging)
  - glass (jar/bottle shapes, rims, reflections)
  - metal (aluminium OR steel/tin cans, foil)
- recyclable_items: list EVERY recyclable item/packaging you can see inside the caddy (short phrases).
  If you are unsure whether something is recyclable, INCLUDE it anyway and describe it (e.g., "soft plastic wrapper/film", "paper/cardboard packaging", "plastic bottle/cap", "glass jar/bottle", "metal can").
- other_items: items that are NOT food waste and NOT packaging/recyclables. Use best-guess brand/category/material/color + confidence + bbox.

Return ONLY valid JSON. No markdown. No extra commentary.`;

export const getFoodWastePrompt = () => PROMPT;
