/**
 * Shared prompt text for AI-estimated CO2 and weight.
 * Included in every vision analysis JSON schema.
 */

export const METRICS_JSON_FIELDS = `
  "ai_co2_kg": 0.0,
  "estimated_weight_kg": 0.0`;

export const METRICS_GUIDELINES = `
Global metrics (REQUIRED on every response):
- ai_co2_kg: estimated total CO2-equivalent (kg) for the visible waste/materials, using typical lifecycle factors from what you can see. Must be >= 0.
- estimated_weight_kg: estimated total weight (kg) of visible waste/items in the scene. Must be >= 0.`;
