import { Router } from 'express';
import { suggestLegalContent } from '../controllers/ai.controller';

const router = Router();

router.post('/suggest', suggestLegalContent);

export default router;
