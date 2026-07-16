import { Router } from 'express';
import {
  getDashboard,
  getLeadSourceReport,
  getFunnelReport,
  getExecutiveReport,
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.get('/', getDashboard);
router.get('/reports/source', getLeadSourceReport);
router.get('/reports/funnel', getFunnelReport);
router.get('/reports/executive', getExecutiveReport);

export default router;
