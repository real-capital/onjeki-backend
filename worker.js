// // worker.js
// import 'dotenv/config';
// import mongoose from 'mongoose';
// import { logger } from './utils/logger.js';
// import express from 'express';
// import {
//   startAllQueuesAndWorkers,
//   stopAllQueuesAndWorkers,
// } from './queue/queueManager.js';

// // Connect to MongoDB
// mongoose
//   .connect(process.env.MONGODB_URI)
//   .then(() => logger.info('Connected to MongoDB'))
//   .catch((err) => logger.error('MongoDB connection error:', err));

// // Start all queues and workers
// (async () => {
//   try {
//     await startAllQueuesAndWorkers();
//     logger.info('Worker service started successfully');
//     console.log('Worker service started successfully');
//   } catch (error) {
//     logger.error('Failed to start worker service:', error);
//     console.log('Failed to start worker service:', error);
//     process.exit(1);
//   }
// })();

// // Handle graceful shutdown
// process.on('SIGTERM', async (err) => {
//   logger.info('SIGTERM received. Shutting down worker service...');
//   console.log(`SIGTERM received. Shutting down worker service... ${err}`);
//   await stopAllQueuesAndWorkers();
//   process.exit(0);
// });

// process.on('SIGINT', async () => {
//   logger.info('SIGINT received. Shutting down worker service...');
//   console.log('SIGINT received. Shutting down worker service...');
//   await stopAllQueuesAndWorkers();
//   process.exit(0);
// });
// process.on('exit', (code) => {
//   logger.info(`Process exiting with code ${code}`);
//   console.log(`Process exiting with code ${code}`);
//     process.exit(0);
// });

// const app = express();
// // const PORT = 3000;
// const PORT = process.env.PORT || 3000;

// app.get('/', (req, res) => {
//   res.send('Worker service is running');
// });

// app.get('/health', (req, res) => {
//   res.status(200).json({ status: 'ok', uptime: process.uptime() });
// });

// app.listen(PORT, () => {
//   logger.info(`Health check server running on port ${PORT}`);
//   console.log(`Health check server running on port ${PORT}`);
// });


import 'dotenv/config';
import mongoose from 'mongoose';
import { logger } from './utils/logger.js';
import express from 'express';
import {
  startAllQueuesAndWorkers,
  stopAllQueuesAndWorkers,
} from './queue/queueManager.js';
import { closeRedisConnection } from './config/redis.js';

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info('✅ Connected to MongoDB'))
  .catch((err) => {
    logger.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Start all queues and workers
(async () => {
  try {
    await startAllQueuesAndWorkers();
    logger.info('✅ Worker service started successfully');
    console.log('✅ Worker service started successfully');
  } catch (error) {
    logger.error('❌ Failed to start worker service:', error);
    console.log('❌ Failed to start worker service:', error);
    process.exit(1);
  }
})();

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down worker service...`);
  console.log(`${signal} received. Shutting down worker service...`);
  
  try {
    // Stop all queues and workers first
    await stopAllQueuesAndWorkers();
    logger.info('✅ Queues and workers stopped');
    
    // Close Redis connection
    await closeRedisConnection();
    logger.info('✅ Redis connection closed');
    
    // Close MongoDB connection
    await mongoose.connection.close();
    logger.info('✅ MongoDB connection closed');
    
    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Health check server
const app = express();
const PORT = process.env.PORT || 8084;

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Worker service is running',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  logger.info(`✅ Health check server running on port ${PORT}`);
  console.log(`✅ Health check server running on port ${PORT}`);
});