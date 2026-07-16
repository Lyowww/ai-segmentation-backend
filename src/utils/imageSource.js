import { config } from '../config.js';
import { normalizeSourceImage, readImageMetadata } from '../compression.js';

const DATA_URL_RE = /^data:(image\/[\w.+-]+);base64,(.+)$/i;

const badRequest = (message, code = 'BAD_REQUEST', status = 400) => {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
};

const isPrivateIpv4 = (octets) => {
  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 0) return true;
  return false;
};

const assertSafeImageUrl = (rawUrl) => {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw badRequest('Invalid image URL.', 'INVALID_IMAGE_URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw badRequest('Image URL must use http or https.', 'INVALID_IMAGE_URL');
  }

  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === '0.0.0.0') {
    throw badRequest('Image URL host is not allowed.', 'INVALID_IMAGE_URL');
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const octets = ipv4.slice(1).map((part) => Number.parseInt(part, 10));
    if (octets.some((part) => part > 255) || isPrivateIpv4(octets)) {
      throw badRequest('Image URL host is not allowed.', 'INVALID_IMAGE_URL');
    }
  }

  if (host === '[::1]' || host.startsWith('fc') || host.startsWith('fd')) {
    throw badRequest('Image URL host is not allowed.', 'INVALID_IMAGE_URL');
  }

  return parsed.toString();
};

const assertImageMime = (mimeType) => {
  if (typeof mimeType !== 'string' || !mimeType.startsWith('image/')) {
    throw badRequest('URL did not return an image.', 'INVALID_IMAGE_URL');
  }
  return mimeType;
};

const assertMaxBytes = (byteLength, fieldName, limitBytes) => {
  if (byteLength > limitBytes) {
    const limitMb = (limitBytes / (1024 * 1024)).toFixed(1);
    throw badRequest(
      `${fieldName} exceeds the ${limitMb} MiB limit. Compress the image on the client or use a smaller file.`,
      'LIMIT_FILE_SIZE',
      413
    );
  }
};

const assertImageDimensions = (metadata, fieldName) => {
  const { width, height, pixelCount } = metadata;

  if (
    width &&
    height &&
    (width > config.maxSourceImageDimension || height > config.maxSourceImageDimension)
  ) {
    throw badRequest(
      `${fieldName} dimensions exceed the ${config.maxSourceImageDimension}px safety limit.`,
      'LIMIT_IMAGE_DIMENSIONS',
      413
    );
  }

  if (pixelCount && pixelCount > config.maxSourceImagePixels) {
    throw badRequest(
      `${fieldName} exceeds the ${config.maxSourceImagePixels.toLocaleString('en-US')} pixel safety limit.`,
      'LIMIT_IMAGE_PIXELS',
      413
    );
  }
};

const normalizeAcceptedImage = async ({ buffer, mimeType, fieldName }) => {
  let metadata;
  try {
    metadata = await readImageMetadata(buffer);
  } catch {
    throw badRequest(`Invalid image data for ${fieldName}.`, 'INVALID_IMAGE_DATA');
  }

  assertImageDimensions(metadata, fieldName);

  const shouldNormalize =
    Boolean(metadata.width && metadata.width > config.normalizeSourceImageDimension) ||
    Boolean(metadata.height && metadata.height > config.normalizeSourceImageDimension);

  if (!shouldNormalize) {
    return { buffer, mimeType };
  }

  try {
    return await normalizeSourceImage(buffer);
  } catch {
    throw badRequest(`Invalid image data for ${fieldName}.`, 'INVALID_IMAGE_DATA');
  }
};

export const decodeBase64Image = (value, fieldName) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw badRequest(`Missing required image: ${fieldName}.`, 'MISSING_FILE');
  }

  let mimeType = 'image/jpeg';
  let encoded = value.trim();

  const dataUrlMatch = DATA_URL_RE.exec(encoded);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1].toLowerCase();
    encoded = dataUrlMatch[2];
  }

  assertImageMime(mimeType);

  let buffer;
  try {
    buffer = Buffer.from(encoded, 'base64');
  } catch {
    throw badRequest(`Invalid base64 image data for ${fieldName}.`, 'INVALID_IMAGE_DATA');
  }

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw badRequest(`Missing required image: ${fieldName}.`, 'MISSING_FILE');
  }

  assertMaxBytes(buffer.length, fieldName, config.maxBase64ImageBytes);
  return { buffer, mimeType };
};

export const fetchImageFromUrl = async (value, fieldName) => {
  const url = assertSafeImageUrl(value);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.imageFetchTimeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { Accept: 'image/*' }
    });

    if (!response.ok) {
      throw badRequest(`Could not fetch image for ${fieldName} (HTTP ${response.status}).`, 'INVALID_IMAGE_URL');
    }

    const mimeType = assertImageMime(
      (response.headers.get('content-type') || 'image/jpeg').split(';')[0].trim()
    );
    const contentLength = Number.parseInt(response.headers.get('content-length') || '', 10);
    if (Number.isFinite(contentLength) && contentLength > 0) {
      assertMaxBytes(contentLength, fieldName, config.maxRemoteImageBytes);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      throw badRequest(`Missing required image: ${fieldName}.`, 'MISSING_FILE');
    }

    assertMaxBytes(buffer.length, fieldName, config.maxRemoteImageBytes);
    return { buffer, mimeType };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw badRequest(`Timed out fetching image for ${fieldName}.`, 'INVALID_IMAGE_URL');
    }
    if (error?.status) throw error;
    throw badRequest(`Could not fetch image for ${fieldName}.`, 'INVALID_IMAGE_URL');
  } finally {
    clearTimeout(timeout);
  }
};

export const resolveImageInput = async (req, { fieldName, file }) => {
  if (file?.buffer?.length) {
    return normalizeAcceptedImage({
      buffer: file.buffer,
      mimeType: file.mimetype || 'image/jpeg',
      fieldName
    });
  }

  const dataField = `${fieldName}Data`;
  const urlField = `${fieldName}Url`;
  const dataValue = req.body?.[dataField];
  const urlValue = req.body?.[urlField];

  if (typeof dataValue === 'string' && dataValue.trim().length > 0) {
    const decoded = decodeBase64Image(dataValue, fieldName);
    return normalizeAcceptedImage({ ...decoded, fieldName });
  }

  if (typeof urlValue === 'string' && urlValue.trim().length > 0) {
    const fetched = await fetchImageFromUrl(urlValue, fieldName);
    return normalizeAcceptedImage({ ...fetched, fieldName });
  }

  throw badRequest(
    `Missing required image: ${fieldName}. Send a file, ${dataField} (base64), or ${urlField}.`,
    'MISSING_FILE'
  );
};
