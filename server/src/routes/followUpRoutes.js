import { Router } from 'express';
import {
  getFollowUps,
  getDueFollowUps,
  createFollowUp,
  completeFollowUp,
  updateFollowUp,
  deleteFollowUp,
} from '../controllers/followUpController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.get('/', getFollowUps);
router.get('/due', getDueFollowUps);
router.post('/', createFollowUp);
router.put('/:id', updateFollowUp);
router.patch('/:id/complete', completeFollowUp);
router.delete('/:id', deleteFollowUp);

export default router;
