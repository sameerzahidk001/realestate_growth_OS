import { Router } from 'express';
import { getSiteVisits, createSiteVisit, updateSiteVisit, deleteSiteVisit } from '../controllers/siteVisitController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.get('/', getSiteVisits);
router.post('/', createSiteVisit);
router.put('/:id', updateSiteVisit);
router.delete('/:id', deleteSiteVisit);

export default router;
