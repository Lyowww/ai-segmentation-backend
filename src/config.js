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
// Vercel serverless request body is capped at ~4.5 MB. Raising these defaults
// above that does not help — callers (recypic-backend) must compress first.
const defaultMultipartUploadBytes = isVercel ? 4 * 1024 * 1024 : 15 * 1024 * 1024;
const defaultJsonBodyBytes = isVercel ? 4 * 1024 * 1024 : 6 * 1024 * 1024;
const defaultBase64ImageBytes = isVercel ? 3 * 1024 * 1024 : 10 * 1024 * 1024;
const defaultRemoteImageBytes = 15 * 1024 * 1024;
const defaultMaxSourceImageDimension = 8_192;
const defaultMaxSourceImagePixels = 40_000_000;
const defaultNormalizeSourceImageDimension = 2_048;

export const config = {
  port: parsePositiveInt(process.env.PORT, 3001),
  maxMultipartUploadBytes: parsePositiveInt(
    process.env.MAX_MULTIPART_UPLOAD_BYTES,
    defaultMultipartUploadBytes
  ),
  maxJsonBodyBytes: parsePositiveInt(process.env.MAX_JSON_BODY_BYTES, defaultJsonBodyBytes),
  maxBase64ImageBytes: parsePositiveInt(
    process.env.MAX_BASE64_IMAGE_BYTES,
    defaultBase64ImageBytes
  ),
  maxRemoteImageBytes: parsePositiveInt(
    process.env.MAX_REMOTE_IMAGE_BYTES,
    defaultRemoteImageBytes
  ),
  maxSourceImageDimension: parsePositiveInt(
    process.env.MAX_SOURCE_IMAGE_DIMENSION,
    defaultMaxSourceImageDimension
  ),
  maxSourceImagePixels: parsePositiveInt(
    process.env.MAX_SOURCE_IMAGE_PIXELS,
    defaultMaxSourceImagePixels
  ),
  normalizeSourceImageDimension: parsePositiveInt(
    process.env.NORMALIZE_SOURCE_IMAGE_DIMENSION,
    defaultNormalizeSourceImageDimension
  ),
  imageFetchTimeoutMs: parsePositiveInt(process.env.IMAGE_FETCH_TIMEOUT_MS, 15_000),
  openai: {
    apiKey: requireString(process.env.OPENAI_API_KEY, 'OPENAI_API_KEY'),
    model: optionalString(process.env.OPENAI_MODEL, 'gpt-4.1')
  },
  gemini: {
    apiKey: requireString(process.env.GEMINI_API_KEY, 'GEMINI_API_KEY'),
    // model: 'gemini-2.5-flash',
    model: 'gemini-2.5-pro',
    fallbackModels: ['gemini-2.5-flash'],
    // model: optionalString(process.env.GEMINI_MODEL, 'gemini-2.5-flash'),
    // fallbackModels: parseCommaList(process.env.GEMINI_FALLBACK_MODELS, [
    //   'gemini-2.0-flash',
    //   'gemini-2.5-pro'
    // ]),
    maxRetries: parsePositiveInt(process.env.GEMINI_MAX_RETRIES, 3),
    retryBaseMs: parsePositiveInt(process.env.GEMINI_RETRY_BASE_MS, 1000)
  }
};
