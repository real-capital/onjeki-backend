import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String },
    username: { type: String, unique: false },
    address: { type: String },
    dateOfBirth: { type: Date },
    otp: { type: Types.ObjectId, ref: 'Otp' },
    googleUserId: { type: String, unique: true, sparse: true }, // Store Google User ID
    isEmailVerified: { type: Boolean, default: false }, // Email verification status
    phoneNumber: { type: String, required: false },
    isPhoneVerified: { type: Boolean, default: false },
    nin: { type: String, required: false },
    isNinVerified: { type: Boolean, default: false },
    ninLast4Digits: { type: String, required: false },
    ninVerificationDate: { type: Date, required: false },
    newToListing: { type: Boolean, default: true },
    plan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic', // New users start with "basic"
    },
    // phoneNo: { type: String },
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
    criteria: [{ type: String }],
    notification: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'notificationModel' },
    ],
    inbox: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OtherModel' }],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],

    profile: {
      name: {
        type: String,
        // required: true,
      },
      phone: String,
      photo: String,
      verifications: [
        {
          type: {
            type: String,
            enum: ['email', 'phone', 'government_id'],
          },
          verified: Boolean,
          verifiedAt: Date,
        },
      ],
    },
    hostProfile: {
      about: String,
      languages: [String],
      responseRate: Number,
      responseTime: Number,
      acceptanceRate: Number,
      superhost: {
        type: Boolean,
        default: false,
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
    },
    settings: {
      notifications: {
        email: {
          bookings: { type: Boolean, default: true },
          messages: { type: Boolean, default: true },
          marketing: { type: Boolean, default: false },
        },
        push: {
          bookings: { type: Boolean, default: true },
          messages: { type: Boolean, default: true },
          marketing: { type: Boolean, default: false },
        },
      },
      currency: {
        type: String,
        default: 'NGN',
      },
      language: {
        type: String,
        default: 'en',
      },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    lastLogin: Date,
  },
  {
    timestamps: true,
  }
);

const UserModel = model('User', userSchema);

export default UserModel;
