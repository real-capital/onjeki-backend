// import express from 'express';
// import cors from 'cors';
// import 'express-async-errors';
// import morgan from 'morgan';
// import expressListRoutes from 'express-list-routes';
// import { createServer } from 'http';
// import dotenv from 'dotenv';
// import bodyParser from 'body-parser';
// import helmet from 'helmet';
// import mongoSanitize from 'express-mongo-sanitize';
// import xss from 'xss-clean';
// import hpp from 'hpp';
// import { createBullBoard } from '@bull-board/api';
// import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js'; // Note the .js extension
// import { ExpressAdapter } from '@bull-board/express';

// import connectDB from './config/db.js';
// import { AppError } from './middlewares/handleError.js';
// import { logger } from './utils/logger.js';
// import HttpException from './utils/exception.js';
// import morganMiddleware from './middlewares/morgan.middleware.js';
// import { handleMulterError } from './middlewares/upload.middleware.js';
// import rateLimit from 'express-rate-limit';
// import { SocketService } from './services/chat/socket.service.js';
// import ChatService from './services/chat/chat.service.js';
// import BookingService from './services/booking/booking.service.js';
// import ServiceContainer from './services/ServiceContainer.js';
// import ConversationService from './services/conversation/conversation.service.js';
// import { scheduleEmailJobs } from './jobs/email-jobs.js';
// import { scheduleEarningJobs } from './jobs/earningJob.js';
// import { subscriptionRenewalJob } from './jobs/subscriptionRenewalJob.js';
// import { bookingQueue } from './queue/bookingQueue.js';
// import { connectToAllQueues } from './queue/queueManager.js';
// import { isWorker, isVercel, getEnvironmentInfo } from './utils/environment.js';

// // Load environment variables
// dotenv.config();

// logger.info('Environment info:', getEnvironmentInfo());

// // App Init
// class app {
//   constructor(routes) {
//     this.app = express();
//     this.port = process.env.PORT || 8000;
//     this.server = createServer(this.app);

//     this.initializeMiddlewares();

//     this.initializeServices();
//     if (
//       (isWorker() || !isVercel()) &&
//       process.env.ENABLE_BULL_BOARD !== 'false'
//     ) {
//       this.initializeBullMQ();
//     }
//     this.initializeRoutes(routes);
//     this.initializeErrorHandling();
//     this.listRoutes();
//     this.DBconnection();
//     if (isWorker()) {
//       this.connectToQueues();
//     }
//   }

//   listen() {
//     this.server.listen(this.port, '0.0.0.0', () => {
//       logger.info(`Server is running on port ${this.port}`);
//     });
//   }

//   // Initialize Middlewares
//   initializeMiddlewares() {
//     this.app.use(cors()); // CORS middleware
//     this.app.use(express.json());
//     this.app.use(bodyParser.json()); // JSON body parser
//     this.app.use(express.urlencoded({ extended: true })); // URL-encoded body parser
//     this.app.use(helmet()); // Security middleware
//     this.app.use(mongoSanitize()); // Sanitize user inputs
//     this.app.use(xss()); // Prevent XSS attacks
//     this.app.use(hpp()); // Prevent HTTP parameter pollution
//     this.app.use(morganMiddleware); // Request logging middleware
//   }

//   initializeServices() {
//     try {
//       // Initialize socket service first
//       const socketService = new SocketService(this.server);

//       // Register services in container
//       ServiceContainer.register('socketService', socketService);

//       // Initialize and register booking service
//       const bookingService = new BookingService(socketService);
//       ServiceContainer.register('bookingService', bookingService);

//       const conversationService = new ConversationService(socketService);
//       ServiceContainer.register('conversationService', conversationService);

//       // Initialize and register chat service
//       const chatService = new ChatService(socketService.getIO());
//       ServiceContainer.register('chatService', chatService);

//       // Log successful initialization
//       logger.info('All services initialized successfully');
//     } catch (error) {
//       logger.error('Error initializing services:', error);
//       throw error;
//     }
//   }

//   initializeRoutes(routes) {
//     routes.forEach((Route) => {
//       try {
//         const route = new Route();
//         if (!route.router) {
//           throw new Error(`Router not initialized for ${Route.name}`);
//         }
//         this.app.use('/api/v1', route.getRouter());
//         logger.info(`Route initialized: ${Route.name}`);
//       } catch (error) {
//         logger.error(`Error initializing route: ${Route.name}`, error);
//         throw error;
//       }
//     });
//   }
//   initializeBullMQ() {
//     try {
//       const serverAdapter = new ExpressAdapter();
//       serverAdapter.setBasePath('/api/v1/queue');

//       createBullBoard({
//         queues: [new BullMQAdapter(bookingQueue, { readOnlyMode: true })],
//         serverAdapter,
//       });

//       // Mount the Bull Board UI
//       this.app.use('/api/v1/queue', serverAdapter.getRouter());
//       logger.info('BullMQ dashboard initialized successfully');
//     } catch (error) {
//       logger.warn(
//         'Failed to initialize BullMQ dashboard, continuing without it:',
//         error
//       );
//     }
//   }

//   async connectToQueues() {
//     try {
//       await connectToAllQueues();
//     } catch (error) {
//       logger.error('Failed to connect to queues:', error);
//     }
//   }

//   // Initialize Error Handling
//   initializeErrorHandling() {
//     // Handle 404 errors (routes not found)
//     this.app.all('*', (req, res, next) => {
//       const error = new AppError(
//         404,
//         `Can't find ${req.originalUrl} on this server`,
//         null,
//         'RESOURCE_NOT_FOUND'
//       );
//       next(error);
//     });

//     // Global error handling middleware
//     this.app.use((err, req, res, next) => {
//       if (err instanceof AppError) {
//         const response = err.toHttpResponse();
//         return res.status(err.statusCode).json(response);
//       }

//       // Handle unknown errors (default to 500)
//       // console.error(err);
//       const status = err.status || 500;
//       let message = 'Something went wrong';

//       // Check if the error is an instance of HttpException
//       if (err instanceof HttpException) {
//         message = err.message || message; // Use the message from the custom error
//       } else if (err instanceof Error) {
//         message = err.message; // For any generic error, use its message
//       } else if (typeof err === 'object') {
//         message = JSON.stringify(err); // If it's an object, convert it to string
//       }
//       logger.error(
//         `[Error Handler]: Path: ${req.path}, Method: ${req.method}, Status: ${status}, ${message}`
//       );
//       const response = new AppError(
//         500,
//         'Something went wrong',
//         err,
//         'UNKNOWN_ERROR'
//       ).toHttpResponse();
//       return res.status(status).json({
//         status: 'error',
//         message,
//         errorCode: err.errorCode || 'UNKNOWN_ERROR',
//       });
//     });
//   }

//   // List all routes
//   listRoutes() {
//     expressListRoutes(this.app, {
//       logger: (method, space, path) => {
//         logger.info(`🚏 [Routes]: ${method}  ${path}`);
//       },
//     });
//   }

//   cleanup() {
//     if (this.socketService) {
//       this.socketService.getIO().close();
//     }
//   }

//   // Database connection
//   async DBconnection() {
//     await connectDB();
//   }
// }
// scheduleEmailJobs();
// scheduleEarningJobs();
// subscriptionRenewalJob();

// export default app;

// app.js
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
// app.js (continued)
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';

import connectDB from './config/db.js';
import { AppError } from './middlewares/handleError.js';
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
import { isWorker, isVercel, getEnvironmentInfo } from './utils/environment.js';
import { scheduleEmailJobs } from './jobs/email-jobs.js';
import { scheduleEarningJobs } from './jobs/earningJob.js';
import { subscriptionRenewalJob } from './jobs/subscriptionRenewalJob.js';
import bookingQueue from './queue/bookingQueue.js';

// Remove these direct imports - they'll be dynamically imported
// import { scheduleEmailJobs } from './jobs/email-jobs.js';
// import { scheduleEarningJobs } from './jobs/earningJob.js';
// import { subscriptionRenewalJob } from './jobs/subscriptionRenewalJob.js';
// import { bookingQueue } from './queue/bookingQueue.js';
// import { connectToAllQueues } from './queue/queueManager.js';

// Load environment variables
dotenv.config();

logger.info('Environment info:', getEnvironmentInfo());

// App Init
class app {
  constructor(routes) {
    this.app = express();
    this.port = process.env.PORT || 8000;
    this.server = createServer(this.app);
    this.routes = routes;

    // Call async init
    this.initialize();
  }

  async initialize() {
    this.initializeMiddlewares();
    this.initializeServices();
    this.initializeRoutes(this.routes);

    // Initialize BullMQ dashboard BEFORE error handling
    if (!isVercel() && process.env.ENABLE_BULL_BOARD !== 'false') {
      await this.initializeBullMQ(); // Make sure this is awaited
    }

    // List routes to verify
    this.listRoutes();

    // Initialize error handling AFTER all routes
    this.initializeErrorHandling();

    await this.DBconnection();

    if (!isVercel()) {
      await this.connectToQueues();
    }
  }

  listen() {
    this.server.listen(this.port, '0.0.0.0', () => {
      logger.info(`Server is running on port ${this.port}`);
    });
  }

  // Initialize Middlewares
  initializeMiddlewares() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(bodyParser.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(helmet());
    this.app.use(mongoSanitize());
    this.app.use(xss());
    this.app.use(hpp());
    this.app.use(morganMiddleware);
  }

  initializeServices() {
    try {
      const socketService = new SocketService(this.server);
      ServiceContainer.register('socketService', socketService);

      const bookingService = new BookingService(socketService);
      ServiceContainer.register('bookingService', bookingService);

      const conversationService = new ConversationService(socketService);
      ServiceContainer.register('conversationService', conversationService);

      const chatService = new ChatService(socketService.getIO());
      ServiceContainer.register('chatService', chatService);

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

  async initializeBullMQ() {
    try {
      logger.info('Starting BullMQ dashboard initialization...');

      // Check environment
      logger.info('Environment checks:', {
        isVercel: isVercel(),
        ENABLE_BULL_BOARD: process.env.ENABLE_BULL_BOARD,
        NODE_ENV: process.env.NODE_ENV,
      });

      // Dynamic import to avoid loading on Vercel
      const { bookingQueue } = await import('./queue/bookingQueue.js');

      if (!bookingQueue) {
        logger.warn('Booking queue not available, skipping BullMQ dashboard');
        return;
      }

      logger.info('Booking queue loaded successfully');

      const serverAdapter = new ExpressAdapter();
      serverAdapter.setBasePath('/api/v1/queue');

      createBullBoard({
        queues: [new BullMQAdapter(bookingQueue, { readOnlyMode: true })],
        serverAdapter,
      });

      this.app.use('/api/v1/queue', serverAdapter.getRouter());
      logger.info('BullMQ dashboard mounted at /api/v1/queue');

      // Test the route
      this.app._router.stack.forEach((middleware) => {
        if (middleware.route) {
          logger.info(`Registered route: ${middleware.route.path}`);
        }
      });
    } catch (error) {
      logger.error('Failed to initialize BullMQ dashboard:', error);
      logger.error('Stack trace:', error.stack);
    }
  }

  async connectToQueues() {
   
    try {
    
      const { connectToAllQueues } = await import('./queue/queueManager.js');
      await connectToAllQueues();
      logger.info('Connected to queues successfully');
    } catch (error) {
      logger.error('Failed to connect to queues:', error);
      // Don't fail app startup if queues fail
      if (isWorker()) {
        throw error; // Only throw in worker mode
      }
    }
  }

  initializeErrorHandling() {
    // Handle 404 errors
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

      const status = err.status || 500;
      let message = 'Something went wrong';

      if (err instanceof HttpException) {
        message = err.message || message;
      } else if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'object') {
        message = JSON.stringify(err);
      }

      logger.error(
        `[Error Handler]: Path: ${req.path}, Method: ${req.method}, Status: ${status}, ${message}`
      );

      return res.status(status).json({
        status: 'error',
        message,
        errorCode: err.errorCode || 'UNKNOWN_ERROR',
      });
    });
  }

  listRoutes() {
    expressListRoutes(this.app, {
      logger: (method, space, path) => {
        logger.info(`🚏 [Routes]: ${method}  ${path}`);
      },
    });
  }

  cleanup() {
    const socketService = ServiceContainer.get('socketService');
    if (socketService) {
      socketService.getIO().close();
    }
  }

  async DBconnection() {
    await connectDB();
  }
}
scheduleEmailJobs();
scheduleEarningJobs();
subscriptionRenewalJob();

// bookingService.completeBooking('683da20f106ca150345f200b');

// Only run scheduled jobs if not on Vercel
// if (!isVercel()) {
//   // Use dynamic imports and IIFE to avoid top-level await
//   (async () => {
//     try {
//       const [
//         { scheduleEmailJobs },
//         { scheduleEarningJobs },
//         { subscriptionRenewalJob }
//       ] = await Promise.all([
//         import('./jobs/email-jobs.js'),
//         import('./jobs/earningJob.js'),
//         import('./jobs/subscriptionRenewalJob.js')
//       ]);

//       scheduleEmailJobs();
//       scheduleEarningJobs();
//       subscriptionRenewalJob();

//       logger.info('Background jobs scheduled successfully');
//     } catch (error) {
//       logger.error('Failed to schedule background jobs:', error);
//       // Don't fail the app if jobs can't be scheduled
//     }
//   })();
// }

export default app;
