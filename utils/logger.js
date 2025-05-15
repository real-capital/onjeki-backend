import { existsSync, mkdirSync } from 'fs';
import path, { join } from 'path';
import winston from 'winston';
import { fileURLToPath } from 'url';

// Workaround for ES module __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use the writable `/tmp/logs` directory for Vercel or fallback if needed
// const LOG_DIR = '/tmp/logs';
// const dir = join(LOG_DIR);

// // Create the directory if it doesn't exist
// if (!existsSync(dir)) {
//   mkdirSync(dir, { recursive: true });
// }
// Determine log directory based on environment
const LOG_DIR =
  process.env.NODE_ENV === 'production'
    ? '/tmp/logs' // Use /tmp for Vercel production
    : path.join(__dirname, '../logs'); // Use local directory for development

console.log(`Using log directory: ${LOG_DIR}`);

const dir = LOG_DIR;

// Create the directory if it doesn't exist
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

// Define your severity levels.
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Determine the log level based on the environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'warn';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define the log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

const custformat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Define transports for logging
const transports = [
  new winston.transports.Console({
    format,
  }),
  new winston.transports.File({
    dirname: dir,
    filename: 'error.log',
    level: 'error',
    format: custformat,
  }),
  new winston.transports.File({
    dirname: dir,
    filename: 'all.log',
    format: custformat,
  }),
];

// Create the logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
});

const stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

export { logger, stream };
