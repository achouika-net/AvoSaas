import { Router } from 'express';
import { suggestLegalContent, getSettings, updateSettings } from '../controllers/ai.controller';

const router = Router();

router.post('/suggest', suggestLegalContent);
router.get('/settings/:centerId', getSettings);
router.post('/settings', updateSettings);

export default router;
