import { Router } from 'express';
import { getAuditoria } from '../controllers/auditoria.controller';
import { authenticate as authenticateToken, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateToken, authorize('owner', 'administrador', 'admin'), getAuditoria);

export default router;
export { router };
