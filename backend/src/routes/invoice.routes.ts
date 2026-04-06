import { Router } from 'express';
import { getInvoices, createInvoice, updateInvoiceStatus, updateInvoice, deleteInvoice } from '../controllers/invoice.controller';

const router = Router();

router.get('/', getInvoices);
router.post('/', createInvoice);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);
router.put('/:id/status', updateInvoiceStatus);

export default router;
