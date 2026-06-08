import multer from 'multer';

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
    files: 2
  },
  fileFilter
});

export const singleImageUpload = upload.single('image');

export const dualImageUpload = upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 }
]);
