// index.js
import App from './app.js';
import AuthRoute from './routes/auth/auth.route.js';
import PropertyRoute from './routes/property/property.route.js';
import CategoryRoute from './routes/category/category.route.js';
import AmenitiesRoute from './routes/amenity/amenities.route.js';
import BuildingRoute from './routes/building/building.route.js';
import WishlistRoute from './routes/wishlist/wishlist.routes.js';
import ChatRoute from './routes/message/chat.route.js';
import BookingRoute from './routes/booking/booking.route.js';
import { logger } from './utils/logger.js';
import ConversationRoute from './routes/conversation/conversation.route.js';
import SubscriptionRoute from './routes/payment/subscription.route.js';
import RentSalesChatRoute from './routes/rentSalesChat/rentSalesChat.route.js';
import EarningsRoute from './routes/payment/earning.route.js';
import PayoutRoute from './routes/payment/payout.route.js';
import BankRoute from './routes/payment/bank.route.js';
import UserBankRoute from './routes/payment/user-bank.route.js';
// import PaymentRoute from './routes/payment/payment.route.js';

try {
  // Make sure all route classes are properly exported
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
    UserBankRoute
    // PaymentRoute,
  ];

  // Validate routes
  routes.forEach((Route) => {
    if (typeof Route !== 'function') {
      throw new Error(`Invalid route class: ${Route}`);
    }
  });

  const app = new App(routes);
  app.listen();
} catch (error) {
  logger.error('Failed to start application:', error);
  process.exit(1);
}
