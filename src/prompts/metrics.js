/**
 * Shared prompt text for AI-estimated environmental metrics.
 * Included in every vision analysis JSON schema.
 */

export const METRICS_JSON_FIELDS = `
  "ai_co2_kg": 0.0,
  "estimated_weight_kg": 0.0,
  "purity": 0.0`;

export const METRICS_GUIDELINES = `
Global metrics (REQUIRED on every response):
- ai_co2_kg: estimated total CO2-equivalent (kg) for the visible waste/materials, using typical lifecycle factors from what you can see. Must be >= 0.
- estimated_weight_kg: estimated total weight (kg) of visible waste/items in the scene. Must be >= 0.
- purity: sorting/stream purity from 0.0 (heavily contaminated or mixed) to 1.0 (perfectly sorted with no wrong-stream items).
  - Recyclables bag: 1.0 only when no visible food/bio-waste; lower when contamination is present.
  - Organics/food-waste caddy: 1.0 only when no packaging or non-organic contamination; lower when packaging is present.
  - Product-identification scenes: 1.0 when the stream looks cleanly sorted; lower when cross-contamination is visible.`;
