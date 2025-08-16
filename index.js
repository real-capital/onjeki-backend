// // index.js
// import App from './app.js';
// import AuthRoute from './routes/auth/auth.route.js';
// import PropertyRoute from './routes/property/property.route.js';
// import CategoryRoute from './routes/category/category.route.js';
// import AmenitiesRoute from './routes/amenity/amenities.route.js';
// import BuildingRoute from './routes/building/building.route.js';
// import WishlistRoute from './routes/wishlist/wishlist.routes.js';
// import ChatRoute from './routes/message/chat.route.js';
// import BookingRoute from './routes/booking/booking.route.js';
// import { logger } from './utils/logger.js';
// import ConversationRoute from './routes/conversation/conversation.route.js';
// import SubscriptionRoute from './routes/payment/subscription.route.js';
// import RentSalesChatRoute from './routes/rentSalesChat/rentSalesChat.route.js';
// import EarningsRoute from './routes/payment/earning.route.js';
// import PayoutRoute from './routes/payment/payout.route.js';
// import BankRoute from './routes/payment/bank.route.js';
// import UserBankRoute from './routes/payment/user-bank.route.js';


// try {
//   const routes = [
//     AuthRoute,
//     PropertyRoute,
//     CategoryRoute,
//     AmenitiesRoute,
//     BuildingRoute,
//     WishlistRoute,
//     ChatRoute,
//     BookingRoute,
//     ConversationRoute,
//     SubscriptionRoute,
//     RentSalesChatRoute,
//     EarningsRoute,
//     PayoutRoute,
//     BankRoute,
//     UserBankRoute,
//   ];

//   // Validate routes
//   routes.forEach((Route) => {
//     if (typeof Route !== 'function') {
//       throw new Error(`Invalid route class: ${Route}`);
//     }
//   });

//   const app = new App(routes);
//   app.listen();

//   // Signal handlers
//   process.on('SIGTERM', () => {
//     logger.info('SIGTERM received. Cleaning up...');
//     app.cleanup();
//     process.exit(0);
//   });

//   process.on('SIGINT', () => {
//     logger.info('SIGINT received. Cleaning up...');
//     app.cleanup();
//     process.exit(0);
//   });

//   process.on('unhandledRejection', (err) => {
//     logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
//     logger.error(err);
//     process.exit(1);
//   });

//   process.on('uncaughtException', (err) => {
//     logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
//     logger.error(err);
//     process.exit(1);
//   });
// } catch (error) {
//   logger.error('Failed to start application:', error);
//   process.exit(1);
// }


// index.js
import 'dotenv/config';
import mongoose from 'mongoose';
import App from './app.js';
import AuthRoute from './routes/auth/auth.route.js';
import PropertyRoute from './routes/property/property.route.js';
import CategoryRoute from './routes/category/category.route.js';
import AmenitiesRoute from './routes/amenity/amenities.route.js';
import BuildingRoute from './routes/building/building.route.js';
import WishlistRoute from './routes/wishlist/wishlist.routes.js';
import ChatRoute from './routes/message/chat.route.js';
import BookingRoute from './routes/booking/booking.route.js';
import ConversationRoute from './routes/conversation/conversation.route.js';
import SubscriptionRoute from './routes/payment/subscription.route.js';
import RentSalesChatRoute from './routes/rentSalesChat/rentSalesChat.route.js';
import EarningsRoute from './routes/payment/earning.route.js';
import PayoutRoute from './routes/payment/payout.route.js';
import BankRoute from './routes/payment/bank.route.js';
import UserBankRoute from './routes/payment/user-bank.route.js';

import { logger } from './utils/logger.js';
import { isVercel, getEnvironmentInfo } from './utils/environment.js';
import {
  startAllQueuesAndWorkers,
  stopAllQueuesAndWorkers,
} from './queue/queueManager.js';
import { closeRedisConnection } from './config/redis.js';
import ReviewRoute from './routes/review/review.routes.js';

// Main application startup
async function startApplication() {
  try {
    logger.info('🚀 Starting Onjeki Backend Application...');
    logger.info('Environment info:', getEnvironmentInfo());

    // Define routes
    const routes = [
      AuthRoute,
      PropertyRoute,
      CategoryRoute,
      AmenitiesRoute,
      BuildingRoute,
      WishlistRoute,
      ChatRoute,
      BookingRoute,
      ConversationRoute,
      SubscriptionRoute,
      RentSalesChatRoute,
      EarningsRoute,
      PayoutRoute,
      BankRoute,
      UserBankRoute,
      ReviewRoute,
    ];

    // Validate routes
    routes.forEach((Route) => {
      if (typeof Route !== 'function') {
        throw new Error(`Invalid route class: ${Route}`);
      }
    });

    logger.info(`✅ ${routes.length} routes validated`);

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ Connected to MongoDB');

    // Initialize the Express app
    const app = new App(routes);
    
    // Wait for app to fully initialize (this includes BullMQ setup)
    await app.initialize();
    logger.info('✅ Express app initialized');

    // Start queues and workers (if not on Vercel)
    if (!isVercel()) {
      try {
        await startAllQueuesAndWorkers();
        logger.info('✅ Background queues and workers started');
      } catch (error) {
        logger.error('⚠️ Failed to start queues and workers (continuing anyway):', error);
        // Don't fail the entire app if queues fail
      }
    } else {
      logger.info('⚠️ Running on Vercel - background workers disabled');
    }

    // Start the HTTP server
    app.listen();
    logger.info('✅ Application startup completed successfully');

    return app;

  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Graceful shutdown function
async function gracefulShutdown(signal, app) {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  try {
    // Clean up app resources first
    if (app) {
      app.cleanup();
      logger.info('✅ App resources cleaned up');
    }

    // Stop queues and workers
    if (!isVercel()) {
      try {
        await stopAllQueuesAndWorkers();
        logger.info('✅ Queues and workers stopped');
      } catch (error) {
        logger.error('⚠️ Error stopping queues and workers:', error);
      }
    }
    
    // Close Redis connection
    try {
      await closeRedisConnection();
      logger.info('✅ Redis connection closed');
    } catch (error) {
      logger.error('⚠️ Error closing Redis connection:', error);
    }
    
    // Close MongoDB connection
    try {
      await mongoose.connection.close();
      logger.info('✅ MongoDB connection closed');
    } catch (error) {
      logger.error('⚠️ Error closing MongoDB connection:', error);
    }
    
    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION! 💥', {
    reason: reason,
    promise: promise,
    stack: reason?.stack
  });
  
  // Give some time for logging then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥', {
    error: error.message,
    stack: error.stack
  });
  
  // Exit immediately for uncaught exceptions
  process.exit(1);
});

// Start the application and set up signal handlers
startApplication().then((app) => {
  // Signal handlers with graceful shutdown
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM', app));
  process.on('SIGINT', () => gracefulShutdown('SIGINT', app));
  
  // Additional cleanup on exit
  process.on('exit', (code) => {
    logger.info(`Process exiting with code ${code}`);
  });

}).catch((error) => {
  logger.error('❌ Failed to start application:', error);
  process.exit(1);
});