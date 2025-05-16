// import Queue from 'bull';

// const bookingQueue = new Queue('bookingQueue', process.env.REDIS_URL);

// export default bookingQueue;

import { Queue } from 'bullmq';
import { redisConnection } from '../jobs/redis-connection.js';

const bookingQueue = new Queue('bookingQueue', {
  connection: redisConnection, // same Redis connection config everywhere
});

export default bookingQueue;
