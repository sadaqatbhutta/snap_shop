export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SnapShop Backend API',
    version: '1.0.0',
    description: 'Production-ready API documentation for SnapShop backend services.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'business_id is required' },
        },
        required: ['status', 'code', 'message'],
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/webhook/{channel}': {
      post: {
        summary: 'Queue inbound webhook event',
        tags: ['Webhook'],
        parameters: [{ name: 'channel', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  business_id: { type: 'string' },
                  user_id: { type: 'string' },
                  message: { type: 'string' },
                },
                required: ['business_id', 'user_id', 'message'],
              },
            },
          },
        },
        responses: {
          '202': { description: 'Job queued' },
          '422': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
  },
};
