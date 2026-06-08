import multer from 'multer';

import { config } from '../config.js';

const ALLOWED_MIME_PREFIX = 'image/';

const fileFilter = (_req, file, cb) => {
  if (typeof file.mimetype === 'string' && file.mimetype.startsWith(ALLOWED_MIME_PREFIX)) {
    cb(null, true);
    return;
  }
  const error = new Error('Only image uploads are allowed.');
  error.code = 'INVALID_FILE_TYPE';
  error.status = 400;
  cb(error);
};

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    files: 2,
    fileSize: config.maxUploadBytes
  },
  fileFilter
});

export const singleImageUpload = upload.single('image');

export const dualImageUpload = upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 }
]);

/**
 * Skip multer for JSON requests so clients can POST compressed base64 fields
 * (`imageData`, `image1Data`, …) without multipart overhead.
 */
export const optionalMultipart = (uploadMiddleware) => (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    next();
    return;
  }
  uploadMiddleware(req, res, next);
};
