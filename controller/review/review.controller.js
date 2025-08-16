import { uploadMultipleImages } from '../../services/upload/upload.service.js';
import Review from '../../models/review.model.js';
import BookingModel from '../../models/booking.model.js';
import User from '../../models/user.model.js';
import Property from '../../models/properties.model.js';
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

      if (booking.status !== BookingStatus.COMPLETED) {
        return next(
          new HttpException(
            StatusCodes.BAD_REQUEST,
            'Cannot review incomplete booking'
          )
        );
      }

      const existingReview = await Review.findOne({
        booking: bookingId,
        reviewer: req.user._id,
      });
      if (existingReview) {
        return next(
          new HttpException(
            StatusCodes.BAD_REQUEST,
            'Review already exists for this booking'
          )
        );
      }

      let photos = [];
      if (req.files?.length) {
        const uploadedPhotos = await uploadMultipleImages(req.files, 'reviews');
        photos = uploadedPhotos.map((url) => ({ url }));
      }

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
        status: 'published',
      });

      booking.review = review._id;
      await booking.save();

      const populatedReview = await Review.findById(review._id)
        .populate({
          path: 'reviewer',
          select: 'name profile',
          populate: {
            path: 'profile',
            select: 'photo',
          },
        })
        .populate('property', 'title')
        .populate('booking', 'checkIn checkOut');

      res.status(201).json({
        status: 'success',
        data: { review: populatedReview },
      });
    } catch (error) {
      next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
  };

  getReview = async (req, res, next) => {
    try {
      const { reviewId } = req.params;

      const review = await Review.findById(reviewId)
        .populate({
          path: 'reviewer',
          select: 'name profile',
          populate: {
            path: 'profile',
            select: 'photo',
          },
        })
        .populate('property', 'title slug photo')
        .populate('booking', 'checkIne checkOut');

      if (!review) {
        return next(
          new HttpException(StatusCodes.NOT_FOUND, 'Review not found')
        );
      }

      res.status(200).json({
        status: 'success',
        data: { review },
      });
    } catch (error) {
      next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
  };

  getPropertyReviews = async (req, res, next) => {
    try {
      const { propertyId } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [reviews, total] = await Promise.all([
        Review.find({
          property: propertyId,
          status: 'published',
        })
          .populate({
            path: 'reviewer',
            select: 'name profile',
            populate: {
              path: 'profile',
              select: 'photo',
            },
          })
          .populate('booking', 'checkIn checkOut')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Review.countDocuments({
          property: propertyId,
          status: 'published',
        }),
      ]);

      const averageRatings = await Review.aggregate([
        {
          $match: {
            property: mongoose.Types.ObjectId(propertyId),
            status: 'published',
          },
        },
        {
          $group: {
            _id: null,
            avgOverall: { $avg: '$ratings.overall' },
            avgCleanliness: { $avg: '$ratings.cleanliness' },
            avgAccuracy: { $avg: '$ratings.accuracy' },
            avgCommunication: { $avg: '$ratings.communication' },
            avgLocation: { $avg: '$ratings.location' },
            avgCheckIn: { $avg: '$ratings.checkIn' },
            avgValue: { $avg: '$ratings.value' },
            totalReviews: { $sum: 1 },
          },
        },
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          reviews,
          averageRatings: averageRatings[0] || null,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
            hasMore: skip + reviews.length < total,
          },
        },
      });
    } catch (error) {
      next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
  };

  getUserReviews = async (req, res, next) => {
    try {
      const { userId } = req.params;
      const {
        page = 1,
        limit = 10,
        reviewType = 'all',
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const query = {
        status: 'published',
      };

      if (reviewType === 'received') {
        const userProperties = await Property.find({ owner: userId }).select(
          '_id'
        );
        const propertyIds = userProperties.map((p) => p._id);
        query.$or = [{ property: { $in: propertyIds } }];

        const userBookings = await BookingModel.find({ host: userId }).select(
          '_id'
        );
        const bookingIds = userBookings.map((b) => b._id);
        if (bookingIds.length > 0) {
          query.$or.push({ booking: { $in: bookingIds } });
        }
      } else if (reviewType === 'written') {
        query.reviewer = userId;
      } else if (reviewType !== 'all') {
        query.reviewType = reviewType;
      }

      if (reviewType === 'all') {
        const userProperties = await Property.find({ owner: userId }).select(
          '_id'
        );
        const propertyIds = userProperties.map((p) => p._id);
        const userBookingsAsHost = await BookingModel.find({
          host: userId,
        }).select('_id');
        const hostBookingIds = userBookingsAsHost.map((b) => b._id);

        query.$or = [{ reviewer: userId }, { property: { $in: propertyIds } }];

        if (hostBookingIds.length > 0) {
          query.$or.push({ booking: { $in: hostBookingIds } });
        }
      }

      const [reviews, total] = await Promise.all([
        Review.find(query)
          .populate({
            path: 'reviewer',
            select: 'name profile',
            populate: {
              path: 'profile',
              select: 'photo',
            },
          })
          .populate('property', 'title slug photo')
          .populate('booking', 'checkIn checkOut host guest')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Review.countDocuments(query),
      ]);

      const reviewStats = await Review.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$reviewType',
            count: { $sum: 1 },
            avgRating: { $avg: '$ratings.overall' },
          },
        },
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          reviews,
          stats: reviewStats,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
            hasMore: skip + reviews.length < total,
          },
        },
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

      const populatedReview = await Review.findById(reviewId)
        .populate({
          path: 'reviewer',
          select: 'name profile',
          populate: {
            path: 'profile',
            select: 'photo',
          },
        })
        .populate('property', 'title')
        .populate('booking', 'checkIn checkOut');

      res.status(200).json({
        status: 'success',
        data: { review: populatedReview },
      });
    } catch (error) {
      next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
  };

  updateReview = async (req, res, next) => {
    try {
      const { reviewId } = req.params;

      const review = await Review.findById(reviewId);

      if (!review) {
        return next(
          new HttpException(StatusCodes.NOT_FOUND, 'Review not found')
        );
      }

      if (!review.reviewer.equals(req.user._id)) {
        return next(
          new HttpException(
            StatusCodes.FORBIDDEN,
            'Not authorized to update this review'
          )
        );
      }

      const updatedReview = await Review.findByIdAndUpdate(reviewId, req.body, {
        new: true,
        runValidators: true,
      })
        .populate({
          path: 'reviewer',
          select: 'name profile',
          populate: {
            path: 'profile',
            select: 'photo',
          },
        })
        .populate('property', 'title')
        .populate('booking', 'checkIn checkOut');

      res.status(200).json({
        status: 'success',
        data: { review: updatedReview },
      });
    } catch (error) {
      next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
  };

  deleteReview = async (req, res, next) => {
    try {
      const { reviewId } = req.params;

      const review = await Review.findById(reviewId);

      if (!review) {
        return next(
          new HttpException(StatusCodes.NOT_FOUND, 'Review not found')
        );
      }

      if (!review.reviewer.equals(req.user._id)) {
        return next(
          new HttpException(
            StatusCodes.FORBIDDEN,
            'Not authorized to delete this review'
          )
        );
      }

      await Review.findByIdAndDelete(reviewId);

      res.status(200).json({
        status: 'success',
        message: 'Review deleted successfully',
      });
    } catch (error) {
      next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
  };

  reportReview = async (req, res, next) => {
    try {
      const { reviewId } = req.params;
      const { reason } = req.body;

      const review = await Review.findById(reviewId);

      if (!review) {
        return next(
          new HttpException(StatusCodes.NOT_FOUND, 'Review not found')
        );
      }

      const existingFlag = review.flags.find((flag) =>
        flag.user.equals(req.user._id)
      );

      if (existingFlag) {
        return next(
          new HttpException(
            StatusCodes.BAD_REQUEST,
            'You have already reported this review'
          )
        );
      }

      review.flags.push({
        user: req.user._id,
        reason,
        createdAt: new Date(),
      });

      if (review.flags.length >= 3) {
        review.status = 'reported';
      }

      await review.save();

      res.status(200).json({
        status: 'success',
        message: 'Review reported successfully',
      });
    } catch (error) {
      next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
  };

  getUserReviewsById = async (req, res, next) => {
    try {
      const { userId } = req.params;
      const {
        page = 1,
        limit = 10,
        reviewType = 'all',
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      let query = {
        status: 'published',
      };

      if (reviewType === 'written') {
        query.reviewer = userId;
      } else if (reviewType === 'received') {
        const userProperties = await PropertyModel.find({
          owner: userId,
        }).select('_id');
        const propertyIds = userProperties.map((p) => p._id);
        const userBookingsAsHost = await BookingModel.find({
          host: userId,
        }).select('_id');
        const hostBookingIds = userBookingsAsHost.map((b) => b._id);

        query.$or = [{ property: { $in: propertyIds } }];

        if (hostBookingIds.length > 0) {
          query.$or.push({ booking: { $in: hostBookingIds } });
        }
      } else if (reviewType === 'all') {
        const userProperties = await PropertyModel.find({
          owner: userId,
        }).select('_id');
        const propertyIds = userProperties.map((p) => p._id);
        const userBookingsAsHost = await BookingModel.find({
          host: userId,
        }).select('_id');
        const hostBookingIds = userBookingsAsHost.map((b) => b._id);

        query.$or = [{ reviewer: userId }, { property: { $in: propertyIds } }];

        if (hostBookingIds.length > 0) {
          query.$or.push({ booking: { $in: hostBookingIds } });
        }
      }

      const [reviews, total] = await Promise.all([
        Review.find(query)
          .populate({
            path: 'reviewer',
            select: 'name profile',
            populate: {
              path: 'profile',
              select: 'photo',
            },
          })
          .populate('property', 'title slug photo')
          .populate('booking', 'checkIn checkOut host guest')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Review.countDocuments(query),
      ]);

      const reviewStats = await Review.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$reviewType',
            count: { $sum: 1 },
            avgRating: { $avg: '$ratings.overall' },
          },
        },
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          reviews,
          stats: reviewStats,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
            hasMore: skip + reviews.length < total,
          },
        },
      });
    } catch (error) {
      next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
  };

  canReviewBooking = async (req, res, next) => {
    try {
      const { bookingId } = req.params;

      const booking = await BookingModel.findById(bookingId);
      if (!booking) {
        return next(
          new HttpException(StatusCodes.NOT_FOUND, 'Booking not found')
        );
      }

      const canReview =
        booking.status === BookingStatus.COMPLETED &&
        (booking.guest.equals(req.user._id) ||
          booking.host.equals(req.user._id));

      res.status(200).json({
        status: 'success',
        data: { canReview },
      });
    } catch (error) {
      next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
  };

  getBookingReview = async (req, res, next) => {
    try {
      const { bookingId } = req.params;

      const review = await Review.findOne({
        booking: bookingId,
        reviewer: req.user._id,
      })
        .populate({
          path: 'reviewer',
          select: 'name profile',
          populate: {
            path: 'profile',
            select: 'photo',
          },
        })
        .populate('property', 'title slug photo')
        .populate('booking', 'checkIn checkOut');

      res.status(200).json({
        status: 'success',
        data: { review },
      });
    } catch (error) {
      next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
  };

  getUserReviewsSummary = async (req, res, next) => {
    try {
      const { userId } = req.params;

      const userProperties = await PropertyModel.find({ owner: userId }).select(
        '_id'
      );
      const propertyIds = userProperties.map((p) => p._id);
      const userBookingsAsHost = await BookingModel.find({
        host: userId,
      }).select('_id');
      const hostBookingIds = userBookingsAsHost.map((b) => b._id);

      const reviewsSummary = await Review.aggregate([
        {
          $match: {
            status: 'published',
            $or: [
              { reviewer: mongoose.Types.ObjectId(userId) },
              { property: { $in: propertyIds } },
              ...(hostBookingIds.length > 0
                ? [{ booking: { $in: hostBookingIds } }]
                : []),
            ],
          },
        },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            avgRating: { $avg: '$ratings.overall' },
            reviewsAsHost: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $in: ['$property', propertyIds] },
                      { $in: ['$booking', hostBookingIds] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            reviewsAsGuest: {
              $sum: {
                $cond: [
                  { $eq: ['$reviewer', mongoose.Types.ObjectId(userId)] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      const summary = reviewsSummary[0] || {
        totalReviews: 0,
        avgRating: 0,
        reviewsAsHost: 0,
        reviewsAsGuest: 0,
      };

      res.status(200).json({
        status: 'success',
        data: { summary },
      });
    } catch (error) {
      next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
  };
}

export default ReviewController;
