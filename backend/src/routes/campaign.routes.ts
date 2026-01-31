import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller';

const router = Router();
const controller = new CampaignController();

// Campaign CRUD
router.post('/', controller.create.bind(controller));
router.get('/', controller.list.bind(controller));
router.get('/:id', controller.get.bind(controller));
router.patch('/:id/status', controller.updateStatus.bind(controller));

// Sequence Steps
router.post('/:id/steps', controller.addStep.bind(controller));

// Manage Leads in Campaign
router.post('/:id/leads', controller.addLead.bind(controller));
router.get('/:id/leads', controller.getLeads.bind(controller));

export default router;
