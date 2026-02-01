import { Router } from 'express';
import { LeadController } from '../controllers/lead.controller';

const router = Router();
const controller = new LeadController();

router.post('/', controller.create.bind(controller));
router.post('/bulk', controller.bulkCreate.bind(controller));
// Bulk delete
router.post('/bulk-delete', controller.bulkDelete.bind(controller));
router.post('/analyze', controller.analyze.bind(controller));
router.get('/', controller.list.bind(controller));

export default router;
