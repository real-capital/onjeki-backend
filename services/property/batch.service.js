// // services/batch.service.js
// import Queue from 'bull';
// import { chunk } from 'lodash';
// import PropModel from '../models/property.model.js';
// import BookingModel from '../models/booking.model.js';
// import { sendBulkEmails } from '../utils/email.js';

// class BatchProcessingService {
//   constructor() {
//     this.batchQueue = new Queue('batch-operations', {
//       redis: {
//         host: process.env.REDIS_HOST,
//         port: process.env.REDIS_PORT,
//         password: process.env.REDIS_PASSWORD
//       }
//     });

//     this.setupQueueProcessors();
//   }

//   setupQueueProcessors() {
//     this.batchQueue.process('update-property-prices', async (job) => {
//       const { properties, updateData } = job.data;
//       return this.processPropertyPriceUpdates(properties, updateData);
//     });

//     this.batchQueue.process('send-bulk-notifications', async (job) => {
//       const { users, notification } = job.data;
//       return this.processBulkNotifications(users, notification);
//     });
//   }

//   async processPropertyPriceUpdates(properties, updateData) {
//     const chunks = chunk(properties, 100); // Process in chunks of 100
//     const results = {
//       success: 0,
//       failed: 0,
//       errors: []
//     };

//     for (const batch of chunks) {
//       try {
//         await PropModel.updateMany(
//           { _id: { $in: batch } },
//           { $set: updateData },
//           { multi: true }
//         );
//         results.success += batch.length;
//       } catch (error) {
//         results.failed += batch.length;
//         results.errors.push({
//           batch: batch,
//           error: error.message
//         });
//       }
//     }

//     return results;
//   }

//   async processBulkNotifications(users, notification) {
//     const chunks = chunk(users, 50); // Process in chunks of 50
//     const results = {
//       sent: 0,
//       failed: 0,
//       errors: []
//     };

//     for (const batch of chunks) {
//       try {
//         await sendBulkEmails(batch, notification);
//         results.sent += batch.length;
//       } catch (error) {
//         results.failed += batch.length;
//         results.errors.push({
//           users: batch,
//           error: error.message
//         });
//       }
//     }

//     return results;
//   }

//   async schedulePropertyPriceUpdate(properties, updateData) {
//     return this.batchQueue.add('update-property-prices', {
//       properties,
//       updateData
//     }, {
//       attempts: 3,
//       backoff: {
//         type: 'exponential',
//         delay: 2000
//       }
//     });
//   }

//   async scheduleBulkNotifications(users, notification) {
//     return this.batchQueue.add('send-bulk-notifications', {
//       users,
//       notification
//     }, {
//       attempts: 2,
//       backoff: {
//         type: 'fixed',
//         delay: 5000
//       }
//     });
//   }
// }

// export default new BatchProcessingService();