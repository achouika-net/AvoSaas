import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { centerId } = req.query;
    const filter = centerId ? { centerId: String(centerId) } : {};

    const [clientsCount, ongoingCasesCount, appointmentsToday] = await Promise.all([
      prisma.client.count({ where: filter }),
      prisma.case.count({ where: { ...filter, status: 'ONGOING' } }),
      prisma.appointment.count({ 
        where: { 
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999))
          }
        } 
      })
    ]);

    res.json({
      totalClients: clientsCount,
      activeCases: ongoingCasesCount,
      todayAppointments: appointmentsToday,
      monthlyRevenue: 0 // Placeholder for now
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
