import { callOpenAIVision } from './openai.js';
import { callGeminiVision } from './gemini.js';
import { buildUsageSummary } from '../utils/usage.js';

export const SUPPORTED_PROVIDERS = Object.freeze(['openai', 'gemini']);

export const isValidProvider = (provider) => SUPPORTED_PROVIDERS.includes(provider);

/**
 * Provider-agnostic vision call. Returns the raw model content alongside a
 * normalized usage summary so the controller doesn't need to know which
 * provider it talked to.
 *
 * @param {object} params
 * @param {'openai'|'gemini'} params.provider
 * @param {Buffer} params.imageBuffer
 * @param {string} params.mimeType
 * @param {string} params.prompt
 * @param {number} [params.temperature] OpenAI only — Gemini ignores it.
 * @returns {Promise<{ content: string, usage: object }>}
 */
export const callVision = async ({ provider, imageBuffer, mimeType, prompt, temperature }) => {
  if (!isValidProvider(provider)) {
    const error = new Error(`Unsupported provider: ${provider}`);
    error.code = 'INVALID_PROVIDER';
    error.status = 400;
    throw error;
  }

  if (provider === 'openai') {
    const { content, usage, model } = await callOpenAIVision({
      imageBuffer,
      mimeType,
      prompt,
      temperature
    });
    return {
      content,
      usage: buildUsageSummary({ provider: 'openai', model, response: usage })
    };
  }

  const { content, usage, model } = await callGeminiVision({ imageBuffer, mimeType, prompt });
  return {
    content,
    usage: buildUsageSummary({ provider: 'gemini', model, response: usage })
  };
};
