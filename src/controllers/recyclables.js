import { compressImage, COMPRESSION_PRESETS } from '../compression.js';
import { callVision } from '../services/ai.js';
import { getRecyclablesPrompt } from '../prompts/recyclables.js';
import { parseRecyclablesResponse } from '../parsers/recyclables.js';
import { resolveImageInput } from '../utils/imageSource.js';
import { requireProvider } from '../middleware/validate.js';

const RECYCLABLES_TEMPERATURE = 0;

export const analyzeRecyclables = async (req, res, next) => {
  try {
    const provider = requireProvider(req.body.provider);

    const { buffer, mimeType } = await resolveImageInput(req, {
      fieldName: 'image',
      file: req.file
    });
    const compressed = await compressImage(buffer, COMPRESSION_PRESETS.recyclables);

    const { content, usage } = await callVision({
      provider,
      imageBuffer: compressed.buffer,
      mimeType: compressed.mimeType,
      prompt: getRecyclablesPrompt(),
      temperature: RECYCLABLES_TEMPERATURE
    });

    const data = parseRecyclablesResponse(content);
    res.json({ data, usage });
  } catch (error) {
    next(error);
  }
};
