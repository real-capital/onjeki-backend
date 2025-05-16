import Queue from 'bull';

const bookingQueue = new Queue('bookingQueue', process.env.REDIS_URL);

export default bookingQueue;
