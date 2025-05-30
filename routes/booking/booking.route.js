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
    this.router.get(
      `${this.path}/host/bookings/:bookingId`,
      isAuthenticated,
      this.controller.getHostBookingById
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
    // New routes for earnings/payouts integration
    this.router.get(
      `${this.path}/host/earnings`,
      isAuthenticated,
      this.controller.getHostBookingsWithEarnings
    );

    this.router.get(
      `${this.path}/host/payout-eligibility`,
      isAuthenticated,
      this.controller.checkPayoutEligibility
    );

    // Complete booking after checkout
    this.router.post(
      `${this.path}/:id/complete`,
      isAuthenticated,
      this.controller.completeBooking
    );

    /**
     * @api {get} /api/booking/host/today Get Today's Bookings
     * @apiName GetHostTodayBookings
     * @apiGroup Booking
     * @apiPermission authenticated host
     *
     * @apiDescription Get all bookings for today (check-ins and check-outs)
     *
     * @apiSuccess {String} status Success status
     * @apiSuccess {Object[]} data List of today's bookings
     */
    this.router.get(
      `${this.path}/host/today`,
      isAuthenticated,
      this.controller.getHostTodayBookings
    );

    /**
     * @api {get} /api/booking/host/upcoming Get Upcoming Bookings
     * @apiName GetHostUpcomingBookings
     * @apiGroup Booking
     * @apiPermission authenticated host
     *
     * @apiDescription Get all upcoming bookings (future check-ins)
     *
     * @apiParam {Number} [limit=10] Number of bookings to return
     * @apiParam {Number} [page=1] Page number for pagination
     *
     * @apiSuccess {String} status Success status
     * @apiSuccess {Object} data Response data
     * @apiSuccess {Object[]} data.bookings List of upcoming bookings
     * @apiSuccess {Object} data.pagination Pagination information
     */
    this.router.get(
      `${this.path}/host/upcoming`,
      isAuthenticated,
      this.controller.getHostUpcomingBookings
    );

    /**
     * @api {get} /api/booking/host/completed Get Completed Bookings
     * @apiName GetHostCompletedBookings
     * @apiGroup Booking
     * @apiPermission authenticated host
     *
     * @apiDescription Get all completed bookings
     *
     * @apiParam {Number} [limit=10] Number of bookings to return
     * @apiParam {Number} [page=1] Page number for pagination
     *
     * @apiSuccess {String} status Success status
     * @apiSuccess {Object} data Response data
     * @apiSuccess {Object[]} data.bookings List of completed bookings
     * @apiSuccess {Object} data.pagination Pagination information
     */

    this.router.get(
      `${this.path}/host/completed`,
      isAuthenticated,
      this.controller.getHostCompletedBookings
    );
    /**
     * @api {post} /api/booking/:id/checkin Check In Guest
     * @apiName CheckInGuest
     * @apiGroup Booking
     * @apiPermission authenticated host
     *
     * @apiDescription Check in a guest for a booking
     *
     * @apiParam {String} id Booking ID
     * @apiParam {String} [checkInNotes] Notes about the check-in
     * @apiParam {String[]} [checkInPhotos] Array of photo URLs (if uploaded separately)
     *
     * @apiSuccess {String} status Success status
     * @apiSuccess {Object} data Updated booking
     * @apiSuccess {String} message Success message
     */
    this.router.post(
      `${this.path}/:id/checkin`,
      isAuthenticated,
      this.controller.checkInGuest
    );

    /**
     * @api {post} /api/booking/:id/checkout Check Out Guest
     * @apiName CheckOutGuest
     * @apiGroup Booking
     * @apiPermission authenticated host
     *
     * @apiDescription Check out a guest for a booking
     *
     * @apiParam {String} id Booking ID
     * @apiParam {String} [checkOutNotes] Notes about the check-out
     * @apiParam {String[]} [checkOutPhotos] Array of photo URLs (if uploaded separately)
     *
     * @apiSuccess {String} status Success status
     * @apiSuccess {Object} data Updated booking
     * @apiSuccess {String} message Success message
     */
    this.router.post(
      `${this.path}/:id/checkout`,
      isAuthenticated,
      this.controller.checkOutGuest
    );

    /**
     * @api {post} /api/booking/:id/upload-photos Upload Booking Photos
     * @apiName UploadBookingPhotos
     * @apiGroup Booking
     * @apiPermission authenticated host
     *
     * @apiDescription Upload photos for check-in or check-out
     *
     * @apiParam {String} id Booking ID
     * @apiParam {String} type Type of photos ('checkin' or 'checkout')
     * @apiParam {File[]} photos Photos to upload (multipart/form-data)
     *
     * @apiSuccess {String} status Success status
     * @apiSuccess {Object} data Response data
     * @apiSuccess {String[]} data.photoUrls URLs of the uploaded photos
     * @apiSuccess {String} message Success message
     */
    this.router.post(
      `${this.path}/:id/upload-photos`,
      isAuthenticated,
      this.controller.uploadBookingPhotos
    );
  }
}

export default BookingRoute;
