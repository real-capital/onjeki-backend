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
          required: true
        },
        coordinates: {
          type: [Number],  // [longitude, latitude]
          required: true,
          validate: {
            validator: function(v) {
              return Array.isArray(v) && v.length === 2 &&
                     v[0] >= -180 && v[0] <= 180 && // longitude
                     v[1] >= -90 && v[1] <= 90;     // latitude
            },
            message: props => `${props.value} is not a valid coordinate pair!`
          }
        }
      }
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
      base: { type: Number, required: true },
      currency: { type: String, default: 'NGN' },
      cleaningFee: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 0 },
    },
    discount: {
      firstBooking: { type: Number },
      weekBooking: { type: Number },
      monthlyBooking: { type: Number },
      general: { type: Number },
    },
    size: { type: String, required: false },
    hasMortgage: { type: Boolean },
    isNew: { type: Boolean },
    isFurnished: { type: Boolean },
    availability: {
      isActive: { type: Boolean, default: true },
      blockedDates: [
        {
          startDate: Date,
          endDate: Date,
          reason: String,
        },
      ],
    },
    stats: {
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
      totalBookings: { type: Number, default: 0 },
    },
    isBooked: { type: Boolean, required: false },
  },
  {
    timestamps: true,
  }
);

// Index for location-based queries
propertySchema.index({ 'location.coordinates': '2dsphere' });

// Pre-save middleware to ensure coordinates are in the correct format
propertySchema.pre('save', function(next) {
  if (this.location && this.location.pointer) {
    // Convert old pointer format to new coordinates format
    this.location.coordinates = {
      type: 'Point',
      coordinates: this.location.pointer.pointer
    };
    // Remove old pointer format
    delete this.location.pointer;
  }
  next();
});

const PropertyModel = model('Property', propertySchema);

export default PropertyModel;