import express from 'express';
import cors from 'cors';
import clientRoutes from './routes/client.routes';
import dashboardRoutes from './routes/dashboard.routes';
import caseRoutes from './routes/case.routes';
import aiRoutes from './routes/ai.routes';
import invoiceRoutes from './routes/invoice.routes';
import documentRoutes from './routes/document.routes';

const app = express();
const port = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// Registering Routes
app.use('/api/clients', clientRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/documents', documentRoutes);

app.get('/', (req, res) => {
  res.send('AvoSaas API is running successfully on Docker!');
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}...`);
});
