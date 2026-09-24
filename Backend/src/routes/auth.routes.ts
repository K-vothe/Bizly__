import { Router } from 'express';
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  logout,
  sendOtp,
  verifyOtp,
  googleAuth,
} from '../controllers/auth.controller';
import { authenticate as authenticateToken } from '../middlewares/auth.middleware';
import catchAsync from '../utils/catchAsync';

const router = Router();

router.post('/register', catchAsync(register));
router.post('/login', catchAsync(login));
router.post('/forgot-password', catchAsync(forgotPassword));
router.post('/recuperar', catchAsync(forgotPassword));
router.post('/reset-password', catchAsync(resetPassword));
router.post('/send-otp', catchAsync(sendOtp));
router.post('/verify-otp', catchAsync(verifyOtp));
router.post('/google', catchAsync(googleAuth));
router.get('/me', authenticateToken, catchAsync(getMe));
router.post('/logout', catchAsync(logout));

export default router;
export { router };

