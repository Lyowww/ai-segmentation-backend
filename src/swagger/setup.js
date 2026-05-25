import { openApiSpec } from './openapi.js';

const SWAGGER_UI_VERSION = '5.32.6';
const SWAGGER_UI_CDN = `https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}`;

const buildOpenApiServers = () => {
  const servers = [{ url: 'http://localhost:3001', description: 'Local development' }];
  if (process.env.VERCEL_URL) {
    servers.unshift({
      url: `https://${process.env.VERCEL_URL}`,
      description: 'Vercel deployment'
    });
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
        tryItOutEnabled: true
      });
    };
  </script>
</body>
</html>`;

export const setupSwagger = (app) => {
  app.get('/api-docs/openapi.json', (_req, res) => {
    res.json({ ...openApiSpec, servers: buildOpenApiServers() });
  });

  app.get('/api-docs', (_req, res) => {
    res.type('html').send(swaggerUiHtml());
  });
};
