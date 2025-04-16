// routes/booking/booking.route.js
import express from 'express';
import { Route } from '../../interfaces/route.interface.js';
import { isAuthenticated } from '../../middlewares/auth.js';
import ServiceContainer from '../../services/ServiceContainer.js';
import { logger } from '../../utils/logger.js';
import BookingController from '../../controller/controller/booking.controller.js';

class BookingRoute extends Route {
  constructor() {
    super();
    this.path = '/booking';

    try {
      const bookingService = ServiceContainer.get('bookingService');

      this.controller = new BookingController(bookingService);
      this.initializeRoutes();
    } catch (error) {
      logger.error('Error initializing BookingRoute:', error);
      throw error;
    }
  }

  initializeRoutes() {
    // Create booking
    this.router.post(
      `${this.path}`,
      isAuthenticated,
      this.controller.createBooking
    );
    this.router.post(
      `${this.path}/:id/initiate-payment`,
      isAuthenticated,
      this.controller.initiatePayment
    );
    this.router.post(
      `${this.path}/:id/verify-payment`,
      isAuthenticated,
      this.controller.verifyPayment
    );
    this.router.get(`${this.path}/paystack/callback`, this.controller.callback);
    this.router.post(`${this.path}/paystack/webhook`, this.controller.webhook);

    // Get booking by ID
    this.router.get(
      `${this.path}/:bookingId`,
      isAuthenticated,
      this.controller.getBooking
    );

    // Get user bookings
    this.router.get(
      `${this.path}`,
      isAuthenticated,
      this.controller.getUserBookings
    );

    // Get host bookings
    this.router.get(
      `${this.path}/host/bookings`,
      isAuthenticated,
      this.controller.getHostBookings
    );

    // Get pending bookings
    this.router.get(
      `${this.path}/pending`,
      isAuthenticated,
      this.controller.getPendingBookings
    );

    // Accept booking
    this.router.patch(
      `${this.path}/:id/accept`,
      isAuthenticated,
      this.controller.acceptBooking
    );

    // Reject booking
    this.router.patch(
      `${this.path}/:id/reject`,
      isAuthenticated,
      this.controller.rejectBooking
    );

    // Cancel booking
    this.router.patch(
      `${this.path}/:bookingId/cancel`,
      isAuthenticated,
      this.controller.cancelBooking
    );
    this.router.delete(
      `${this.path}/:bookingId/delete`,
      isAuthenticated,
      this.controller.deleteBooking
    );
  }
}

export default BookingRoute;
// router.post(
//   '/properties/:propertyId/calculate',
//   authMiddleware,
//   validateBookingDates,
//   catchAsync(bookingController.calculatePrice)
// );

// router.post(
//   '/bookings',
//   authMiddleware,
//   validateBookingCreate,
//   catchAsync(bookingController.createBooking)
// );

// router.get(
//   '/bookings/:bookingId',
//   authMiddleware,
//   catchAsync(bookingController.getBooking)
// );

// router.post(
//   '/bookings/:bookingId/cancel',
//   authMiddleware,
//   validateCancellation,
//   catchAsync(bookingController.cancelBooking)
// );
