/**
 * OpenAPI 3.0 specification for the Recypic backend.
 * Served at GET /api-docs/openapi.json and rendered by Swagger UI at /api-docs.
 */

const providerEnum = ['openai', 'gemini'];

const bboxSchema = {
  type: 'object',
  nullable: true,
  properties: {
    x: { type: 'number', minimum: 0, maximum: 1 },
    y: { type: 'number', minimum: 0, maximum: 1 },
    width: { type: 'number', minimum: 0, maximum: 1 },
    height: { type: 'number', minimum: 0, maximum: 1 }
  }
};

const productSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    brand: { type: 'string' },
    brand_confidence: { type: 'number', minimum: 0, maximum: 1 },
    category: { type: 'string' },
    category_confidence: { type: 'number', minimum: 0, maximum: 1 },
    material: { type: 'string' },
    material_confidence: { type: 'number', minimum: 0, maximum: 1 },
    color: { type: 'string' },
    color_confidence: { type: 'number', minimum: 0, maximum: 1 },
    bbox: bboxSchema
  }
};

const multiObjectProductSchema = {
  allOf: [
    productSchema,
    {
      type: 'object',
      properties: {
        cap_color: { type: 'string' },
        cap_color_confidence: { type: 'number', minimum: 0, maximum: 1 },
        zindex: { type: 'string' },
        zindex_confidence: { type: 'number', minimum: 0, maximum: 1 },
        visible_part: { type: 'number' }
      }
    }
  ]
};

const mergedProductSchema = {
  allOf: [
    multiObjectProductSchema,
    {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          enum: ['both_images', 'image1_only', 'image2_only']
        },
        image1_bbox: bboxSchema,
        image2_bbox: bboxSchema
      }
    }
  ]
};

const analysisMetricsProperties = {
  ai_co2_kg: {
    type: 'number',
    nullable: true,
    minimum: 0,
    description: 'AI-estimated CO2 equivalent for visible waste (kg)'
  },
  estimated_weight_kg: {
    type: 'number',
    nullable: true,
    minimum: 0,
    description: 'AI-estimated total weight of visible waste (kg)'
  },
  purity: {
    type: 'number',
    nullable: true,
    minimum: 0,
    maximum: 1,
    description: 'Stream purity (1.0 = perfectly sorted, no contamination)'
  }
};

const usageSummarySchema = {
  type: 'object',
  nullable: true,
  properties: {
    provider: { type: 'string', example: 'openai' },
    model: { type: 'string', example: 'gpt-4.1' },
    inputTokens: { type: 'integer', nullable: true },
    outputTokens: { type: 'integer', nullable: true },
    totalTokens: { type: 'integer', nullable: true },
    inputCost: { type: 'number', nullable: true },
    outputCost: { type: 'number', nullable: true },
    totalCost: { type: 'number', nullable: true },
    currency: { type: 'string', example: 'USD' }
  }
};

const errorSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string', example: 'INVALID_PROVIDER' },
        message: { type: 'string', example: 'Invalid provider "foo". Must be one of: openai, gemini.' }
      }
    }
  }
};

const providerField = {
  type: 'string',
  enum: providerEnum,
  description: 'AI vision provider'
};

const imageFileField = {
  type: 'string',
  format: 'binary',
  description: 'Image file (must be image/*)'
};

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Recypic API',
    version: '1.0.0',
    description:
      'Backend for the Recypic AI waste segmentation app. All analysis endpoints accept `multipart/form-data` with image uploads and return a normalized `{ data, usage }` envelope.'
  },
  servers: [
    { url: 'http://localhost:3001', description: 'Local development' }
  ],
  tags: [
    { name: 'Health', description: 'Liveness and readiness' },
    { name: 'Analysis', description: 'AI vision analysis endpoints' }
  ],
  paths: {
    '/healthz': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns server liveness. No side effects.',
        operationId: 'getHealth',
        responses: {
          200: {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/analyze/single': {
      post: {
        tags: ['Analysis'],
        summary: 'Single-image product identification',
        description:
          'Identifies consumer products in a single scene image with optional bounding boxes. Temperature 0.1; compression 768px JPEG q=0.18.',
        operationId: 'analyzeSingle',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image', 'provider'],
                properties: {
                  image: imageFileField,
                  provider: providerField,
                  promptVersion: {
                    type: 'string',
                    enum: ['v1', 'v2', 'v3'],
                    default: 'v1',
                    description: 'Prompt template version'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Analysis succeeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SingleImageResponse' }
              }
            }
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: errorSchema } } },
          413: { description: 'File too large', content: { 'application/json': { schema: errorSchema } } },
          502: { description: 'Upstream AI provider error', content: { 'application/json': { schema: errorSchema } } },
          500: { description: 'Internal error', content: { 'application/json': { schema: errorSchema } } }
        }
      }
    },
    '/api/analyze/multi': {
      post: {
        tags: ['Analysis'],
        summary: 'Multi-image object identification',
        description:
          'Analyzes two images of the same scene and merges duplicate products (v1–v3). With `promptVersion=v4`, only `image1` is used for coffee capsule group counting; `image2` is ignored. Temperature 0; compression 512px WebP q=0.70.',
        operationId: 'analyzeMulti',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image1', 'provider'],
                properties: {
                  image1: { ...imageFileField, description: 'First image (required for all versions)' },
                  image2: {
                    ...imageFileField,
                    description: 'Second image (required for v1–v3; ignored for v4)'
                  },
                  provider: providerField,
                  promptVersion: {
                    type: 'string',
                    enum: ['v1', 'v2', 'v3', 'v4'],
                    default: 'v1'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Analysis succeeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MultiObjectResponse' }
              }
            }
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: errorSchema } } },
          413: { description: 'File too large', content: { 'application/json': { schema: errorSchema } } },
          502: { description: 'Upstream AI provider error', content: { 'application/json': { schema: errorSchema } } },
          500: { description: 'Internal error', content: { 'application/json': { schema: errorSchema } } }
        }
      }
    },
    '/api/analyze/food-waste': {
      post: {
        tags: ['Analysis'],
        summary: 'Food waste caddy analysis',
        description:
          'Detects organic food waste, organics contamination, recyclables in the caddy, and other items. Temperature 0; compression 768px JPEG q=0.18.',
        operationId: 'analyzeFoodWaste',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image', 'provider'],
                properties: {
                  image: imageFileField,
                  provider: providerField
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Analysis succeeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FoodWasteResponse' }
              }
            }
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: errorSchema } } },
          413: { description: 'File too large', content: { 'application/json': { schema: errorSchema } } },
          502: { description: 'Upstream AI provider error', content: { 'application/json': { schema: errorSchema } } },
          500: { description: 'Internal error', content: { 'application/json': { schema: errorSchema } } }
        }
      }
    },
    '/api/analyze/recyclables': {
      post: {
        tags: ['Analysis'],
        summary: 'Recyclables in transparent bag',
        description:
          'Detects recyclables and bio-waste contamination in a transparent bag. Temperature 0; compression 1024px JPEG q=0.40.',
        operationId: 'analyzeRecyclables',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image', 'provider'],
                properties: {
                  image: imageFileField,
                  provider: providerField
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Analysis succeeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RecyclablesResponse' }
              }
            }
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: errorSchema } } },
          413: { description: 'File too large', content: { 'application/json': { schema: errorSchema } } },
          502: { description: 'Upstream AI provider error', content: { 'application/json': { schema: errorSchema } } },
          500: { description: 'Internal error', content: { 'application/json': { schema: errorSchema } } }
        }
      }
    }
  },
  components: {
    schemas: {
      UsageSummary: usageSummarySchema,
      AnalysisMetrics: {
        type: 'object',
        properties: analysisMetricsProperties
      },
      SingleImageData: {
        type: 'object',
        properties: {
          products: { type: 'array', items: productSchema },
          food_waste_items: { type: 'array', items: { type: 'string' } },
          containers_with_food_or_drink: { type: 'array', items: { type: 'string' } },
          organics_contamination_present: { type: 'boolean' },
          organics_contamination_items: { type: 'array', items: { type: 'string' } },
          ...analysisMetricsProperties
        }
      },
      SingleImageResponse: {
        type: 'object',
        properties: {
          data: { $ref: '#/components/schemas/SingleImageData' },
          usage: { $ref: '#/components/schemas/UsageSummary' }
        }
      },
      MultiObjectStandardData: {
        type: 'object',
        properties: {
          merged: { type: 'array', items: mergedProductSchema },
          image1Results: { type: 'array', items: multiObjectProductSchema },
          image2Results: { type: 'array', items: multiObjectProductSchema },
          ...analysisMetricsProperties
        }
      },
      CapsuleGroup: {
        type: 'object',
        properties: {
          approx_count: { type: 'integer', nullable: true },
          count_range: {
            type: 'object',
            nullable: true,
            properties: {
              min: { type: 'integer' },
              max: { type: 'integer' }
            }
          },
          brand: { type: 'string' },
          brand_confidence: { type: 'number' },
          category: { type: 'string', example: 'coffee_capsule' },
          category_confidence: { type: 'number' },
          material: { type: 'string' },
          material_confidence: { type: 'number' }
        }
      },
      MultiObjectCapsuleData: {
        type: 'object',
        properties: {
          capsuleGroup: { $ref: '#/components/schemas/CapsuleGroup' },
          ...analysisMetricsProperties
        }
      },
      MultiObjectResponse: {
        type: 'object',
        properties: {
          data: {
            oneOf: [
              { $ref: '#/components/schemas/MultiObjectStandardData' },
              { $ref: '#/components/schemas/MultiObjectCapsuleData' }
            ]
          },
          usage: { $ref: '#/components/schemas/UsageSummary' }
        }
      },
      FoodWasteData: {
        type: 'object',
        properties: {
          has_organic_food_waste: { type: 'boolean' },
          food_waste_confidence: { type: 'number', minimum: 0, maximum: 1 },
          organics_contamination_present: { type: 'boolean' },
          organics_contamination_items: { type: 'array', items: { type: 'string' } },
          recyclables_present: { type: 'boolean' },
          recyclable_items: { type: 'array', items: { type: 'string' } },
          other_items: { type: 'array', items: productSchema },
          ...analysisMetricsProperties
        }
      },
      FoodWasteResponse: {
        type: 'object',
        properties: {
          data: { $ref: '#/components/schemas/FoodWasteData' },
          usage: { $ref: '#/components/schemas/UsageSummary' }
        }
      },
      RecyclablesData: {
        type: 'object',
        properties: {
          recyclables_present: { type: 'boolean' },
          contamination_score: { type: 'number', nullable: true },
          contamination_items: { type: 'array', items: { type: 'string' } },
          contamination_reason: { type: 'string' },
          food_waste_items: { type: 'array', items: { type: 'string' } },
          ...analysisMetricsProperties
        }
      },
      RecyclablesResponse: {
        type: 'object',
        properties: {
          data: { $ref: '#/components/schemas/RecyclablesData' },
          usage: { $ref: '#/components/schemas/UsageSummary' }
        }
      },
      ErrorEnvelope: errorSchema
    }
  }
};
