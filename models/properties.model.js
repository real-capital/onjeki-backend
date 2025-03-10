import mongoose, { Schema, model } from 'mongoose';
import { EHouseSpace, EListStatus, EPurpose } from '../enum/house.enum.js';
import slugify from 'slugify';
import { BookingStatus } from '../enum/booking.enum.js';

const propertySchema = new Schema(
  {
    // Basic Information
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
    isOrganization: { type: Boolean, default: true, required: true },

    // Property Details
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    guests: { type: Number },
    bed: { type: Number },
    size: { type: String, required: false },
    hasMortgage: { type: Boolean },
    isNew: { type: Boolean },
    isFurnished: { type: Boolean },
    isBooked: { type: Boolean, required: false },

    // Rules and Policies
    rules: {
      houseRules: [
        {
          rule: String,
          icon: String,
        },
      ],
      checkInTime: {
        from: String,
        to: String,
      },
      checkOutTime: String,
      maxGuests: { type: Number, required: false },
      petsAllowed: { type: Boolean, default: false },
      cameraPresent: { type: Boolean, default: false },
      noiseCheck: { type: Boolean, default: false },
      weaponsPresent: { type: Boolean, default: false },
      smokingAllowed: { type: Boolean, default: false },
      cancellationPolicy: {
        type: String,
        enum: ['flexible', 'moderate', 'strict'],
        default: 'flexible',
      },
      additionalRules: [String],
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
    directions: {
      written: {
        type: String,
        trim: true,
      },
      landmarks: [
        {
          type: String,
          trim: true,
        },
      ],
      publicTransport: {
        type: String,
        trim: true,
      },
      parking: {
        type: String,
        trim: true,
      },
    },

    // Media
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

    // Basic Info
    title: {
      type: String,
      required: true,
    },
    description: { type: String },
    instantBooking: { type: String },

    // Pricing
    price: {
      base: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative'],
      },
      currency: { type: String, default: 'NGN' },
      cleaningFee: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 0 },
      customPricing: [
        {
          startDate: Date,
          endDate: Date,
          price: Number,
          note: String,
        },
      ],
      seasonalPricing: [
        {
          name: String,
          startDate: Date,
          endDate: Date,
          price: Number,
          minimumNights: Number,
        },
      ],
      discounts: [
        {
          type: {
            type: String,
            enum: ['weekly', 'monthly', 'early_bird'],
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
      lastMinute: [
        {
          daysBeforeArrival: Number,
          discountPercentage: {
            type: Number,
            min: 0,
            max: 100,
          },
        },
      ],
      longStay: [
        {
          numberOfNights: Number,
          discountPercentage: {
            type: Number,
            min: 0,
            max: 100,
          },
        },
      ],
    },

    // Availability
    availability: {
      bookedDates: [
        {
          startDate: {
            type: Date,
            required: true,
          },
          endDate: {
            type: Date,
            required: true,
          },
          bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
          },
          status: {
            type: String,
            enum: Object.values(BookingStatus),
            default: BookingStatus.CONFIRMED,
          },
        },
      ],

      minimumStay: {
        nights: {
          type: Number,
          default: 1,
          min: 1,
        },
        customRules: [
          {
            startDate: Date,
            endDate: Date,
            nights: Number,
          },
        ],
      },
      maximumStay: {
        nights: {
          type: Number,
          default: 365,
        },
        customRules: [
          {
            startDate: Date,
            endDate: Date,
            nights: Number,
          },
        ],
      },
      advanceNotice: {
        type: {
          type: String,
          enum: ['sameDay', '1day', '2days', '3days', '7days', 'custom'],
          default: 'sameDay',
        },
        customHours: Number,
      },
      preparationTime: {
        type: {
          type: String,
          enum: ['none', '1day', '2days', '3days', 'custom'],
          default: 'none',
        },
        customHours: Number,
      },
      availabilityWindow: {
        months: {
          type: Number,
          default: 12,
        },
        customEndDate: Date,
      },
      restrictedDays: {
        checkIn: [
          {
            type: String,
            enum: [
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
              'saturday',
              'sunday',
            ],
          },
        ],
        checkOut: [
          {
            type: String,
            enum: [
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
              'saturday',
              'sunday',
            ],
          },
        ],
      },
      blockedDates: [
        {
          startDate: Date,
          endDate: Date,
          reason: {
            type: String,
            enum: ['unavailable', 'maintenance', 'other'],
          },
          note: String,
        },
      ],
      calendar: [
        {
          date: Date,
          isBlocked: Boolean,
          customPrice: Number,
          notes: String,
          bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
          },
        },
      ],
      instantBooking: {
        type: Boolean,
        default: false,
      },
    },

    // Stats and Metrics
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

    // Calendar Sync
    calendarSync: {
      googleCalendarId: String,
      icalUrls: [String],
      lastSynced: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
propertySchema.index({ 'location.coordinates': '2dsphere' });
propertySchema.index({
  title: 'text',
  'location.city': 'text',
  'location.country': 'text',
});
propertySchema.index({ 'availability.blockedDates.startDate': 1 });
propertySchema.index({ 'availability.blockedDates.endDate': 1 });
propertySchema.index({ 'price.base': 1 });
propertySchema.index({ 'availability.minimumStay.nights': 1 });
propertySchema.index({ 'availability.maximumStay.nights': 1 });

// Virtual Fields
propertySchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'Property',
  localField: '_id',
});

propertySchema.virtual('hasCustomPricing').get(function () {
  return (
    (this.price.customPricing && this.price.customPricing.length > 0) ||
    (this.price.seasonalPricing && this.price.seasonalPricing.length > 0)
  );
});

propertySchema.virtual('hasDiscounts').get(function () {
  return (
    (this.price.discounts && this.price.discounts.length > 0) ||
    (this.price.lastMinute && this.price.lastMinute.length > 0) ||
    (this.price.longStay && this.price.longStay.length > 0)
  );
});

// Middleware
propertySchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true });
  }
  next();
});

propertySchema.pre('save', function (next) {
  if (this.location && this.location.pointer) {
    this.location.coordinates = {
      type: 'Point',
      coordinates: this.location.pointer.pointer,
    };
    delete this.location.pointer;
  }
  next();
});

// Helper Methods
propertySchema.methods = {
  async removeBookedDates(bookingId) {
    // Remove from bookedDates
    this.availability.bookedDates = this.availability.bookedDates.filter(
      (date) => !date.bookingId.equals(bookingId)
    );

    // Remove from calendar
    this.availability.calendar = this.availability.calendar.filter(
      (entry) => !entry.bookingId || !entry.bookingId.equals(bookingId)
    );

    await this.save();
  },
  getDatesInRange(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  },
  async updateBookedDates(booking) {
    // Add new booked dates
    this.availability.bookedDates.push({
      startDate: booking.checkIn,
      endDate: booking.checkOut,
      bookingId: booking._id,
      status: booking.status,
    });

    // Update calendar entries
    const dates = this.getDatesInRange(booking.checkIn, booking.checkOut);
    dates.forEach((date) => {
      this.availability.calendar.push({
        date: date,
        isBlocked: true,
        bookingId: booking._id,
        notes: `Booked: ${booking._id}`,
      });
    });

    await this.save();
  },
  // Helper method to validate dates
  _validateDates(startDate, endDate) {
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
      throw new Error('Invalid date format');
    }
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }
  },

  // Helper method to calculate nights
  calculateNights(startDate, endDate) {
    this._validateDates(startDate, endDate);
    return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  },

  // Helper method to check if a discount is applicable
  _isDiscountApplicable(discount, startDate, nights) {
    if (!discount.minNights || nights < discount.minNights) return false;

    switch (discount.type) {
      case 'weekly':
        return nights >= 7;
      case 'monthly':
        return nights >= 28;
      case 'early_bird':
        const daysUntilArrival = Math.ceil(
          (startDate - new Date()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilArrival >= (discount.conditions?.daysInAdvance || 30);
      default:
        return false;
    }
  },

  // Helper method to get the highest applicable discount
  _getMaxDiscount(startDate, nights) {
    let maxDiscount = 0;

    // Check standard discounts
    const standardDiscount = this.price.discounts?.find((discount) =>
      this._isDiscountApplicable(discount, startDate, nights)
    );
    if (standardDiscount) {
      maxDiscount = Math.max(maxDiscount, standardDiscount.percentage);
    }

    // Check last-minute discounts
    const daysUntilArrival = Math.ceil(
      (startDate - new Date()) / (1000 * 60 * 60 * 24)
    );
    const lastMinuteDiscount = this.price.lastMinute?.find(
      (discount) => daysUntilArrival <= discount.daysBeforeArrival
    );
    if (lastMinuteDiscount) {
      maxDiscount = Math.max(
        maxDiscount,
        lastMinuteDiscount.discountPercentage
      );
    }

    // Check long-stay discounts
    const longStayDiscount = this.price.longStay?.find(
      (discount) => nights >= discount.numberOfNights
    );
    if (longStayDiscount) {
      maxDiscount = Math.max(maxDiscount, longStayDiscount.discountPercentage);
    }

    return maxDiscount;
  },

  // Main Methods
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
    // Ensure startDate and endDate are Date objects
    startDate = new Date(startDate);
    endDate = new Date(endDate);

    // Check if the date conversion is valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format');
    }

    this._validateDates(startDate, endDate);
    const nights = this.calculateNights(startDate, endDate);

    // Check minimum stay
    const customMinStay = this.availability.minimumStay.customRules?.find(
      (rule) => startDate >= rule.startDate && startDate <= rule.endDate
    );
    const minNights =
      customMinStay?.nights || this.availability.minimumStay.nights;
    if (nights < minNights) return false;

    // Check maximum stay
    const customMaxStay = this.availability.maximumStay.customRules?.find(
      (rule) => startDate >= rule.startDate && startDate <= rule.endDate
    );
    const maxNights =
      customMaxStay?.nights || this.availability.maximumStay.nights;
    if (maxNights > 0 && nights > maxNights) return false;

    // Check blocked dates
    const isBlocked = this.availability.blockedDates?.some(
      (period) =>
        (startDate >= period.startDate && startDate <= period.endDate) ||
        (endDate >= period.startDate && endDate <= period.endDate)
    );
    if (isBlocked) return false;

    console.log(startDate);
    // Check restricted days
    // Correct the use of toLocaleDateString to get the weekday in long form
    const checkInDay = startDate.toLocaleDateString('en-US', {
      weekday: 'long', // This gives full weekday name like 'Monday', 'Tuesday', etc.
    });
    const checkOutDay = endDate.toLocaleDateString('en-US', {
      weekday: 'long', // This gives full weekday name like 'Monday', 'Tuesday', etc.
    });

    // Convert to lowercase
    const checkInDayLower = checkInDay.toLowerCase();
    const checkOutDayLower = checkOutDay.toLowerCase();

    // Now you can use the lowercase values
    if (this.availability.restrictedDays?.checkIn?.includes(checkInDayLower))
      return false;
    if (this.availability.restrictedDays?.checkOut?.includes(checkOutDayLower))
      return false;

    const hasOverlap = this.availability.bookedDates.some((booking) => {
      return (
        (startDate >= booking.startDate && startDate < booking.endDate) ||
        (endDate > booking.startDate && endDate <= booking.endDate) ||
        (startDate <= booking.startDate && endDate >= booking.endDate)
      );
    });

    return !hasOverlap;
  },

  calculatePrice(startDate, endDate) {
    this._validateDates(startDate, endDate);
    const nights = this.calculateNights(startDate, endDate);
    let totalPrice = 0;

    // Calculate nightly rates
    let currentDate = new Date(startDate);
    while (currentDate < endDate) {
      const currentDateStr = currentDate.toISOString().split('T')[0];

      // Get applicable price for this night
      let nightPrice = this.price.base;

      // Check calendar custom price
      const calendarEntry = this.availability.calendar.find(
        (entry) => entry.date.toISOString().split('T')[0] === currentDateStr
      );
      if (calendarEntry?.customPrice) {
        nightPrice = calendarEntry.customPrice;
      }

      // Check custom pricing periods
      const customPricing = this.price.customPricing?.find(
        (period) =>
          currentDate >= period.startDate && currentDate <= period.endDate
      );
      if (customPricing) {
        nightPrice = customPricing.price;
      }

      // Check seasonal pricing
      const seasonalPricing = this.price.seasonalPricing?.find(
        (period) =>
          currentDate >= period.startDate && currentDate <= period.endDate
      );
      if (seasonalPricing) {
        nightPrice = seasonalPricing.price;
      }

      totalPrice += nightPrice;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Apply discount
    const maxDiscount = this._getMaxDiscount(startDate, nights);
    if (maxDiscount > 0) {
      const discountAmount = (totalPrice * maxDiscount) / 100;
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
