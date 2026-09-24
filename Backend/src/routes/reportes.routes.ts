import { Router } from 'express';
import { getResumenReportes } from '../controllers/reportes.controller';
import { authenticate as authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/resumen', getResumenReportes);
router.get('/', getResumenReportes);

export default router;
export { router };
