/**
 * Permissive CORS for all origins. Handles preflight OPTIONS explicitly so
 * multipart uploads (e.g. /api/analyze/multi) work from any frontend host.
 */
export const corsMiddleware = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers']
      || 'Content-Type, Authorization, Accept, Origin, X-Requested-With'
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
};
