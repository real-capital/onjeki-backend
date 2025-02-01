import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewType: {
    type: String,
    enum: ['guest_review', 'host_review'],
    required: true
  },
  ratings: {
    overall: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    cleanliness: {
      type: Number,
      min: 1,
      max: 5
    },
    accuracy: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    location: {
      type: Number,
      min: 1,
      max: 5
    },
    checkIn: {
      type: Number,
      min: 1,
      max: 5
    },
    value: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  photos: [{
    url: String,
    caption: String
  }],
  response: {
    content: String,
    createdAt: Date,
    updatedAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'published', 'reported', 'removed'],
    default: 'pending'
  },
  flags: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    createdAt: Date
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
reviewSchema.index({ property: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1, createdAt: -1 });
reviewSchema.index({ booking: 1 });

// Middleware
reviewSchema.pre('save', async function(next) {
  if (this.isModified('ratings') || this.isNew) {
    // Update property ratings
    const property = await mongoose.model('Property').findById(this.property);
    if (property) {
      const reviews = await this.constructor.find({ 
        property: this.property,
        status: 'published'
      });

      const ratings = reviews.reduce((acc, review) => {
        Object.keys(review.ratings).forEach(key => {
          if (!acc[key]) acc[key] = [];
          acc[key].push(review.ratings[key]);
        });
        return acc;
      }, {});

      // Calculate averages
      const averageRatings = {};
      Object.keys(ratings).forEach(key => {
        averageRatings[key] = ratings[key].reduce((a, b) => a + b, 0) / ratings[key].length;
      });

      property.stats.averageRating = averageRatings.overall;
      property.stats.reviewCount = reviews.length;
      await property.save();
    }
  }
  next();
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;
