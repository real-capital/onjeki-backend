import { uploadMultipleImages } from '../../services/upload/upload.service.js';
import { sendNotification } from '../../services/notificationService';
import Review from '../../models/review.model.js';
import BookingModel from '../../models/booking.model.js';
import { StatusCodes } from 'http-status-codes';
import { BookingStatus } from '../../enum/booking.enum.js';
class ReviewController {
  createReview = async (req, res, next) => {
    try {
      const { bookingId } = req.params;
      const booking = await BookingModel.findById(bookingId);

      if (!booking) {
        return next(
          new HttpException(StatusCodes.NOT_FOUND, 'Booking not found')
        );
      }

      // Verify review eligibility
      if (booking.status !== BookingStatus.COMPLETED) {
        return next(
          new HttpException(
            StatusCodes.BAD_REQUEST,
            'Cannot review incomplete booking'
          )
        );
      }

      // Check if review already exists
      const existingReview = await Review.findOne({ booking: bookingId });
      if (existingReview) {
        return next(
          new HttpException(
            StatusCodes.BAD_REQUEST,
            'Review already exists for this booking'
          )
        );
      }

      // Handle photo uploads
      let photos = [];
      if (req.files?.length) {
        const uploadedPhotos = await uploadMultipleImages(req.files, 'reviews');
        photos = uploadedPhotos.map((url) => ({ url }));
      }

      // Determine review type
      const reviewType = booking.guest.equals(req.user._id)
        ? 'guest_review'
        : 'host_review';

      const review = await Review.create({
        ...req.body,
        booking: bookingId,
        property: booking.property,
        reviewer: req.user._id,
        reviewType,
        photos,
      });

      // Update booking with review reference
      booking.review = review._id;
      await booking.save();

      // Send notification
      const recipientId =
        reviewType === 'guest_review' ? booking.host : booking.guest;
      //   await sendNotification(recipientId, 'new_review', {
      //     bookingId: booking._id,
      //     reviewId: review._id,
      //   });

      res.status(201).json({
        status: 'success',
        data: { review },
      });
    } catch (error) {
      next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
  };

  respondToReview = async (req, res, next) => {
    try {
      const { reviewId } = req.params;
      const { content } = req.body;

      const review = await Review.findById(reviewId).populate('booking');

      if (!review) {
        return next(
          new HttpException(StatusCodes.NOT_FOUND, 'Review not found')
        );
      }

      // Verify response eligibility
      const isHost = review.booking.host.equals(req.user._id);
      const isGuest = review.booking.guest.equals(req.user._id);

      if (!isHost && !isGuest) {
        return next(
          new HttpException(
            StatusCodes.FORBIDDEN,
            'Not authorized to respond to this review'
          )
        );
      }

      review.response = {
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await review.save();

      // Send notification
      const recipientId = isHost ? review.booking.guest : review.booking.host;
      //   await sendNotification(recipientId, 'review_response', {
      //     bookingId: review.booking._id,
      //     reviewId: review._id,
      //   });

      res.status(200).json({
        status: 'success',
        data: { review },
      });
    } catch (error) {
      next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
  };
}
export default ReviewController;
