import { Router } from 'express';
import { getFollowUps, getDueFollowUps, createFollowUp, completeFollowUp } from '../controllers/followUpController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.get('/', getFollowUps);
router.get('/due', getDueFollowUps);
router.post('/', createFollowUp);
router.patch('/:id/complete', completeFollowUp);

export default router;
