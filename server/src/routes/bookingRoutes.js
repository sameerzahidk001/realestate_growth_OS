import { Router } from 'express';
import {
  getBookings,
  createBooking,
  generateAgreement,
  getPayments,
  recordPayment,
  getLoan,
  updateLoan,
  getPossession,
  updatePossession,
  getConstructionUpdates,
  createConstructionUpdate,
  getReferrals,
  createReferral,
  updateReferral,
} from '../controllers/bookingController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/construction/updates', getConstructionUpdates);
router.post('/construction/updates', createConstructionUpdate);
router.get('/referrals/all', getReferrals);
router.post('/referrals', createReferral);
router.put('/referrals/:id', updateReferral);
router.get('/payments/:bookingId?', getPayments);
router.patch('/payments/:id', recordPayment);

router.get('/', getBookings);
router.post('/', createBooking);
router.get('/:id/agreement', generateAgreement);
router.get('/:bookingId/loan', getLoan);
router.put('/:bookingId/loan', updateLoan);
router.get('/:bookingId/possession', getPossession);
router.put('/:bookingId/possession', updatePossession);

export default router;
