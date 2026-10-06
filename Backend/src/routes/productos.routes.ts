import { Router } from 'express';
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  importarProductos,
} from '../controllers/productos.controller';
import {
  authenticate as authenticateToken,
  authorize,
} from '../middlewares/auth.middleware';
import { checkProductLimit } from '../middlewares/planLimits.middleware';
import catchAsync from '../utils/catchAsync';

const router = Router();

router.use(authenticateToken);

router.get('/', catchAsync(getProductos));
router.post('/', checkProductLimit, catchAsync(createProducto));
router.post('/importar', authorize('owner', 'administrador', 'admin'), checkProductLimit, catchAsync(importarProductos));
router.put('/:id', catchAsync(updateProducto));
router.delete('/:id', authorize('owner', 'administrador', 'admin'), catchAsync(deleteProducto));

export default router;
export { router, authenticateToken };

