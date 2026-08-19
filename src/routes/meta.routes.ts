import { Router } from 'express';
import { categories, hammams } from '../controllers/meta.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { asyncHandler } from '../utils/asyncHandler';

const hammamsRouter = Router();
hammamsRouter.use(authenticate, authorize('ADMIN', 'RECEPTION'));
hammamsRouter.get('/', asyncHandler(hammams));

const categoriesRouter = Router();
categoriesRouter.use(authenticate, authorize('ADMIN', 'RECEPTION'));
categoriesRouter.get('/', asyncHandler(categories));

export { hammamsRouter, categoriesRouter };