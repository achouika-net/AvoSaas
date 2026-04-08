import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { LibraryScanner } from '../services/library-scanner';

export const indexMemo = async (req: Request, res: Response) => {
  try {
    const { title, content, category, centerId } = req.body;
    
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required for private library indexing.' });
    }

    const memo = await prisma.libraryMemo.create({
      data: { title, content, category, centerId }
    });

    res.json(memo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getLibraryDocs = async (req: Request, res: Response) => {
  try {
    const centerId = req.query.centerId as string;
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 20;

    if (!centerId) {
       return res.status(400).json({ error: 'Center ID required.' });
    }

    const whereClause: any = { centerId };
    if (category) whereClause.category = category;
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [docs, total] = await Promise.all([
      prisma.libraryMemo.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: { id: true, title: true, category: true, createdAt: true, lastModified: true } // Omit full content for fast loading
      }),
      prisma.libraryMemo.count({ where: whereClause })
    ]);

    res.json({ docs, total });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getMemoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const memo = await prisma.libraryMemo.findUnique({ where: { id } });
    if (!memo) return res.status(404).json({ error: 'Memo not found' });
    res.json(memo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteMemo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.libraryMemo.delete({ where: { id } });
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const syncLibrary = async (req: Request, res: Response) => {
  try {
    const centerId = req.body.centerId as string;
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID required for sync.' });
    }

    // Start background sync
    await LibraryScanner.startSync(centerId);
    
    // Return current status immediately
    const status = await LibraryScanner.getStatus(centerId);
    res.json(status);
  } catch (error: any) {
    console.error('Sync Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getSyncStatus = async (req: Request, res: Response) => {
  try {
    const centerId = req.query.centerId as string;
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID required.' });
    }
    const status = await LibraryScanner.getStatus(centerId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
