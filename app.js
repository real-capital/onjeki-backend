// import 'reflect-metadata';
// import helmet from 'helmet';
// import express from 'express';
// import bodyParser from 'body-parser';
// import dotenv from 'dotenv';
// import cors from 'cors';
// import mongoSanitize from 'express-mongo-sanitize';
// import xss from 'xss-clean';
// import hpp from 'hpp';

// import connectDB from '../config/db.js'; // No curly braces for default export
// import { AppError } from '../middleware/handleError.js';
// import HttpResponse from '../response/HttpResponse.js';

// // Load environment variables
// dotenv.config();

// // App Init
// const app = express();

// // Trust the first hop of the proxy
// app.set('trust proxy', 1);

// // Middlewares
// app.use(hpp());
// app.use(helmet());
// app.use(cors());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(mongoSanitize());
// app.use(xss());

// // Define API version prefix
// const apiVersion = '/api/v1';

// // App Home Route
// app.get('/', (req, res) => {
//   res.send('Welcome to the Onjeki API');
// });

// // Calling the db connection function.
// connectDB();

// // Register Routes
// // require("../routes/index.routes")(app);

// // Global error handling middleware
// app.use((err, req, res, next) => {
//   if (err instanceof AppError) {
//     // Handle known errors (AppError)
//     const response = err.toHttpResponse();
//     return res.status(err.statusCode).json(response); // Status code from the error
//   }

//   // Handle unknown errors (default to 500)
//   console.error(err); // Log the error details for debugging
//   const response = new AppError(
//     500,
//     'Something went wrong',
//     err,
//     'UNKNOWN_ERROR'
//   ).toHttpResponse();
//   return res.status(500).json(response); // Default 500 for unknown errors
// });

// // 404 Route not found handler
// app.all('*', (req, res, next) => {
//   const error = new AppError(
//     404,
//     `Can't find ${req.originalUrl} on this server`,
//     null,
//     'RESOURCE_NOT_FOUND'
//   );
//   next(error); // Pass to the global error handler
// });

// // uncaughtException handler
// process.on('uncaughtException', async (error) => {
//   console.log('UNCAUGHT EXCEPTION! 💥 Server Shutting down...');
//   console.log(error.name, error.message);
//   process.exit(1); // Exit process
// });

// // unhandledRejection handler
// process.on('unhandledRejection', async (error) => {
//   console.log('UNHANDLED REJECTION! 💥 Server Shutting down...');
//   console.log(error.name, error.message);
//   process.exit(1); // Exit process
// });

// export default app;

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
    this.app.use(morganMiddleware); // Request logging middleware
    this.app.use(helmet()); // Security middleware
    this.app.use(cors()); // CORS middleware
    this.app.use(bodyParser.json()); // JSON body parser
    this.app.use(bodyParser.urlencoded({ extended: true })); // URL-encoded body parser
    this.app.use(mongoSanitize()); // Sanitize user inputs
    this.app.use(xss()); // Prevent XSS attacks
    this.app.use(hpp()); // Prevent HTTP parameter pollution
  }

  // Initialize Routes
  initializeRoutes(routes) {
    routes.forEach((route) => {
      this.app.use('/api/v1', route.router); // Register each route with version prefix
    });
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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.log('Uncaught Exception:', error);
  process.exit(1); // Exit process
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.log('Unhandled Rejection:', error);
  process.exit(1); // Exit process
});

// Initialize the app with routes
// const app = new App(routes); // `routes` would be passed to the constructor
// app.listen();

export default app;
