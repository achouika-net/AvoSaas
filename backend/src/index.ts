import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import clientRoutes from './routes/client.routes';
import dashboardRoutes from './routes/dashboard.routes';
import caseRoutes from './routes/case.routes';
import aiRoutes from './routes/ai.routes';
import invoiceRoutes from './routes/invoice.routes';
import documentRoutes from './routes/document.routes';
import libraryRoutes from './routes/library.routes';
import prisma from './lib/prisma';

const app = express();
const port: any = process.env.PORT || 3005;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Registering Routes
app.use('/api/clients', clientRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/library', libraryRoutes);

// Clear stuck sync jobs on startup
prisma.syncJob.updateMany({
  where: { isSyncing: true },
  data: { isSyncing: false }
}).then(() => console.log('Cleaned up legacy sync jobs.'));

app.get('/', (req, res) => {
  res.send('AvoSaas API is running successfully on Docker!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend server listening on http://0.0.0.0:${port}...`);
});
