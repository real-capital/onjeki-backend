// property.model.js
import mongoose, { Schema, model } from 'mongoose';
import slugify from 'slugify';

const rentAndSalesSchema = new Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['RENT', 'SALE'],
      required: true,
    },
    slug: String,
    propertyType: {
      type: String,
      enum: ['APARTMENT', 'HOUSE', 'LAND', 'COMMERCIAL'],
      required: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'PENDING', 'SOLD', 'RENTED'],
      default: 'AVAILABLE',
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    price: {
      amount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: 'NGN',
      },
      // For rentals
      period: {
        type: String,
        enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'],
        required: function () {
          return this.type === 'RENT';
        },
      },
    },
    // Location and Directions
    location: {
      city: { type: String },
      state: { type: String, required: true },
      country: { type: String, required: true },
      address: { type: String, required: true },
      town: { type: String },
      flatOrFloor: { type: String },
      postCode: { type: String },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
          required: true,
        },
        coordinates: {
          type: [Number],
          required: true,
          validate: {
            validator: function (v) {
              return (
                Array.isArray(v) &&
                v.length === 2 &&
                v[0] >= -180 &&
                v[0] <= 180 &&
                v[1] >= -90 &&
                v[1] <= 90
              );
            },
            message: (props) =>
              `${props.value} is not a valid coordinate pair!`,
          },
        },
      },
    },
    features: {
      bedrooms: Number,
      bathrooms: Number,
      parkingSpaces: Number,
      totalArea: Number, // in square meters
      buildingAge: Number,
      furnished: Boolean,
    },
    amenities: [
      {
        type: String,
        enum: [
          'SWIMMING_POOL',
          'GYM',
          'SECURITY',
          'AIR_CONDITIONING',
          'ELEVATOR',
          // Add more amenities
        ],
      },
    ],
    media: {
      images: [
        {
          url: String,
          caption: String,
          isPrimary: Boolean,
          publicId: String,
        },
      ],
      videos: [
        {
          url: String,
          caption: String,
        },
      ],
      virtualTour: String,
    },
    verification: {
      isVerified: {
        type: Boolean,
        default: false,
      },
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    inquiries: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inquiry',
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
    availability: {
      // For rentals
      availableFrom: Date,
      availableTo: Date,
      // For both
      showingTimes: [
        {
          day: {
            type: String,
            enum: [
              'MONDAY',
              'TUESDAY',
              'WEDNESDAY',
              'THURSDAY',
              'FRIDAY',
              'SATURDAY',
              'SUNDAY',
            ],
          },
          startTime: String,
          endTime: String,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
rentAndSalesSchema.index({ 'location.coordinates': '2dsphere' });
rentAndSalesSchema.index({
  title: 'text',
  'location.city': 'text',
  'location.country': 'text',
});

// Middleware
rentAndSalesSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true });
  }
  next();
});

rentAndSalesSchema.pre('save', function (next) {
  if (this.location && this.location.pointer) {
    this.location.coordinates = {
      type: 'Point',
      coordinates: this.location.pointer.pointer,
    };
    delete this.location.pointer;
  }
  next();
});

const RentAndSales = mongoose.model('RentAndSales', rentAndSalesSchema);

export default RentAndSales;
