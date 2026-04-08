import { Router } from 'express';
import { indexMemo, getLibraryDocs, deleteMemo, syncLibrary, getSyncStatus, getMemoById } from '../controllers/library.controller';

const router = Router();

router.post('/', indexMemo);
router.get('/', getLibraryDocs);
router.post('/sync', syncLibrary);
router.get('/status', getSyncStatus);
router.get('/:id', getMemoById);
router.delete('/:id', deleteMemo);

export default router;
