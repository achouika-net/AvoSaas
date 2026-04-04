import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.query;
    const filter = clientId ? { clientId: String(clientId) } : {};
    
    const invoices = await prisma.invoice.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const { amount, status, clientId } = req.body;
    const invoice = await prisma.invoice.create({
      data: {
        amount: parseFloat(amount),
        status: status || 'UNPAID',
        clientId
      }
    });
    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const invoice = await prisma.invoice.update({
      where: { id: String(id) },
      data: { status }
    });
    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
