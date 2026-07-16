import assert from 'node:assert/strict';
import test from 'node:test';

import sharp from 'sharp';

process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';

const { config } = await import('../src/config.js');
const { readImageMetadata } = await import('../src/compression.js');
const { fetchImageFromUrl, resolveImageInput } = await import('../src/utils/imageSource.js');

test('resolveImageInput downscales very large multipart images before analysis', async () => {
  const largeImageBuffer = await sharp({
    create: {
      width: 5000,
      height: 3200,
      channels: 3,
      background: { r: 180, g: 40, b: 80 }
    }
  }).jpeg({ quality: 90 }).toBuffer();

  const resolved = await resolveImageInput(
    {},
    {
      fieldName: 'image',
      file: {
        buffer: largeImageBuffer,
        mimetype: 'image/jpeg'
      }
    }
  );

  const metadata = await readImageMetadata(resolved.buffer);
  assert.equal(resolved.mimeType, 'image/jpeg');
  assert.ok(metadata.width <= config.normalizeSourceImageDimension);
  assert.ok(metadata.height <= config.normalizeSourceImageDimension);
});

test('fetchImageFromUrl preserves 413 for oversized remote images', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async () => new Response(Buffer.alloc(config.maxRemoteImageBytes + 1), {
    status: 200,
    headers: {
      'content-type': 'image/jpeg'
    }
  });

  await assert.rejects(
    fetchImageFromUrl('https://example.com/image.jpg', 'image'),
    (error) => error?.code === 'LIMIT_FILE_SIZE' && error?.status === 413
  );
});
