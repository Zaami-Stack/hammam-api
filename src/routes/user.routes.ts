import { Router } from 'express';
import {
  changePassword,
  changeStatus,
  createUser,
  listUsers,
  updateUser,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/', asyncHandler(listUsers));
router.post('/', asyncHandler(createUser));
router.put('/:id', asyncHandler(updateUser));
router.patch('/:id/status', asyncHandler(changeStatus));
router.patch('/:id/password', asyncHandler(changePassword));

export default router;