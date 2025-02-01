import express from 'express';
import { Route } from '../../interfaces/route.interface';
import ReviewController from '../../controller/review/review.controller';
import { upload } from '../../middlewares/upload.middleware';
import { isAuthenticated } from '../../middlewares/auth';

class ReviewRoute extends Route {
  constructor() {
    super(express.Router());
    this.path = '/reviews';
    this.controller = new ReviewController();
    this.initializeRoute();
  }

  initializeRoute() {
    this.router.post(
      `${this.path}/bookings/:bookingId/reviews`,
      upload('reviews', 5),
      isAuthenticated,
      this.controller.createReview
    );
    // this.router.get(
    //   `${this.path}/:reviewId`,
    //   upload('reviews', 5),
    //   isAuthenticated,
    //   this.controller.getReview
    // );
    //       router
    //   .route('/reviews/:reviewId')
    //   .get(reviewController.getReview)
    //   .patch(reviewController.updateReview)
    //   .delete(reviewController.deleteReview);

    // router
    //   .route('/reviews/:reviewId/response')
    //   .post(reviewController.respondToReview)
    //   .patch(reviewController.updateResponse)
    //   .delete(reviewController.deleteResponse);

    // router
    //   .route('/reviews/:reviewId/report')
    //   .post(reviewController.reportReview);
  }
}
