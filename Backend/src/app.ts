import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import AppError from './utils/AppError';
import errorHandler from './middlewares/errorHandler.middleware';
import authRoutes from './routes/auth.routes';
import ventasRoutes from './routes/ventas.routes';
import productosRoutes from './routes/productos.routes';
import clientesRoutes from './routes/clientes.routes';
import usuariosRoutes from './routes/usuarios.routes';
import dashboardRoutes from './routes/dashboard.routes';
import empresaRoutes from './routes/empresa.routes';
import auditoriaRoutes from './routes/auditoria.routes';
import reportesRoutes from './routes/reportes.routes';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';

const app: Application = express();

// Protección de cabeceras HTTP con Helmet (CSP flexible para renderizado de Swagger UI)
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// CORS restrictivo: únicamente permite el origen del frontend
const allowedOrigin = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === allowedOrigin) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/empresa', empresaRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/reportes', reportesRoutes);

// Documentación OpenAPI 3.0 / Swagger UI (Fases 16 y 22)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Manejador catch-all para rutas inexistentes (404) compatible con Express 5
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
});

// Manejador global centralizado de errores
app.use(errorHandler);

export default app;

