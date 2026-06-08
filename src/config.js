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

export const config = {
  port: parsePositiveInt(process.env.PORT, 3001),
  openai: {
    apiKey: requireString(process.env.OPENAI_API_KEY, 'OPENAI_API_KEY'),
    model: optionalString(process.env.OPENAI_MODEL, 'gpt-4.1')
  },
  gemini: {
    apiKey: requireString(process.env.GEMINI_API_KEY, 'GEMINI_API_KEY'),
    model: optionalString(process.env.GEMINI_MODEL, 'gemini-2.5-pro')
  }
};
