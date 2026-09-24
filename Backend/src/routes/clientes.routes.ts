import { Router } from 'express';
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
} from '../controllers/clientes.controller';
import {
  authenticate as authenticateToken,
  authorize,
} from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getClientes);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.delete('/:id', authorize('owner', 'administrador', 'admin'), deleteCliente);

export default router;
export { router, authenticateToken };
