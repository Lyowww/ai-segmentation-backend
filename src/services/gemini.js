import { GoogleGenerativeAI } from '@google/generative-ai';

import { config } from '../config.js';

let cachedClient = null;

const getClient = () => {
  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return cachedClient;
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

/**
 * Call the Google Gemini multimodal endpoint with a single image. Strips
 * any markdown code fences Gemini may wrap around its JSON output before
 * returning.
 *
 * @param {object} params
 * @param {Buffer} params.imageBuffer  Compressed image bytes
 * @param {string} params.mimeType     MIME type of the compressed image
 * @param {string} params.prompt       Full prompt text
 * @returns {Promise<{ content: string, usage: object, model: string }>}
 */
export const callGeminiVision = async ({ imageBuffer, mimeType, prompt }) => {
  const client = getClient();
  const model = config.gemini.model;
  const generativeModel = client.getGenerativeModel({ model });

  let result;
  try {
    result = await generativeModel.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType
        }
      }
    ]);
  } catch (error) {
    throw wrapUpstreamError(error);
  }

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
