import { Router } from 'express';
import { getDocuments, createDocument, deleteDocument, updateDocument, processOcrDocument } from '../controllers/document.controller';

const router = Router();

router.get('/', getDocuments);
router.post('/', createDocument);
router.post('/ocr', processOcrDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

export default router;
