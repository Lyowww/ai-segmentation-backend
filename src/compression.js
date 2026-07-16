import sharp from 'sharp';

import { config } from './config.js';

/**
 * Compression presets per endpoint. These mirror the client-side canvas
 * settings that the React app used before — each preset is intentionally
 * tuned for the kind of detection that screen does. Do not unify them
 * without understanding the detection trade-offs.
 *
 * The `quality` field is on the 0–1 scale (matching the original
 * canvas.toBlob() values) and is converted to sharp's 1–100 scale
 * inside `compressImage`.
 */
export const COMPRESSION_PRESETS = Object.freeze({
  singleImage: { maxDimension: 768, quality: 0.18, format: 'jpeg' },
  multiObject: { maxDimension: 512, quality: 0.7, format: 'webp' },
  foodWaste: { maxDimension: 768, quality: 0.18, format: 'jpeg' },
  recyclables: { maxDimension: 1024, quality: 0.4, format: 'jpeg' }
});

export const SOURCE_IMAGE_PRESET = Object.freeze({
  maxDimension: config.normalizeSourceImageDimension,
  quality: 0.82,
  format: 'jpeg'
});

const FORMAT_MIME = {
  jpeg: 'image/jpeg',
  webp: 'image/webp'
};

const toSharpQuality = (quality) => {
  const value = Math.round(quality * 100);
  if (!Number.isFinite(value)) return 80;
  return Math.min(100, Math.max(1, value));
};

/**
 * Compress an uploaded image buffer using one of the named presets.
 * Auto-rotates based on EXIF metadata so portrait photos from phones
 * arrive at the model in the correct orientation.
 */
export const compressImage = async (buffer, preset) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('compressImage: empty image buffer');
  }
  if (!preset || typeof preset !== 'object') {
    throw new Error('compressImage: missing preset');
  }

  const { maxDimension, quality, format } = preset;
  const mimeType = FORMAT_MIME[format];
  if (!mimeType) {
    throw new Error(`compressImage: unsupported format "${format}"`);
  }

  const pipeline = sharp(buffer)
    .rotate()
    .resize(maxDimension, maxDimension, {
      fit: 'inside',
      withoutEnlargement: true
    });

  const sharpQuality = toSharpQuality(quality);
  const compressed = format === 'webp'
    ? await pipeline.webp({ quality: sharpQuality }).toBuffer()
    : await pipeline.jpeg({ quality: sharpQuality, mozjpeg: true }).toBuffer();

  return { buffer: compressed, mimeType };
};

export const readImageMetadata = async (buffer) => {
  const metadata = await sharp(buffer).metadata();
  const width = Number.isFinite(metadata.width) ? metadata.width : null;
  const height = Number.isFinite(metadata.height) ? metadata.height : null;

  return {
    width,
    height,
    format: metadata.format || null,
    pixelCount: width && height ? width * height : null
  };
};

export const normalizeSourceImage = async (buffer, preset = SOURCE_IMAGE_PRESET) => {
  return compressImage(buffer, preset);
};
