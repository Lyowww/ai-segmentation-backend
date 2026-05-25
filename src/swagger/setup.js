import swaggerUi from 'swagger-ui-express';

import { openApiSpec } from './openapi.js';

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

export const setupSwagger = (app) => {
  app.get('/api-docs/openapi.json', (_req, res) => {
    res.json({ ...openApiSpec, servers: buildOpenApiServers() });
  });

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'Recypic API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        tryItOutEnabled: true
      }
    })
  );
};
