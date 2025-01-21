// jobs/queue.js
import Queue from 'bull';
import { processEmailJob } from './processors/email.processor.js';
import { processNotificationJob } from './processors/notification.processor.js';
import { processBookingReminderJob } from './processors/booking-reminder.processor.js';

// Create queues
export const emailQueue = new Queue('email', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
  }
});

export const notificationQueue = new Queue('notification');
export const bookingReminderQueue = new Queue('booking-reminder');

// Process jobs
emailQueue.process(processEmailJob);
notificationQueue.process(processNotificationJob);
bookingReminderQueue.process(processBookingReminderJob);
