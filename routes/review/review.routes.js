import multer from 'multer';
import express from 'express';
import { Route } from '../../interfaces/route.interface.js';
import ReviewController from '../../controller/review/review.controller.js';
// import { upload } from '../../middlewares/upload.middleware.js';
import { isAuthenticated } from '../../middlewares/auth.js';

const storage = multer.diskStorage({
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  },
});

const upload = multer({ storage });
class ReviewRoute extends Route {
  constructor() {
    super(express.Router());
    this.path = '/reviews';
    this.controller = new ReviewController();
    this.initializeRoute();
  }

  initializeRoute() {
    this.router.post(
      `/bookings/:bookingId/reviews`,
      upload.array('reviews', 5),
      isAuthenticated,
      this.controller.createReview
    );

    this.router.get(`${this.path}/:reviewId`, this.controller.getReview);

    this.router.patch(
      `${this.path}/:reviewId`,
      isAuthenticated,
      this.controller.updateReview
    );

    this.router.delete(
      `${this.path}/:reviewId`,
      isAuthenticated,
      this.controller.deleteReview
    );

    this.router.get(
      `/properties/:propertyId/reviews`,
      this.controller.getPropertyReviews
    );

    this.router.get(`/users/:userId/reviews`, this.controller.getUserReviews);

    this.router.post(
      `${this.path}/:reviewId/response`,
      isAuthenticated,
      this.controller.respondToReview
    );

    this.router.post(
      `${this.path}/:reviewId/report`,
      isAuthenticated,
      this.controller.reportReview
    );

    this.router.get(
      `/users/:userId/reviews`,
      this.controller.getUserReviewsById
    );

    this.router.get(
      `/users/:userId/reviews/summary`,
      this.controller.getUserReviewsSummary
    );

    this.router.get(
      `/bookings/:bookingId/can-review`,
      isAuthenticated,
      this.controller.canReviewBooking
    );

    this.router.get(
      `/bookings/:bookingId/review`,
      isAuthenticated,
      this.controller.getBookingReview
    );
  }
}

export default ReviewRoute;
