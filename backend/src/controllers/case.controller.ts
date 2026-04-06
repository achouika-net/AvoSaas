import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getCases = async (req: Request, res: Response) => {
  try {
    const { clientId, centerId } = req.query;
    const filter: any = {};
    if (clientId) filter.clientId = String(clientId);
    if (centerId) filter.centerId = String(centerId);

    const cases = await prisma.case.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { appointments: true, documents: true }
        }
      }
    });
    res.json(cases);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCaseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const caseData = await prisma.case.findUnique({
      where: { id: String(id) },
      include: {
        client: true,
        appointments: true,
        documents: true,
        expenses: true
      }
    });
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    res.json(caseData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createCase = async (req: Request, res: Response) => {
  try {
    const { 
      title, type, courtName, opponentName, 
      opponentLawyerName, opponentLawyerOffice, agreedFees,
      primaryNumber, appealNumber, supremeCourtNumber, 
      clientId, centerId, currentStage, narrative, legalMemo
    } = req.body;

    const newCase = await prisma.case.create({
      data: {
        title,
        type,
        courtName,
        opponentName,
        opponentLawyerName,
        opponentLawyerOffice,
        agreedFees: agreedFees ? Number(agreedFees) : 0,
        narrative,
        legalMemo,
        primaryNumber,
        appealNumber,
        supremeCourtNumber,
        clientId,
        centerId,
        currentStage: currentStage || 'FIRST_INSTANCE'
      }
    });
    res.status(201).json(newCase);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updatedCase = await prisma.case.update({
      where: { id: String(id) },
      data
    });
    res.json(updatedCase);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.case.delete({ where: { id: String(id) } });
    res.json({ message: 'Case deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
