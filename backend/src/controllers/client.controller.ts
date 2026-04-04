import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getAllClients = async (req: Request, res: Response) => {
  try {
    const { centerId } = req.query;
    const filter = centerId ? { centerId: String(centerId) } : {};
    
    const clients = await prisma.client.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { cases: true }
        }
      }
    });
    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getClientById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id: String(id) },
      include: {
        cases: true,
        invoices: true
      }
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createClient = async (req: Request, res: Response) => {
  try {
    const { name, type, identityNumber, phone, email, address, centerId } = req.body;
    const client = await prisma.client.create({
      data: {
        name,
        type,
        identityNumber,
        phone,
        email,
        address,
        centerId
      }
    });
    res.status(201).json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, identityNumber, phone, email, address, status } = req.body;
    const client = await prisma.client.update({
      where: { id: String(id) },
      data: {
        name,
        type,
        identityNumber,
        phone,
        email,
        address,
        status
      }
    });
    res.json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.client.delete({ where: { id: String(id) } });
    res.json({ message: 'Client deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
