import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getDocuments = async (req: Request, res: Response) => {
  try {
    const { caseId } = req.query;
    const filter = caseId ? { caseId: String(caseId) } : {};
    
    const documents = await prisma.document.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' }
    });
    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createDocument = async (req: Request, res: Response) => {
  try {
    const { title, content, caseId } = req.body;
    const document = await prisma.document.create({
      data: {
        title,
        content: content || 'mock-file-url', // In real app, this is S3/Local path
        caseId
      }
    });
    res.status(201).json(document);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.document.delete({ where: { id: String(id) } });
    res.json({ message: 'Document removed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
