import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.get('/', authorize('owner', 'sales_manager'), getUsers);
router.post('/', authorize('owner', 'sales_manager'), createUser);
router.put('/:id', authorize('owner', 'sales_manager'), updateUser);
router.delete('/:id', authorize('owner'), deleteUser);

export default router;
