import { Router } from 'express';
import { dashboard } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'RECEPTION'));
router.get('/', asyncHandler(dashboard));

export default router;