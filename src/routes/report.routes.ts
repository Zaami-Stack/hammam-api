import { Router } from 'express';
import { agents, daily, monthly, weekly, yearly } from '../controllers/report.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/daily', asyncHandler(daily));
router.get('/weekly', asyncHandler(weekly));
router.get('/monthly', asyncHandler(monthly));
router.get('/yearly', asyncHandler(yearly));
router.get('/agents', asyncHandler(agents));

export default router;