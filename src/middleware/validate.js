import { isValidProvider } from '../services/ai.js';

const badRequest = (message, code = 'BAD_REQUEST') => {
  const error = new Error(message);
  error.code = code;
  error.status = 400;
  return error;
};

export const requireProvider = (value) => {
  if (!isValidProvider(value)) {
    throw badRequest(`Invalid provider "${value}". Must be one of: openai, gemini.`, 'INVALID_PROVIDER');
  }
  return value;
};

export const requirePromptVersion = (value, allowed) => {
  if (!allowed.includes(value)) {
    throw badRequest(
      `Invalid promptVersion "${value}". Must be one of: ${allowed.join(', ')}.`,
      'INVALID_PROMPT_VERSION'
    );
  }
  return value;
};

export const requireFile = (file, fieldName) => {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw badRequest(`Missing required file: ${fieldName}.`, 'MISSING_FILE');
  }
  return file;
};

export const parseJsonBodyField = (value, fieldName) => {
  if (value === undefined || value === null) {
    throw badRequest(`Missing required field: ${fieldName}.`, 'MISSING_FIELD');
  }
  if (typeof value === 'object') return value;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw badRequest(`Invalid ${fieldName}: expected JSON.`, 'INVALID_FIELD');
  }
  try {
    return JSON.parse(value);
  } catch {
    throw badRequest(`Invalid ${fieldName}: expected JSON.`, 'INVALID_FIELD');
  }
};
