import multer from 'multer';

const STATUS_BY_CODE = {
  LIMIT_FILE_SIZE: 413,
  LIMIT_FILE_COUNT: 400,
  LIMIT_UNEXPECTED_FILE: 400
};

const sanitizeMessage = (message) => {
  if (typeof message !== 'string' || message.length === 0) {
    return 'Internal server error.';
  }
  return message;
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const status = STATUS_BY_CODE[err.code] || 400;
    res.status(status).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
    return;
  }

  const status = Number.isInteger(err?.status) ? err.status : 500;
  const code = typeof err?.code === 'string' ? err.code : 'INTERNAL_ERROR';
  const message = sanitizeMessage(err?.message);

  if (status >= 500) {
    console.error(`[error] ${code}: ${message}`);
    if (err?.cause) console.error(err.cause);
  }

  // TEMPORARY DEBUG — remove after diagnosis. Surfaces err.details set by
  // upstream wrappers so failures can be diagnosed without Vercel logs.
  const details = err?.details ?? undefined;

  res.status(status).json({
    error: { code, message, ...(details ? { details } : {}) }
  });
};

export const notFoundHandler = (_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Resource not found.' }
  });
};
