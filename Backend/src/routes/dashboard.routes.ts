import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboard.controller';
import { authenticate as authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/summary', getDashboardSummary);
router.get('/', getDashboardSummary);

export default router;
export { router };
