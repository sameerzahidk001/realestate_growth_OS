import { Router } from 'express';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  getUnits,
  createUnit,
  updateUnit,
  linkUnitToLead,
} from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.get('/:projectId/units', getUnits);
router.post('/:projectId/units', createUnit);
router.put('/units/:id', updateUnit);
router.patch('/units/:id/link', linkUnitToLead);

export default router;
