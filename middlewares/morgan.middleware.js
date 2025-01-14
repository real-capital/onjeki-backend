import morgan from 'morgan';
import { NODE_ENV } from '../config/index.js';
import { logger } from '../utils/logger.js';

const stream = {
  write: (message) =>
    logger.http(message.substring(0, message.lastIndexOf('\n'))),
};

const skip = () => {
  const env = NODE_ENV || 'development';
  return env !== 'development';
};

const morganMiddleware = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream, skip }
);

export default morganMiddleware;
