/**
 * Parser helpers shared by every endpoint.
 */

/**
 * Parse a JSON string returned by an LLM. Throws an Error with a stable
 * message that the error middleware turns into a 502 response so the client
 * can show a friendly fallback.
 */
export const parseJsonResponse = (content) => {
  try {
    return JSON.parse(content);
  } catch {
    const error = new Error('AI provider returned an invalid JSON response.');
    error.code = 'INVALID_AI_RESPONSE';
    error.status = 502;
    throw error;
  }
};

/**
 * Extract an array from a parsed AI response. Tries the most common keys
 * first (`products`, `items`, `results`) and then falls back to the first
 * array-valued property. Returns `[]` if nothing matches.
 */
export const extractArray = (parsed, preferredKeys = ['products', 'items', 'results']) => {
  if (!parsed || typeof parsed !== 'object') return [];
  if (Array.isArray(parsed)) return parsed;

  for (const key of preferredKeys) {
    if (Array.isArray(parsed[key])) return parsed[key];
  }
  for (const value of Object.values(parsed)) {
    if (Array.isArray(value)) return value;
  }
  return [];
};

export const numberOr = (value, fallback) => (Number.isFinite(value) ? value : fallback);

export const boolOr = (value, fallback) => {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
};

export const stringOr = (value, fallback) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length === 0 ? fallback : trimmed;
};

export const arrayOfStrings = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
};
