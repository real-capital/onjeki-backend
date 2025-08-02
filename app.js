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
// // app.js (continued)
// import { createBullBoard } from '@bull-board/api';
// import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
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
// import { isWorker, isVercel, getEnvironmentInfo } from './utils/environment.js';
// import { scheduleEmailJobs } from './jobs/email-jobs.js';
// import { scheduleEarningJobs } from './jobs/earningJob.js';
// import { subscriptionRenewalJob } from './jobs/subscriptionRenewalJob.js';
// import bookingQueue from './queue/bookingQueue.js';

// dotenv.config();

// logger.info('Environment info:', getEnvironmentInfo());

// // App Init
// class app {
//   constructor(routes) {
//     this.app = express();
//     this.port = process.env.PORT || 8000;
//     this.server = createServer(this.app);
//     this.routes = routes;

//     // Call async init
//     this.initialize();
//   }

//   async initialize() {
//     this.initializeMiddlewares();
//     this.initializeServices();
//     this.initializeRoutes(this.routes);

//     // Initialize BullMQ dashboard BEFORE error handling
//     if (!isVercel() && process.env.ENABLE_BULL_BOARD !== 'false') {
//       await this.initializeBullMQ();
//     }

//     // List routes to verify
//     this.listRoutes();

//     // Initialize error handling AFTER all routes
//     this.initializeErrorHandling();

//     await this.DBconnection();

//     if (!isVercel()) {
//       await this.connectToQueues();
//     }
//   }

//   listen() {
//     this.server.listen(this.port, '0.0.0.0', () => {
//       logger.info(`Server is running on port ${this.port}`);
//     });
//   }

//   // Initialize Middlewares
//   initializeMiddlewares() {
//     this.app.use(cors());
//     this.app.use(express.json());
//     this.app.use(bodyParser.json());
//     this.app.use(express.urlencoded({ extended: true }));
//     this.app.use(helmet());
//     this.app.use(mongoSanitize());
//     this.app.use(xss());
//     this.app.use(hpp());
//     this.app.use(morganMiddleware);
//   }

//   initializeServices() {
//     try {
//       const socketService = new SocketService(this.server);
//       ServiceContainer.register('socketService', socketService);

//       const bookingService = new BookingService(socketService);
//       ServiceContainer.register('bookingService', bookingService);

//       const conversationService = new ConversationService(socketService);
//       ServiceContainer.register('conversationService', conversationService);

//       const chatService = new ChatService(socketService.getIO());
//       ServiceContainer.register('chatService', chatService);

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

//   async initializeBullMQ() {
//     try {
//       logger.info('Starting BullMQ dashboard initialization...');

//       // Check environment
//       logger.info('Environment checks:', {
//         isVercel: isVercel(),
//         ENABLE_BULL_BOARD: process.env.ENABLE_BULL_BOARD,
//         NODE_ENV: process.env.NODE_ENV,
//       });

//       // Dynamic import to avoid loading on Vercel
//       const { bookingQueue } = await import('./queue/bookingQueue.js');

//       if (!bookingQueue) {
//         logger.warn('Booking queue not available, skipping BullMQ dashboard');
//         return;
//       }

//       logger.info('Booking queue loaded successfully');

//       const serverAdapter = new ExpressAdapter();
//       serverAdapter.setBasePath('/api/v1/queue');

//       createBullBoard({
//         queues: [new BullMQAdapter(bookingQueue, { readOnlyMode: true })],
//         serverAdapter,
//       });

//       this.app.use('/api/v1/queue', serverAdapter.getRouter());
//       logger.info('BullMQ dashboard mounted at /api/v1/queue');

//       // Test the route
//       this.app._router.stack.forEach((middleware) => {
//         if (middleware.route) {
//           logger.info(`Registered route: ${middleware.route.path}`);
//         }
//       });
//     } catch (error) {
//       logger.error('Failed to initialize BullMQ dashboard:', error);
//       logger.error('Stack trace:', error.stack);
//     }
//   }

//   async connectToQueues() {

//     try {

//       const { connectToAllQueues } = await import('./queue/queueManager.js');
//       await connectToAllQueues();
//       logger.info('Connected to queues successfully');
//     } catch (error) {
//       logger.error('Failed to connect to queues:', error);
//       // Don't fail app startup if queues fail
//       if (isWorker()) {
//         throw error; // Only throw in worker mode
//       }
//     }
//   }

//   initializeErrorHandling() {
//     // Handle 404 errors
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

//       const status = err.status || 500;
//       let message = 'Something went wrong';

//       if (err instanceof HttpException) {
//         message = err.message || message;
//       } else if (err instanceof Error) {
//         message = err.message;
//       } else if (typeof err === 'object') {
//         message = JSON.stringify(err);
//       }

//       logger.error(
//         `[Error Handler]: Path: ${req.path}, Method: ${req.method}, Status: ${status}, ${message}`
//       );

//       return res.status(status).json({
//         status: 'error',
//         message,
//         errorCode: err.errorCode || 'UNKNOWN_ERROR',
//       });
//     });
//   }

//   listRoutes() {
//     expressListRoutes(this.app, {
//       logger: (method, space, path) => {
//         logger.info(`🚏 [Routes]: ${method}  ${path}`);
//       },
//     });
//   }

//   cleanup() {
//     const socketService = ServiceContainer.get('socketService');
//     if (socketService) {
//       socketService.getIO().close();
//     }
//   }

//   async DBconnection() {
//     await connectDB();
//   }
// }
// scheduleEmailJobs();
// scheduleEarningJobs();
// subscriptionRenewalJob();

// export default app;

// app.js (updated)
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

dotenv.config();

// App Init
class App {
  constructor(routes) {
    this.app = express();
    this.port = process.env.PORT || 8000;
    this.server = createServer(this.app);
    this.routes = routes;
  }

  async initialize() {
    logger.info('🔧 Initializing Express app...');

    this.initializeMiddlewares();
    this.initializeServices();
    this.initializeRoutes(this.routes);

    // Initialize BullMQ dashboard BEFORE error handling
    if (!isVercel() && process.env.ENABLE_BULL_BOARD !== 'false') {
      await this.initializeBullMQ();
    }

    // List routes to verify
    this.listRoutes();

    // Initialize error handling AFTER all routes
    this.initializeErrorHandling();

    // Schedule background jobs (only if not on Vercel)
    if (!isVercel()) {
      this.scheduleBackgroundJobs();
    }

    logger.info('✅ Express app initialization completed');
  }

  listen() {
    this.server.listen(this.port, '0.0.0.0', () => {
      logger.info(`🌐 Server is running on port ${this.port}`);
      logger.info(
        `📊 BullMQ Dashboard: ${
          !isVercel()
            ? `http://localhost:${this.port}/api/v1/queue`
            : 'Disabled on Vercel'
        }`
      );
    });
  }

  // Initialize Middlewares
  initializeMiddlewares() {
    logger.info('🔧 Setting up middlewares...');

    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(bodyParser.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(helmet());
    this.app.use(mongoSanitize());
    this.app.use(xss());
    this.app.use(hpp());
    this.app.use(morganMiddleware);

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
    });
    this.app.use('/api/', limiter);

    logger.info('✅ Middlewares initialized');
  }

  initializeServices() {
    try {
      logger.info('🔧 Initializing services...');

      const socketService = new SocketService(this.server);
      ServiceContainer.register('socketService', socketService);

      const bookingService = new BookingService(socketService);
      ServiceContainer.register('bookingService', bookingService);

      const conversationService = new ConversationService(socketService);
      ServiceContainer.register('conversationService', conversationService);

      const chatService = new ChatService(socketService.getIO());
      ServiceContainer.register('chatService', chatService);

      logger.info('✅ All services initialized successfully');
    } catch (error) {
      logger.error('❌ Error initializing services:', error);
      throw error;
    }
  }

  initializeRoutes(routes) {
    logger.info('🔧 Initializing routes...');

    // Health check route
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        queues: !isVercel() ? 'enabled' : 'disabled',
      });
    });

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Onjeki Backend API',
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        documentation: '/api/v1/docs',
        dashboard: !isVercel() ? '/api/v1/queue' : 'disabled',
      });
    });

    routes.forEach((Route) => {
      try {
        const route = new Route();
        if (!route.router) {
          throw new Error(`Router not initialized for ${Route.name}`);
        }
        this.app.use('/api/v1', route.getRouter());
        logger.info(`✅ Route initialized: ${Route.name}`);
      } catch (error) {
        logger.error(`❌ Error initializing route: ${Route.name}`, error);
        throw error;
      }
    });

    logger.info('✅ All routes initialized');
  }

  async initializeBullMQ() {
    try {
      logger.info('🔧 Starting BullMQ dashboard initialization...');

      // Dynamic import to avoid loading on Vercel
      const { bookingQueue } = await import('./queue/bookingQueue.js');

      if (!bookingQueue) {
        logger.warn(
          '⚠️ Booking queue not available, skipping BullMQ dashboard'
        );
        return;
      }

      logger.info('✅ Booking queue loaded successfully');

      const serverAdapter = new ExpressAdapter();
      serverAdapter.setBasePath('/api/v1/queue');

      const { addQueue, removeQueue, setQueues, replaceQueues } =
        createBullBoard({
          queues: [new BullMQAdapter(bookingQueue)], // Remove readOnlyMode for full functionality
          serverAdapter,
        });

      this.app.use('/api/v1/queue', serverAdapter.getRouter());
      logger.info('✅ BullMQ dashboard mounted at /api/v1/queue');

      // Store references for potential future use
      this.bullBoard = { addQueue, removeQueue, setQueues, replaceQueues };
    } catch (error) {
      logger.error('❌ Failed to initialize BullMQ dashboard:', error);
      // Don't throw - let the app continue without the dashboard
    }
  }

  scheduleBackgroundJobs() {
    try {
      logger.info('🔧 Scheduling background jobs...');

      scheduleEmailJobs();
      scheduleEarningJobs();
      subscriptionRenewalJob();

      logger.info('✅ Background jobs scheduled');
    } catch (error) {
      logger.error('❌ Error scheduling background jobs:', error);
      // Don't throw - let the app continue
    }
  }

  initializeErrorHandling() {
    logger.info('🔧 Setting up error handling...');

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
        // `[Error Handler]: Path: ${req.path}, Method: ${req.method}, Status: ${status], ${message}`
      );

      return res.status(status).json({
        status: 'error',
        message,
        errorCode: err.errorCode || 'UNKNOWN_ERROR',
      });
    });

    logger.info('✅ Error handling initialized');
  }

  listRoutes() {
    logger.info('📋 Listing all routes:');
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

  // Getter for the Express app (useful for testing)
  getApp() {
    return this.app;
  }

  // Getter for the HTTP server
  getServer() {
    return this.server;
  }
}

export default App;
