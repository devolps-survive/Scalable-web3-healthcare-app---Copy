import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import transactionRoutes from './routes/transactions.js';
import userRoutes from './routes/user.js';
import medicalRoutes from './routes/medical.js';
import doctorRoutes from './routes/doctor.js';
import adminRoutes from './routes/admin.js';
import { initDb, seedDb } from './db/index.js';
import { initSocket } from './socket.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    const { query } = await import('./db/index.js');
    await query('SELECT 1');
    res.json({ status: 'ok', service: 'EASEeHealth API', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', service: 'EASEeHealth API', database: 'disconnected' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/medical', medicalRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', userRoutes);

async function start() {
  try {
    await initDb();
    await seedDb();
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`EASEeHealth API running on http://localhost:${PORT}`);
      console.log(`WebSocket ready for real-time updates`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
