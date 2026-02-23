
import { Router } from 'express';
import * as AdminController from '../controllers/admin.controller';

const router = Router();

// Protect all admin routes
router.use(AdminController.checkAdminSecret);

router.get('/workspaces', AdminController.getWorkspaces);
router.post('/workspaces/:id/upgrade', AdminController.upgradeWorkspace);
router.post('/workspaces/:id/downgrade', AdminController.downgradeWorkspace);
router.delete('/workspaces/:id', AdminController.deleteWorkspace);

export default router;
