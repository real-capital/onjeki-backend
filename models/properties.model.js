import mongoose, { Schema, model } from 'mongoose';
import { EHouseSpace, EListStatus, EPurpose } from '../enum/house.enum.js';

const propertySchema = new Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    type: {
      type: String,
      enum: Object.values(EPurpose),
      required: true,
    },
    slug: String,
    listStatus: {
      type: String,
      enum: Object.values(EListStatus),
      default: EListStatus.UNDER_REVIEW,
    },
    buildingType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Building',
    },
    amenities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Amenity' }],
    space: {
      type: String,
      enum: Object.values(EHouseSpace),
    },
    usedCurrentLocation: { type: Boolean },
    rules: {
      houseRules: [
        {
          type: String,
          rule: String,
          icon: String,
        },
      ],
      checkInTime: {
        from: String,
        to: String,
      },
      checkOutTime: String,
      maxGuests: { type: Number, required: true },
      petsAllowed: { type: Boolean, default: false },
      smokingAllowed: { type: Boolean, default: false },
      cancellationPolicy: {
        type: String,
        enum: ['flexible', 'moderate', 'strict'],
        default: 'flexible',
      },
      additionalRules: [String],
    },
    rules: {
      checkInTime: { type: String, default: '15:00' },
      checkOutTime: { type: String, default: '11:00' },
      maxGuests: { type: Number, required: true },
      petsAllowed: { type: Boolean, default: false },
      smokingAllowed: { type: Boolean, default: false },
    },
    location: {
      city: { type: String, required: true },
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
          type: [Number], // [longitude, latitude]
          required: true,
          validate: {
            validator: function (v) {
              return (
                Array.isArray(v) &&
                v.length === 2 &&
                v[0] >= -180 &&
                v[0] <= 180 && // longitude
                v[1] >= -90 &&
                v[1] <= 90
              ); // latitude
            },
            message: (props) =>
              `${props.value} is not a valid coordinate pair!`,
          },
        },
      },
    },
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    guests: { type: Number },
    bed: { type: Number },
    photo: {
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
          publicId: String,
        },
      ],
    },
    title: {
      type: String,
      required: true,
    },
    description: { type: String },
    instantBooking: { type: String },
    price: {
      base: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative'],
      },
      currency: { type: String, default: 'NGN' },
      cleaningFee: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 0 },
      discounts: [
        {
          type: {
            type: String,
            enum: ['weekly', 'monthly', 'early_bird', 'general'],
          },
          percentage: {
            type: Number,
            min: 0,
            max: 100,
          },
          minNights: Number,
          conditions: Object,
        },
      ],
    },

    // discount: {
    //   firstBooking: { type: Number },
    //   weekBooking: { type: Number },
    //   monthlyBooking: { type: Number },
    //   general: { type: Number },
    // },
    size: { type: String, required: false },
    hasMortgage: { type: Boolean },
    isNew: { type: Boolean },
    isFurnished: { type: Boolean },
    availability: {
      calendar: [
        {
          date: Date,
          isBlocked: Boolean,
          customPrice: Number,
          notes: String,
        },
      ],
      minNights: {
        type: Number,
        default: 1,
        min: 1,
      },
      maxNights: {
        type: Number,
        min: 1,
      },
      preparationTime: {
        type: Number,
        default: 0,
        min: 0,
      },
      advanceNotice: {
        type: Number,
        default: 0,
        min: 0,
      },
      instantBooking: {
        type: Boolean,
        default: false,
      },
    },
    // availability: {
    //   isActive: { type: Boolean, default: true },
    //   blockedDates: [
    //     {
    //       startDate: Date,
    //       endDate: Date,
    //       reason: String,
    //     },
    //   ],
    // },
    stats: {
      views: {
        type: Number,
        default: 0,
      },
      bookings: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      reviewCount: {
        type: Number,
        default: 0,
      },
    },
    calendarSync: {
      googleCalendarId: String,
      icalUrls: [String],
      lastSynced: Date,
    },

    isBooked: { type: Boolean, required: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for location-based queries
// propertySchema.index({ owner: 1 });
// propertySchema.index({ status: 1 });
propertySchema.index({ 'location.coordinates': '2dsphere' });
propertySchema.index({
  title: 'text',
  'location.city': 'text',
  'location.country': 'text',
});

// Virtual populate reviews
propertySchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'Property',
  localField: '_id',
});

// Middleware
propertySchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true });
  }
  next();
});

// Pre-save middleware to ensure coordinates are in the correct format
propertySchema.pre('save', function (next) {
  if (this.location && this.location.pointer) {
    // Convert old pointer format to new coordinates format
    this.location.coordinates = {
      type: 'Point',
      coordinates: this.location.pointer.pointer,
    };
    // Remove old pointer format
    delete this.location.pointer;
  }
  next();
});

// Methods
propertySchema.methods = {
  async updateAvailability(dates, status) {
    const calendar = this.availability.calendar;
    dates.forEach((date) => {
      const existingEntry = calendar.find(
        (entry) =>
          entry.date.toISOString().split('T')[0] ===
          date.toISOString().split('T')[0]
      );

      if (existingEntry) {
        existingEntry.isBlocked = status.isBlocked;
        if (status.customPrice) existingEntry.customPrice = status.customPrice;
        if (status.notes) existingEntry.notes = status.notes;
      } else {
        calendar.push({
          date,
          ...status,
        });
      }
    });

    await this.save();
  },

  isAvailable(startDate, endDate) {
    const calendar = this.availability.calendar;
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateEntry = calendar.find(
        (entry) =>
          entry.date.toISOString().split('T')[0] ===
          currentDate.toISOString().split('T')[0]
      );

      if (dateEntry && dateEntry.isBlocked) {
        return false;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return true;
  },

  calculatePrice(startDate, endDate) {
    const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    let totalPrice = 0;

    // Calculate nightly rates including custom prices
    let currentDate = new Date(startDate);
    while (currentDate < endDate) {
      const dateEntry = this.availability.calendar.find(
        (entry) =>
          entry.date.toISOString().split('T')[0] ===
          currentDate.toISOString().split('T')[0]
      );

      totalPrice += dateEntry?.customPrice || this.price.base;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Apply discounts
    const applicableDiscount = this.price.discounts.find(
      (discount) => nights >= discount.minNights
    );

    if (applicableDiscount) {
      const discountAmount = (totalPrice * applicableDiscount.percentage) / 100;
      totalPrice -= discountAmount;
    }

    // Add fees
    totalPrice += this.price.cleaningFee;
    totalPrice += this.price.serviceFee;

    return totalPrice;
  },
};

const PropertyModel = model('Property', propertySchema);

export default PropertyModel;
