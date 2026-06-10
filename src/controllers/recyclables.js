import { compressImage, COMPRESSION_PRESETS } from '../compression.js';
import { callVision } from '../services/ai.js';
import { getRecyclablesPrompt } from '../prompts/recyclables.js';
import { parseRecyclablesResponse } from '../parsers/recyclables.js';
import { requireFile, requireProvider } from '../middleware/validate.js';

const RECYCLABLES_TEMPERATURE = 0;

export const analyzeRecyclables = async (req, res, next) => {
  try {
    const file = requireFile(req.file, 'image');
    const provider = requireProvider(req.body.provider);

    const { buffer, mimeType } = await compressImage(file.buffer, COMPRESSION_PRESETS.recyclables);

    const { content, usage } = await callVision({
      provider,
      imageBuffer: buffer,
      mimeType,
      prompt: getRecyclablesPrompt(),
      temperature: RECYCLABLES_TEMPERATURE
    });

    const data = parseRecyclablesResponse(content);
    res.json({ data, usage });
  } catch (error) {
    next(error);
  }
};
