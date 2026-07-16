import { Router } from 'express';
import { getSiteVisits, createSiteVisit, updateSiteVisit } from '../controllers/siteVisitController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.get('/', getSiteVisits);
router.post('/', createSiteVisit);
router.put('/:id', updateSiteVisit);

export default router;
