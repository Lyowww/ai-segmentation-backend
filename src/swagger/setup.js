import swaggerUi from 'swagger-ui-express';

import { openApiSpec } from './openapi.js';

export const setupSwagger = (app) => {
  app.get('/api-docs/openapi.json', (_req, res) => {
    res.json(openApiSpec);
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
