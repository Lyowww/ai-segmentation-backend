import OpenAI from 'openai';

import { config } from '../config.js';

let cachedClient = null;

const getClient = () => {
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return cachedClient;
};

const wrapUpstreamError = (error) => {
  const wrapped = new Error('OpenAI request failed.');
  wrapped.code = 'OPENAI_UPSTREAM_ERROR';
  wrapped.status = 502;
  wrapped.cause = error;
  return wrapped;
};

/**
 * Call OpenAI's chat-completions vision endpoint with a single image.
 *
 * @param {object} params
 * @param {Buffer} params.imageBuffer  Compressed image bytes
 * @param {string} params.mimeType     MIME type of the compressed image
 * @param {string} params.prompt       Full prompt text
 * @param {number} [params.temperature] Sampling temperature (default 0)
 * @returns {Promise<{ content: string, usage: object, model: string }>}
 */
export const callOpenAIVision = async ({ imageBuffer, mimeType, prompt, temperature = 0 }) => {
  const client = getClient();
  const dataUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  const model = config.openai.model;

  let response;
  try {
    response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature
    });
  } catch (error) {
    throw wrapUpstreamError(error);
  }

  const content = response?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.length === 0) {
    const error = new Error('OpenAI returned an empty response.');
    error.code = 'OPENAI_EMPTY_RESPONSE';
    error.status = 502;
    throw error;
  }

  return { content, usage: response, model };
};
