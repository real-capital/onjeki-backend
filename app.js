import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import morgan from 'morgan';
import expressListRoutes from 'express-list-routes';
import { createServer } from 'http';
import Route from './interfaces/route.interface.js';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';

import connectDB from './config/db.js';
import { AppError } from './middlewares/handleError.js';
// import HttpResponse from '../response/HttpResponse.js';
import { logger } from './utils/logger.js';
import HttpException from './utils/exception.js';
import morganMiddleware from './middlewares/morgan.middleware.js';
import { handleMulterError } from './middlewares/upload.middleware.js';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// App Init
class app {
  constructor(routes) {
    this.app = express();
    this.port = process.env.PORT || 8000;
    this.server = createServer(this.app);

    // Initialize middlewares, routes, error handling, etc.
    this.initializeMiddlewares();
    this.initializeRoutes(routes);
    this.initializeErrorHandling();
    this.listRoutes();
    this.DBconnection();
  }

  listen() {
    this.server.listen(this.port, '0.0.0.0', () => {
      logger.info(`Server is running on port ${this.port}`);
    });
  }

  // Initialize Middlewares
  initializeMiddlewares() {
    this.app.use(cors()); // CORS middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(bodyParser.json()); // JSON body parser
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL-encoded body parser
    this.app.use(helmet()); // Security middleware
    this.app.use(mongoSanitize()); // Sanitize user inputs
    this.app.use(xss()); // Prevent XSS attacks
    this.app.use(hpp()); // Prevent HTTP parameter pollution
    this.app.use(morganMiddleware); // Request logging middleware

    // this.app.use();
    // this.app.use(
    //   rateLimit({
    //     windowMs: 15 * 60 * 1000, // 15 minutes
    //     max: 100, // limit each IP to 100 requests per windowMs
    //   })
    // );
  }

  // Initialize Routes
  initializeRoutes(routes) {
    routes.forEach((route) => {
      this.app.use('/api/v1', route.router); // Register each route with version prefix
      this.app.use(
        '/api/v1',
        rateLimit({
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 100, // limit each IP to 100 requests per windowMs
        })
      ); // Register each route with version prefix
    });
    this.app.use(handleMulterError);
  }

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

  // Database connection
  async DBconnection() {
    await connectDB();
  }
}

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

// Initialize the app with routes
// const app = new App(routes); // `routes` would be passed to the constructor
// app.listen();

export default app;
