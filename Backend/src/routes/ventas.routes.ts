import { Router } from 'express';
import { getVentas, createVenta, anularVenta } from '../controllers/ventas.controller';
import {
  authenticate as authenticateToken,
  authorize,
} from '../middlewares/auth.middleware';
import catchAsync from '../utils/catchAsync';

const router = Router();

router.use(authenticateToken);

router.get('/', catchAsync(getVentas));
router.post('/', catchAsync(createVenta));
router.put('/:id/anular', authorize('owner', 'administrador', 'admin'), catchAsync(anularVenta));

export default router;
export { router, authenticateToken };

