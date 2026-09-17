import { Router } from 'express';
import { registerCompanyAndOwner, login } from '../controllers/auth.controller';

const router = Router();

router.post('/register', registerCompanyAndOwner);
router.post('/login', login);

export default router;
export { router };
