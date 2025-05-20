
// worker.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { logger } from './utils/logger.js';
import express from 'express';
import {
  startAllQueuesAndWorkers,
  stopAllQueuesAndWorkers,
} from './queue/queueManager.js';

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch((err) => logger.error('MongoDB connection error:', err));

// Start all queues and workers
(async () => {
  try {
    await startAllQueuesAndWorkers();
    logger.info('Worker service started successfully');
  } catch (error) {
    logger.error('Failed to start worker service:', error);
    process.exit(1);
  }
})();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down worker service...');
  await stopAllQueuesAndWorkers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down worker service...');
  await stopAllQueuesAndWorkers();
  process.exit(0);
});

const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Worker service is running');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  logger.info(`Health check server running on port ${PORT}`);
});
