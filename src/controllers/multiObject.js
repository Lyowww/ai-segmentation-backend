import { compressImage, COMPRESSION_PRESETS } from '../compression.js';
import { callVision } from '../services/ai.js';
import {
  getMultiObjectPrompt,
  isMultiObjectCapsuleVersion,
  MULTI_OBJECT_PROMPT_VERSIONS
} from '../prompts/multiObject.js';
import {
  parseMultiObjectImageResponse,
  parseCapsuleGroupResponse,
  mergeProducts
} from '../parsers/multiObject.js';
import { mergeUsageSummaries } from '../utils/usage.js';
import { extractMetricsFromContent, mergeAnalysisMetrics } from '../parsers/metrics.js';
import { resolveImageInput } from '../utils/imageSource.js';
import {
  requireProvider,
  requirePromptVersion,
  parseJsonBodyField
} from '../middleware/validate.js';

const MULTI_OBJECT_TEMPERATURE = 0;

const compressAndCall = async ({ provider, prompt, buffer, mimeType }) => {
  const compressed = await compressImage(buffer, COMPRESSION_PRESETS.multiObject);
  return callVision({
    provider,
    imageBuffer: compressed.buffer,
    mimeType: compressed.mimeType,
    prompt,
    temperature: MULTI_OBJECT_TEMPERATURE
  });
};

const analyzeImage1 = async ({ provider, prompt, promptVersion, image1 }) => {
  const { content, usage } = await compressAndCall({
    provider,
    prompt,
    buffer: image1.buffer,
    mimeType: image1.mimeType
  });

  if (isMultiObjectCapsuleVersion(promptVersion)) {
    const capsuleGroup = parseCapsuleGroupResponse(content);
    const metrics = extractMetricsFromContent(content);
    return {
      data: { capsuleGroup, ...metrics },
      usage
    };
  }

  const image1Results = parseMultiObjectImageResponse(content, 'img1');
  const metrics = extractMetricsFromContent(content);
  return {
    data: { image1Results, ...metrics },
    usage
  };
};

const analyzeImage2AndMerge = async ({
  provider,
  prompt,
  image1Results,
  usage1,
  metrics1,
  image2
}) => {
  const { content, usage: usage2 } = await compressAndCall({
    provider,
    prompt,
    buffer: image2.buffer,
    mimeType: image2.mimeType
  });

  const image2Results = parseMultiObjectImageResponse(content, 'img2');
  const merged = mergeProducts(image1Results, image2Results);
  const metrics2 = extractMetricsFromContent(content);
  const metrics = mergeAnalysisMetrics([metrics1, metrics2]);

  return {
    data: { merged, image1Results, image2Results, ...metrics },
    usage: mergeUsageSummaries([usage1, usage2])
  };
};

export const analyzeMultiObjectImage1 = async (req, res, next) => {
  try {
    const provider = requireProvider(req.body.provider);
    const promptVersion = requirePromptVersion(
      req.body.promptVersion || 'v1',
      MULTI_OBJECT_PROMPT_VERSIONS
    );
    const prompt = getMultiObjectPrompt(promptVersion);
    const image1 = await resolveImageInput(req, { fieldName: 'image1', file: req.file });
    const result = await analyzeImage1({ provider, prompt, promptVersion, image1 });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const analyzeMultiObjectImage2 = async (req, res, next) => {
  try {
    const provider = requireProvider(req.body.provider);
    const promptVersion = requirePromptVersion(
      req.body.promptVersion || 'v1',
      MULTI_OBJECT_PROMPT_VERSIONS
    );

    if (isMultiObjectCapsuleVersion(promptVersion)) {
      const error = new Error('promptVersion v4 only needs /api/analyze/multi/image1.');
      error.code = 'INVALID_PROMPT_VERSION';
      error.status = 400;
      throw error;
    }

    const prompt = getMultiObjectPrompt(promptVersion);
    const image1Results = parseJsonBodyField(req.body.image1Results, 'image1Results');
    const usage1 = parseJsonBodyField(req.body.usage1, 'usage1');
    const metrics1 = req.body.metrics1
      ? parseJsonBodyField(req.body.metrics1, 'metrics1')
      : {};
    const image2 = await resolveImageInput(req, { fieldName: 'image2', file: req.file });
    const result = await analyzeImage2AndMerge({
      provider,
      prompt,
      image1Results,
      usage1,
      metrics1,
      image2
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const analyzeMultiObject = async (req, res, next) => {
  try {
    const provider = requireProvider(req.body.provider);
    const promptVersion = requirePromptVersion(
      req.body.promptVersion || 'v1',
      MULTI_OBJECT_PROMPT_VERSIONS
    );

    const isCapsule = isMultiObjectCapsuleVersion(promptVersion);
    const prompt = getMultiObjectPrompt(promptVersion);

    const image1File = req.files?.image1?.[0] ?? null;
    const image2File = req.files?.image2?.[0] ?? null;
    const image1 = await resolveImageInput(req, { fieldName: 'image1', file: image1File });

    if (isCapsule) {
      const result = await analyzeImage1({ provider, prompt, promptVersion, image1 });
      res.json(result);
      return;
    }

    const image2 = await resolveImageInput(req, { fieldName: 'image2', file: image2File });
    const step1 = await analyzeImage1({ provider, prompt, promptVersion, image1 });
    const result = await analyzeImage2AndMerge({
      provider,
      prompt,
      image1Results: step1.data.image1Results,
      usage1: step1.usage,
      metrics1: step1.data,
      image2
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};
