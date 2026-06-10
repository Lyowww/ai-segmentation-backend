import { compressImage, COMPRESSION_PRESETS } from '../compression.js';
import { callVision } from '../services/ai.js';
import { getFoodWastePrompt } from '../prompts/foodWaste.js';
import { parseFoodWasteResponse } from '../parsers/foodWaste.js';
import { resolveImageInput } from '../utils/imageSource.js';
import { requireProvider } from '../middleware/validate.js';

const FOOD_WASTE_TEMPERATURE = 0;

export const analyzeFoodWaste = async (req, res, next) => {
  try {
    const provider = requireProvider(req.body.provider);

    const { buffer, mimeType } = await resolveImageInput(req, {
      fieldName: 'image',
      file: req.file
    });
    const compressed = await compressImage(buffer, COMPRESSION_PRESETS.foodWaste);

    const { content, usage } = await callVision({
      provider,
      imageBuffer: compressed.buffer,
      mimeType: compressed.mimeType,
      prompt: getFoodWastePrompt(),
      temperature: FOOD_WASTE_TEMPERATURE
    });

    const data = parseFoodWasteResponse(content);
    res.json({ data, usage });
  } catch (error) {
    next(error);
  }
};
