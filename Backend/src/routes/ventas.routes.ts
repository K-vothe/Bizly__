import { Router } from 'express';
import { getVentas, createVenta } from '../controllers/ventas.controller';
import { authenticate as authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getVentas);
router.post('/', createVenta);

export default router;
export { router, authenticateToken };
