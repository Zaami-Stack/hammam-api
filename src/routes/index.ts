import { Router } from 'express';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import entryRoutes from './entry.routes';
import { categoriesRouter, hammamsRouter } from './meta.routes';
import priceRoutes from './price.routes';
import reportRoutes from './report.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/entries', entryRoutes);
router.use('/users', userRoutes);
router.use('/prices', priceRoutes);
router.use('/reports', reportRoutes);

router.get('/health', (_req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

router.use('/hammams', hammamsRouter);
router.use('/categories', categoriesRouter);

export default router;