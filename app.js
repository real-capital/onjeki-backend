import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import morgan from 'morgan';
import expressListRoutes from 'express-list-routes';
import { createServer } from 'http';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import { Queue } from 'bullmq';
// import { createBullBoard } from '@bull-board/api';
// import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
// import { ExpressAdapter } from '@bull-board/express';
// import { createBullBoard } from '@bull-board/api';
// import { BullMQAdapter } from '@bull-board/api/dist/bullMQAdapter.js';
// import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js'; // Note the .js extension
import { ExpressAdapter } from '@bull-board/express';
import { Route } from './interfaces/route.interface.js';

import connectDB from './config/db.js';
import { AppError } from './middlewares/handleError.js';
// import HttpResponse from '../response/HttpResponse.js';
import { logger } from './utils/logger.js';
import HttpException from './utils/exception.js';
import morganMiddleware from './middlewares/morgan.middleware.js';
import { handleMulterError } from './middlewares/upload.middleware.js';
import rateLimit from 'express-rate-limit';
import { SocketService } from './services/chat/socket.service.js';
import ChatService from './services/chat/chat.service.js';
import BookingService from './services/booking/booking.service.js';
import ServiceContainer from './services/ServiceContainer.js';
import ConversationService from './services/conversation/conversation.service.js';
import { scheduleEmailJobs } from './jobs/email-jobs.js';
import { scheduleEarningJobs } from './jobs/earningJob.js';
import { subscriptionRenewalJob } from './jobs/subscriptionRenewalJob.js';
import bookingQueue from './queue/bookingQueue.js';
import { connectToAllQueues } from './queue/queueManager.js';

// Load environment variables
dotenv.config();

// App Init
class app {
  constructor(routes) {
    this.app = express();
    this.port = process.env.PORT || 8000;
    this.server = createServer(this.app);

    // Initialize middlewares, routes, error handling, etc.

    // Initialize in correct order
    this.initializeMiddlewares();
    // this.initializeSocket();
    this.initializeServices();
    this.initializeBullMQ();
    this.initializeRoutes(routes);
    this.initializeErrorHandling();
    this.listRoutes();
    this.DBconnection();
    this.connectToQueues();
    // this.startQueues();
  }

  listen() {
    this.server.listen(this.port, '0.0.0.0', () => {
      logger.info(`Server is running on port ${this.port}`);
    });
  }

  // Initialize Middlewares
  initializeMiddlewares() {
    this.app.use(cors()); // CORS middleware
    this.app.use(express.json());
    this.app.use(bodyParser.json()); // JSON body parser
    this.app.use(express.urlencoded({ extended: true })); // URL-encoded body parser
    this.app.use(helmet()); // Security middleware
    this.app.use(mongoSanitize()); // Sanitize user inputs
    this.app.use(xss()); // Prevent XSS attacks
    this.app.use(hpp()); // Prevent HTTP parameter pollution
    this.app.use(morganMiddleware); // Request logging middleware
  }

  initializeServices() {
    try {
      // Initialize socket service first
      const socketService = new SocketService(this.server);

      // Register services in container
      ServiceContainer.register('socketService', socketService);

      // Initialize and register booking service
      const bookingService = new BookingService(socketService);
      ServiceContainer.register('bookingService', bookingService);

      const conversationService = new ConversationService(socketService);
      ServiceContainer.register('conversationService', conversationService);

      // Initialize and register chat service
      const chatService = new ChatService(socketService.getIO());
      ServiceContainer.register('chatService', chatService);

      // Log successful initialization
      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Error initializing services:', error);
      throw error;
    }
  }

  initializeRoutes(routes) {
    routes.forEach((Route) => {
      try {
        const route = new Route();
        if (!route.router) {
          throw new Error(`Router not initialized for ${Route.name}`);
        }
        this.app.use('/api/v1', route.getRouter());
        logger.info(`Route initialized: ${Route.name}`);
      } catch (error) {
        logger.error(`Error initializing route: ${Route.name}`, error);
        throw error;
      }
    });
  }
  initializeBullMQ() {
    try {
      // Setup Bull Board UI
      const serverAdapter = new ExpressAdapter();
      serverAdapter.setBasePath('/api/v1/queue');

      createBullBoard({
        queues: [
          new BullMQAdapter(bookingQueue, {
            readOnlyMode: true,
          }),
          // new BullMQAdapter(trxQueue, { readOnlyMode: true }),
          // new BullMQAdapter(bvnVerificationQueue, { readOnlyMode: true }),
          // new BullMQAdapter(spaceRentQueue, { readOnlyMode: true }),
          // new BullMQAdapter(spaceRentFirstDepositQueue, { readOnlyMode: true }),
          // new BullMQAdapter(emailQueue, { readOnlyMode: true }),
        ],
        serverAdapter,
      });

      // Mount the Bull Board UI
      this.app.use('/api/v1/queue', serverAdapter.getRouter());

      logger.info('BullMQ dashboard initialized successfully');
    } catch (error) {
      logger.error('Error initializing BullMQ dashboard:', error);
      throw error;
    }
  }
  async connectToQueues() {
    try {
      // Connect to queues but don't start workers (for Vercel API)
      await connectToAllQueues();
    } catch (error) {
      logger.error('Failed to connect to queues:', error);
    }
  }

  // async startQueues() {
  //   try {
  //     await startAllQueuesAndWorkers();
  //     logger.info('Redis Queue started successfully');
  //   } catch (error) {
  //     logger.error('Failed to start Redis Queue:', error);
  //   }
  // }

  // Initialize Error Handling
  initializeErrorHandling() {
    // Handle 404 errors (routes not found)
    this.app.all('*', (req, res, next) => {
      const error = new AppError(
        404,
        `Can't find ${req.originalUrl} on this server`,
        null,
        'RESOURCE_NOT_FOUND'
      );
      next(error);
    });

    // Global error handling middleware
    this.app.use((err, req, res, next) => {
      if (err instanceof AppError) {
        const response = err.toHttpResponse();
        return res.status(err.statusCode).json(response);
      }

      // Handle unknown errors (default to 500)
      // console.error(err);
      const status = err.status || 500;
      let message = 'Something went wrong';

      // Check if the error is an instance of HttpException
      if (err instanceof HttpException) {
        message = err.message || message; // Use the message from the custom error
      } else if (err instanceof Error) {
        message = err.message; // For any generic error, use its message
      } else if (typeof err === 'object') {
        message = JSON.stringify(err); // If it's an object, convert it to string
      }
      logger.error(
        `[Error Handler]: Path: ${req.path}, Method: ${req.method}, Status: ${status}, ${message}`
      );
      const response = new AppError(
        500,
        'Something went wrong',
        err,
        'UNKNOWN_ERROR'
      ).toHttpResponse();
      return res.status(status).json({
        status: 'error',
        message,
        errorCode: err.errorCode || 'UNKNOWN_ERROR',
      });
    });
  }

  // List all routes
  listRoutes() {
    expressListRoutes(this.app, {
      logger: (method, space, path) => {
        logger.info(`🚏 [Routes]: ${method}  ${path}`);
      },
    });
  }

  cleanup() {
    if (this.socketService) {
      this.socketService.getIO().close();
    }
  }

  // Database connection
  async DBconnection() {
    await connectDB();
  }
}
scheduleEmailJobs();
scheduleEarningJobs();
subscriptionRenewalJob();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err);
  logger.error(err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(err);
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err);
  process.exit(1);
});

// Add cleanup handlers
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Cleaning up...');
  app.cleanup();
  process.exit(0);
});
export default app;
