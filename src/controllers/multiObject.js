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
import {
  requireFile,
  requireProvider,
  requirePromptVersion
} from '../middleware/validate.js';

const MULTI_OBJECT_TEMPERATURE = 0;

const compressAndCall = async ({ provider, prompt, file }) => {
  const { buffer, mimeType } = await compressImage(file.buffer, COMPRESSION_PRESETS.multiObject);
  return callVision({
    provider,
    imageBuffer: buffer,
    mimeType,
    prompt,
    temperature: MULTI_OBJECT_TEMPERATURE
  });
};

const getUploadedFile = (req, fieldName) => {
  const files = req.files?.[fieldName];
  if (Array.isArray(files) && files.length > 0) return files[0];
  return null;
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
      const file = requireFile(getUploadedFile(req, 'image1'), 'image1');
      const { content, usage } = await compressAndCall({ provider, prompt, file });
      const capsuleGroup = parseCapsuleGroupResponse(content);
      res.json({
        data: { capsuleGroup },
        usage
      });
      return;
    }

    const file1 = requireFile(getUploadedFile(req, 'image1'), 'image1');
    const file2 = requireFile(getUploadedFile(req, 'image2'), 'image2');

    const [result1, result2] = await Promise.all([
      compressAndCall({ provider, prompt, file: file1 }),
      compressAndCall({ provider, prompt, file: file2 })
    ]);

    const image1Results = parseMultiObjectImageResponse(result1.content, 'img1');
    const image2Results = parseMultiObjectImageResponse(result2.content, 'img2');
    const merged = mergeProducts(image1Results, image2Results);

    res.json({
      data: { merged, image1Results, image2Results },
      usage: mergeUsageSummaries([result1.usage, result2.usage])
    });
  } catch (error) {
    next(error);
  }
};
