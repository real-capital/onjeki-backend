import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../utils/logger.js';

class VercelQueueClient {
  constructor() {
    this.connection = null;
    this.queue = null;
  }

  async getConnection() {
    if (!this.connection) {
      this.connection = new IORedis({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 5000,
      });
      
      await this.connection.connect();
      
      // Auto-disconnect after 5 seconds of inactivity
      this.scheduleDisconnect();
    }
    return this.connection;
  }

  scheduleDisconnect() {
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
    }
    
    this.disconnectTimer = setTimeout(async () => {
      if (this.connection && this.connection.status === 'ready') {
        await this.connection.quit();
        this.connection = null;
        this.queue = null;
        logger.info('Redis connection closed due to inactivity');
      }
    }, 5000);
  }

  async getQueue() {
    if (!this.queue) {
      const connection = await this.getConnection();
      this.queue = new Queue('bookingQueue', { connection });
    }
    this.scheduleDisconnect();
    return this.queue;
  }

  async addJob(jobName, data, options = {}) {
    try {
      const queue = await this.getQueue();
      const job = await queue.add(jobName, data, options);
      logger.info(`Job ${jobName} added successfully`, { jobId: job.id });
      return job;
    } catch (error) {
      logger.error(`Failed to add job ${jobName}:`, error);
      throw error;
    }
  }

  async close() {
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
    }
    if (this.queue) {
      await this.queue.close();
    }
    if (this.connection) {
      await this.connection.quit();
    }
  }
}

export const vercelQueueClient = new VercelQueueClient();