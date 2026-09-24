import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BIZLY Enterprise API',
      version: '1.0.0',
      description:
        'Documentación OpenAPI profesional para la suite SaaS BIZLY (Punto de Venta, Inventario, Auditoría y Analítica Kleene.ai).',
      contact: {
        name: 'Soporte Técnico BIZLY',
        email: 'soporte@bizly.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:4001/api',
        description: 'Servidor Local de Desarrollo',
      },
      {
        url: '/api',
        description: 'Ruta Relativa de Producción',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Autenticación mediante JWT Bearer token. Ejemplo en cabecera: "Authorization: Bearer <token>"',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    paths: {
      '/auth/login': {
        post: {
          tags: ['Autenticación'],
          summary: 'Iniciar sesión de usuario',
          description:
            'Valida las credenciales de un colaborador o administrador, emitiendo un token JWT firmado para la sesión.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'admin@bizly.com',
                    },
                    password: {
                      type: 'string',
                      format: 'password',
                      example: 'Admin123*',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Autenticación exitosa',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' },
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                      usuario: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer', example: 1 },
                          nombre: { type: 'string', example: 'Administrador' },
                          correo: { type: 'string', example: 'admin@bizly.com' },
                          rol: { type: 'string', example: 'owner' },
                          id_empresa: { type: 'integer', example: 1 },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Credenciales inválidas o cuenta inactiva',
            },
            '403': {
              description: 'Cuenta pendiente de activación OTP',
            },
          },
        },
      },
      '/reportes/resumen': {
        get: {
          tags: ['Reportes e Inteligencia de Negocios'],
          summary: 'Resumen financiero y analítica (Patrón Kleene.ai)',
          description:
            'Calcula métricas agregadas, series de tiempo diarias, Top 5 productos y distribución de métodos de pago en el rango indicado.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'desde',
              in: 'query',
              required: false,
              schema: { type: 'string', format: 'date', example: '2026-01-01' },
              description: 'Fecha inicial del rango en formato YYYY-MM-DD',
            },
            {
              name: 'hasta',
              in: 'query',
              required: false,
              schema: { type: 'string', format: 'date', example: '2026-12-31' },
              description: 'Fecha final del rango en formato YYYY-MM-DD',
            },
          ],
          responses: {
            '200': {
              description: 'Resumen analítico obtenido exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      rango: {
                        type: 'object',
                        properties: {
                          desde: { type: 'string', example: '2026-01-01' },
                          hasta: { type: 'string', example: '2026-12-31' },
                        },
                      },
                      ventas_totales: { type: 'number', example: 15400000 },
                      subtotal: { type: 'number', example: 12941176.47 },
                      impuestos: { type: 'number', example: 2458823.53 },
                      total_transacciones: { type: 'integer', example: 42 },
                      ticket_promedio: { type: 'number', example: 366666.67 },
                      serie_tiempo: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            fecha: { type: 'string', example: '2026-09-18' },
                            creado_en: { type: 'string', example: '2026-09-18' },
                            total: { type: 'number', example: 850000 },
                            transacciones: { type: 'integer', example: 3 },
                          },
                        },
                      },
                      productos_top: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id_producto: { type: 'integer', example: 1 },
                            nombre: { type: 'string', example: 'Taladro Percutor 650W' },
                            sku: { type: 'string', example: 'FERR-001' },
                            cantidad_vendida: { type: 'integer', example: 12 },
                            ingresos: { type: 'number', example: 3360000 },
                          },
                        },
                      },
                      metodos_pago: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            metodo: { type: 'string', example: 'Efectivo' },
                            total: { type: 'number', example: 9800000 },
                            transacciones: { type: 'integer', example: 28 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Formato de fecha inválido o rango incoherente',
            },
            '401': {
              description: 'No autorizado / Token ausente o expirado',
            },
          },
        },
      },
      '/ventas': {
        post: {
          tags: ['Ventas (Punto de Venta)'],
          summary: 'Registrar una nueva venta transaccional',
          description:
            'Procesa el carrito de compras con control de concurrencia y validación estricta de stock disponible (SELECT FOR UPDATE).',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items'],
                  properties: {
                    id_cliente: { type: 'integer', nullable: true, example: 1 },
                    metodo_pago: {
                      type: 'string',
                      enum: ['Efectivo', 'Tarjeta', 'Transferencia'],
                      example: 'Efectivo',
                    },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['id_producto', 'cantidad'],
                        properties: {
                          id_producto: { type: 'integer', example: 1 },
                          cantidad: { type: 'integer', example: 2 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Venta completada y stock descontado',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      mensaje: { type: 'string', example: 'Venta registrada con éxito' },
                      id_venta: { type: 'integer', example: 84 },
                      total: { type: 'number', example: 560000 },
                      subtotal: { type: 'number', example: 470588.24 },
                      impuesto: { type: 'number', example: 89411.76 },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Stock insuficiente o parámetros incorrectos',
            },
            '401': {
              description: 'No autorizado',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
export default swaggerSpec;
