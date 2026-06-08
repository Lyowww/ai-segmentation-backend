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
import { requireProvider, requirePromptVersion } from '../middleware/validate.js';

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

const resolveUploadedImage = async (req, fieldName) => {
  const files = req.files?.[fieldName];
  const file = Array.isArray(files) && files.length > 0 ? files[0] : null;
  return resolveImageInput(req, { fieldName, file });
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

    if (isCapsule) {
      // v4 only counts capsules in image1; image2 is ignored if provided.
      const image1 = await resolveUploadedImage(req, 'image1');
      const { content, usage } = await compressAndCall({
        provider,
        prompt,
        buffer: image1.buffer,
        mimeType: image1.mimeType
      });
      const capsuleGroup = parseCapsuleGroupResponse(content);
      const metrics = extractMetricsFromContent(content, { kind: 'multi' });
      res.json({
        data: { capsuleGroup, ...metrics },
        usage
      });
      return;
    }

    const [image1, image2] = await Promise.all([
      resolveUploadedImage(req, 'image1'),
      resolveUploadedImage(req, 'image2')
    ]);

    const [result1, result2] = await Promise.all([
      compressAndCall({
        provider,
        prompt,
        buffer: image1.buffer,
        mimeType: image1.mimeType
      }),
      compressAndCall({
        provider,
        prompt,
        buffer: image2.buffer,
        mimeType: image2.mimeType
      })
    ]);

    const image1Results = parseMultiObjectImageResponse(result1.content, 'img1');
    const image2Results = parseMultiObjectImageResponse(result2.content, 'img2');
    const merged = mergeProducts(image1Results, image2Results);

    const metrics = mergeAnalysisMetrics([
      extractMetricsFromContent(result1.content, { kind: 'multi' }),
      extractMetricsFromContent(result2.content, { kind: 'multi' })
    ]);

    res.json({
      data: { merged, image1Results, image2Results, ...metrics },
      usage: mergeUsageSummaries([result1.usage, result2.usage])
    });
  } catch (error) {
    next(error);
  }
};
