import { openApiSpec } from './openapi.js';

const SWAGGER_UI_VERSION = '5.32.6';
const SWAGGER_UI_CDN = `https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}`;

/** Match the host the browser used (preview URL, production alias, localhost). */
export const buildOpenApiServers = (req) => {
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host');
  const current = `${proto}://${host}`;

  const servers = [{ url: current, description: 'Current host' }];

  if (!process.env.VERCEL) {
    servers.push({ url: 'http://localhost:3001', description: 'Local development (npm start)' });
  }

  return servers;
};

const swaggerUiHtml = () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Recypic API Docs</title>
  <link rel="stylesheet" href="${SWAGGER_UI_CDN}/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_UI_CDN}/swagger-ui-bundle.js" crossorigin></script>
  <script src="${SWAGGER_UI_CDN}/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: '/api-docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: 'StandaloneLayout',
        persistAuthorization: true,
        tryItOutEnabled: true,
        requestInterceptor: function (request) {
          request.credentials = 'include';
          return request;
        }
      });
    };
  </script>
</body>
</html>`;

export const setupSwagger = (app) => {
  app.get('/api-docs/openapi.json', (req, res) => {
    res.json({ ...openApiSpec, servers: buildOpenApiServers(req) });
  });

  app.get('/api-docs', (_req, res) => {
    res.type('html').send(swaggerUiHtml());
  });
};
