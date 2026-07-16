import { Router } from 'express';
import multer from 'multer';
import {
  getLeads,
  getLead,
  createLead,
  updateLead,
  updateLeadStatus,
  assignLead,
  addLeadNote,
  importLeads,
  getPipeline,
  aiQualifyLead,
} from '../controllers/leadController.js';
import { protect } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(protect);
router.get('/', getLeads);
router.get('/pipeline', getPipeline);
router.post('/import', upload.single('file'), importLeads);
router.get('/:id', getLead);
router.post('/', createLead);
router.put('/:id', updateLead);
router.patch('/:id/status', updateLeadStatus);
router.patch('/:id/assign', assignLead);
router.post('/:id/notes', addLeadNote);
router.post('/:id/ai-qualify', aiQualifyLead);

export default router;
