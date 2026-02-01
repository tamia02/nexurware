import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();
const controller = new AnalyticsController();

router.get('/global', controller.getGlobalStats);
router.get('/daily', controller.getDailyStats);
router.get('/campaigns/:id', controller.getCampaignStats);

export default router;
