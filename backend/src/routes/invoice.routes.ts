import { Router } from 'express';
import { getInvoices, createInvoice, updateInvoiceStatus } from '../controllers/invoice.controller';

const router = Router();

router.get('/', getInvoices);
router.post('/', createInvoice);
router.put('/:id/status', updateInvoiceStatus);

export default router;
