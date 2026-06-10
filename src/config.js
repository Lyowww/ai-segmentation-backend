import dotenv from 'dotenv';

dotenv.config();

const requireString = (value, name) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
};

const optionalString = (value, fallback) => {
  if (typeof value !== 'string' || value.trim().length === 0) return fallback;
  return value.trim();
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const parseCommaList = (value, fallback = []) => {
  if (typeof value !== 'string' || value.trim().length === 0) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
};

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const defaultMaxUploadBytes = isVercel ? 2 * 1024 * 1024 : 15 * 1024 * 1024;

export const config = {
  port: parsePositiveInt(process.env.PORT, 3001),
  maxUploadBytes: parsePositiveInt(process.env.MAX_UPLOAD_BYTES, defaultMaxUploadBytes),
  imageFetchTimeoutMs: parsePositiveInt(process.env.IMAGE_FETCH_TIMEOUT_MS, 15_000),
  openai: {
    apiKey: requireString(process.env.OPENAI_API_KEY, 'OPENAI_API_KEY'),
    model: optionalString(process.env.OPENAI_MODEL, 'gpt-4.1')
  },
  gemini: {
    apiKey: requireString(process.env.GEMINI_API_KEY, 'GEMINI_API_KEY'),
    model: optionalString(process.env.GEMINI_MODEL, 'gemini-2.5-flash'),
    fallbackModels: parseCommaList(process.env.GEMINI_FALLBACK_MODELS, [
      'gemini-2.0-flash',
      'gemini-2.5-pro'
    ]),
    maxRetries: parsePositiveInt(process.env.GEMINI_MAX_RETRIES, 3),
    retryBaseMs: parsePositiveInt(process.env.GEMINI_RETRY_BASE_MS, 1000)
  }
};
