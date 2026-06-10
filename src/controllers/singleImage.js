import { compressImage, COMPRESSION_PRESETS } from '../compression.js';
import { callVision } from '../services/ai.js';
import {
  getSingleImagePrompt,
  SINGLE_IMAGE_PROMPT_VERSIONS
} from '../prompts/singleImage.js';
import { parseSingleImageResponse } from '../parsers/singleImage.js';
import { resolveImageInput } from '../utils/imageSource.js';
import { requireProvider, requirePromptVersion } from '../middleware/validate.js';

const SINGLE_IMAGE_TEMPERATURE = 0.1;

export const analyzeSingleImage = async (req, res, next) => {
  try {
    const provider = requireProvider(req.body.provider);
    const promptVersion = requirePromptVersion(
      req.body.promptVersion || 'v1',
      SINGLE_IMAGE_PROMPT_VERSIONS
    );

    const { buffer, mimeType } = await resolveImageInput(req, {
      fieldName: 'image',
      file: req.file
    });
    const compressed = await compressImage(buffer, COMPRESSION_PRESETS.singleImage);
    const prompt = getSingleImagePrompt(promptVersion);

    const { content, usage } = await callVision({
      provider,
      imageBuffer: compressed.buffer,
      mimeType: compressed.mimeType,
      prompt,
      temperature: SINGLE_IMAGE_TEMPERATURE
    });

    const data = parseSingleImageResponse(content);
    res.json({ data, usage });
  } catch (error) {
    next(error);
  }
};
