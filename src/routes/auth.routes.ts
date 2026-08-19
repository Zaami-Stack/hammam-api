import { Router } from 'express';
import { handleLogin, handleLogout, handleMe } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { loginLimiter } from '../middleware/rateLimiters';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/login', loginLimiter, asyncHandler(handleLogin));
router.post('/logout', asyncHandler(handleLogout));
router.get('/me', authenticate, asyncHandler(handleMe));

export default router;