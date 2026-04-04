import { Router } from 'express';
import { getCases, getCaseById, createCase, updateCase, deleteCase } from '../controllers/case.controller';

const router = Router();

router.get('/', getCases);
router.get('/:id', getCaseById);
router.post('/', createCase);
router.put('/:id', updateCase);
router.delete('/:id', deleteCase);

export default router;
