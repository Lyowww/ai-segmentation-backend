import { GoogleGenerativeAI } from '@google/generative-ai';

import { config } from '../config.js';

let cachedClient = null;

const getClient = () => {
  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return cachedClient;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const uniqueModels = (models) => [...new Set(models.filter(Boolean))];

const getErrorStatus = (error) => error?.status ?? error?.cause?.status ?? null;

const isRetryableGeminiError = (error) => {
  const status = getErrorStatus(error);
  return status === 429 || status === 500 || status === 502 || status === 503;
};

const wrapUpstreamError = (error) => {
  const wrapped = new Error('Gemini request failed.');
  wrapped.code = 'GEMINI_UPSTREAM_ERROR';
  wrapped.status = 502;
  wrapped.cause = error;
  return wrapped;
};

const stripMarkdownFences = (text) => {
  const trimmed = text.trim();
  if (trimmed.startsWith('```json')) {
    return trimmed.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  }
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return trimmed;
};

const generateWithModel = async ({ model, imageBuffer, mimeType, prompt }) => {
  const client = getClient();
  const generativeModel = client.getGenerativeModel({ model });

  const result = await generativeModel.generateContent([
    prompt,
    {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType
      }
    }
  ]);

  const response = await result.response;
  const rawText = typeof response?.text === 'function' ? response.text() : null;
  if (typeof rawText !== 'string' || rawText.length === 0) {
    const error = new Error('Gemini returned an empty response.');
    error.code = 'GEMINI_EMPTY_RESPONSE';
    error.status = 502;
    throw error;
  }

  return {
    content: stripMarkdownFences(rawText),
    usage: response,
    model
  };
};

/**
 * Call the Google Gemini multimodal endpoint with a single image. Retries
 * transient overload errors (429/503) and falls back to alternate models
 * when the primary model stays unavailable.
 */
export const callGeminiVision = async ({ imageBuffer, mimeType, prompt }) => {
  const models = uniqueModels([
    config.gemini.model,
    ...config.gemini.fallbackModels
  ]);

  let lastError = null;

  for (const model of models) {
    for (let attempt = 0; attempt <= config.gemini.maxRetries; attempt++) {
      try {
        return await generateWithModel({ model, imageBuffer, mimeType, prompt });
      } catch (error) {
        lastError = error;

        if (!isRetryableGeminiError(error)) {
          throw wrapUpstreamError(error);
        }

        if (attempt < config.gemini.maxRetries) {
          await sleep(config.gemini.retryBaseMs * (2 ** attempt));
          continue;
        }

        break;
      }
    }
  }

  throw wrapUpstreamError(lastError);
};
