import { Router } from 'express';
import { listPrices, updatePrice } from '../controllers/price.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(listPrices));
router.put('/:id', authorize('ADMIN'), asyncHandler(updatePrice));

export default router;