import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller';

const router = Router();
const controller = new WorkspaceController();

router.get('/', controller.get.bind(controller));
router.put('/', controller.update.bind(controller));
router.post('/checkout', controller.createCheckoutSession.bind(controller));
router.post('/dev-upgrade', controller.devUpgrade.bind(controller));

export default router;
