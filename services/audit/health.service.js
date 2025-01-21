// services/health.service.js
import mongoose from 'mongoose';
import Redis from 'ioredis';
import os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

class HealthService {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD
    });
  }

  async checkSystemHealth() {
    const [
      dbStatus,
      redisStatus,
      systemMetrics,
      diskSpace
    ] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
      this.getSystemMetrics(),
      this.checkDiskSpace()
    ]);

    return {
      status: this.determineOverallStatus({
        dbStatus,
        redisStatus,
        systemMetrics,
        diskSpace
      }),
      timestamp: new Date(),
      services: {
        database: dbStatus,
        redis: redisStatus
      },
      metrics: systemMetrics,
      disk: diskSpace
    };
  }

  async checkDatabaseHealth() {
    try {
      const status = await mongoose.connection.db.admin().ping();
      return {
        status: status.ok === 1 ? 'healthy' : 'unhealthy',
        latency: await this.measureDbLatency(),
        connections: mongoose.connection.states
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async checkRedisHealth() {
    try {
      const startTime = process.hrtime();
      await this.redis.ping();
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const latency = seconds * 1000 + nanoseconds / 1000000;

      return {
        status: 'healthy',
        latency: `${latency.toFixed(2)}ms`
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async getSystemMetrics() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      cpu: {
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      memory: {
        total: this.formatBytes(totalMemory),
        free: this.formatBytes(freeMemory),
        used: this.formatBytes(usedMemory),
        usagePercentage: ((usedMemory / totalMemory) * 100).toFixed(2)
      },
      uptime: os.uptime()
    };
  }

  async checkDiskSpace() {
    try {
      const { stdout } = await execAsync('df -h /');
      const lines = stdout.trim().split('\n');
      const [filesystem, size, used, available, percentage, mounted] = lines[1].split(/\s+/);

      return {
        filesystem,
        size,
        used,
        available,
        percentage,
        mounted
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }

  async measureDbLatency() {
    const startTime = process.hrtime();
    await mongoose.connection.db.admin().ping();
    const [seconds, nanoseconds] = process.hrtime(startTime);
    return `${(seconds * 1000 + nanoseconds / 1000000).toFixed(2)}ms`;
  }

  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  }

  determineOverallStatus(checks) {
    const services = [
      checks.dbStatus.status,
      checks.redisStatus.status
    ];

    if (services.some(status => status === 'unhealthy')) {
      return 'unhealthy';
    }

    const memoryUsage = parseFloat(checks.systemMetrics.memory.usagePercentage);
    if (memoryUsage > 90) {
      return 'warning';
    }

    return 'healthy';
  }
}

export default new HealthService();