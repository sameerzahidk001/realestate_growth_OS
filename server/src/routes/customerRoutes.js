import { Router } from 'express';
import {
  getCustomerDashboard,
  getCustomerComplaints,
  createComplaint,
  getCustomerReferrals,
} from '../controllers/customerController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect, authorize('customer'));

router.get('/dashboard', getCustomerDashboard);
router.get('/complaints', getCustomerComplaints);
router.post('/complaints', createComplaint);
router.get('/referrals', getCustomerReferrals);

export default router;
