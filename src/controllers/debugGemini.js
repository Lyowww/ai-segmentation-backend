// TEMPORARY DEBUG CONTROLLER — remove this file (and its route) after the
// Gemini failure is diagnosed. It exists only because Vercel logs and env
// vars are not accessible to the developer.

import { GoogleGenerativeAI } from '@google/generative-ai';

import { config } from '../config.js';

const MODELS_TO_TEST = [
  ...new Set([
    config.gemini.model,
    ...config.gemini.fallbackModels,
    'gemini-2.5-flash',
    'gemini-2.5-pro'
  ])
];

const maskKey = (key) => {
  if (typeof key !== 'string' || key.length < 8) return 'invalid';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
};

const testModel = async (client, model) => {
  const startedAt = Date.now();
  try {
    const generativeModel = client.getGenerativeModel({ model });
    const result = await generativeModel.generateContent('Reply with the single word: pong');
    const response = await result.response;
    const text = typeof response?.text === 'function' ? response.text() : null;
    return {
      model,
      ok: true,
      durationMs: Date.now() - startedAt,
      text: text?.slice(0, 100) ?? null,
      finishReason: response?.candidates?.[0]?.finishReason ?? null
    };
  } catch (error) {
    return {
      model,
      ok: false,
      durationMs: Date.now() - startedAt,
      status: error?.status ?? error?.cause?.status ?? null,
      message: error?.message ?? null,
      errorDetails: error?.errorDetails ?? null
    };
  }
};

export const debugGemini = async (req, res, next) => {
  try {
    const client = new GoogleGenerativeAI(config.gemini.apiKey);
    const results = [];
    for (const model of MODELS_TO_TEST) {
      results.push(await testModel(client, model));
    }

    res.json({
      warning: 'TEMPORARY DEBUG ENDPOINT — must be removed after diagnosis.',
      configuredModel: config.gemini.model,
      configuredFallbacks: config.gemini.fallbackModels,
      apiKeyMasked: maskKey(config.gemini.apiKey),
      // Full key is only revealed when explicitly requested, so casual
      // visitors of this endpoint do not see the secret.
      apiKey: req.query.revealKey === '1' ? config.gemini.apiKey : undefined,
      results
    });
  } catch (error) {
    next(error);
  }
};
