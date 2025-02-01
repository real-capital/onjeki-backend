// routes/property/property.route.js
import express from 'express';
import { Route } from '../../interfaces/route.interface.js';
import BookingController from '../../controller/controller/booking.controller';
import { isAuthenticated } from '../../middlewares/auth.js';
class BookingRoute extends Route {
  constructor() {
    super(express.Router());
    this.path = '/booking';
    this.controller = new BookingController();
    this.initializeRoute();
  }
  initializeRoute() {
    this.router.post(
      `${this.path}`,
      isAuthenticated,
      this.controller.createBooking
    );
  }
}

export default BookingRoute;



// router
//   .route('/')
//   .get(bookingController.getMyBookings)
//   .post(validateBooking, bookingController.createBooking);

// router
//   .route('/:id')
//   .get(bookingController.getBooking)
//   .patch(validateBooking, bookingController.updateBooking)
//   .delete(bookingController.cancelBooking);

// router
//   .route('/:id/confirm')
//   .post(restrictTo('host'), bookingController.confirmBooking);

// router
//   .route('/:id/reject')
//   .post(restrictTo('host'), bookingController.rejectBooking);

// router
//   .route('/:id/check-in')
//   .post(restrictTo('host'), bookingController.checkInGuest);

// router
//   .route('/:id/check-out')
//   .post(restrictTo('host'), bookingController.checkOutGuest);