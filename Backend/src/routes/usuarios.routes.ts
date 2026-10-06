import { Router } from 'express';
import {
  getUsuariosEmpresa,
  createUsuarioEmpresa,
  updateUsuarioEmpresa,
} from '../controllers/usuarios.controller';
import {
  authenticate as authenticateToken,
  authorize,
} from '../middlewares/auth.middleware';
import { checkUserLimit } from '../middlewares/planLimits.middleware';

const router = Router();

router.use(authenticateToken);
router.use(authorize('owner', 'administrador', 'admin'));

router.get('/', getUsuariosEmpresa);
router.post('/', checkUserLimit, createUsuarioEmpresa);
router.put('/:id', updateUsuarioEmpresa);

export default router;
export { router, authenticateToken };
