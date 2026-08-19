import { Router } from 'express';
import { createEntry, getEntry, listEntries, wipeEntries } from '../controllers/entry.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'RECEPTION'));

router.delete('/', authorize('ADMIN'), asyncHandler(wipeEntries));
router.get('/', asyncHandler(listEntries));
router.post('/', asyncHandler(createEntry));
router.get('/:id', asyncHandler(getEntry));

export default router;