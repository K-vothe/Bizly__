import { Router } from 'express';
import { getEmpresa, updateEmpresa } from '../controllers/empresa.controller';
import { authenticate as authenticateToken, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getEmpresa);
router.put('/', authenticateToken, authorize('owner', 'administrador', 'admin'), updateEmpresa);

export default router;
export { router };
