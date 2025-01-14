// import 'module-alias/register.js';  // No need for require() in ESM
import 'reflect-metadata';
import helmet from 'helmet';
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';




import connectDB from '../config/db.js';  // No curly braces for default export


// App Init
const app = express();

// Trust the first hop of the proxy
app.set('trust proxy', 1);

app.use(hpp());

// Define API version prefix
const apiVersion = '/api/v1';

app.use(helmet());
// Middlewares

const allowedOrigins = ['*'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow requests from the specified origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(expressPinoLogger({ logger }));
app.use(mongoSanitize());

// App Home Route
app.use(xss());
app.get('/', (req, res) => {
  res.send('Welcome to the Onjeki API');
});

// Register Routes

// require("../routes/index.routes")(app);

// Calling the db connection function.
connectDB();

app.use((error, req, res, next) => {
  error.status = error.status || 'error';
  error.statusCode = error.statusCode || 500;

  res.status(error.statusCode).json({
    errors: [
      {
        error: error.message,
      },
    ],
  });
});
app.all('*', (req, res, next) => {
  res.status(404).json({
    errors: [
      {
        error: `Can't find ${req.originalUrl} on this server`,
      },
    ],
  });

  // const err = new Error(`Can't find ${req.originalUrl} on this server`);
  // err.status = 'fail';
  // err.statusCode = 404;

  // next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

/**
 *  uncaughtException handler
 */
process.on('uncaughtException', async (error) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Server Shutting down...');
  console.log(error.name, error.message);
  // logger.error('UNCAUGHT EXCEPTION!! 💥 Server Shutting down... ' + new Date(Date.now()) + error.name, error.message);
  //   await stopAllQueuesAndWorkers();
  process.exit(1);
});

/**
 * unhandledRejection  handler
 */

process.on('unhandledRejection', async (error) => {
  console.log('UNHANDLED REJECTION! 💥 Server Shutting down...');
  console.log(error.name, error.message);
  // logger.error('UNHANDLED REJECTION! 💥 Server Shutting down... ' + new Date(Date.now()) + error.name, error.message);
  //   await stopAllQueuesAndWorkers();
  process.exit(1);
});

export default app;
