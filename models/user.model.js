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
    inbox: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Wishlist' }],
    paymentMethod: {
      type: {
        cardType: String,
        last4: String,
        expiryMonth: String,
        expiryYear: String,
        authorizationCode: String,
      },
      default: null,
    },
    paystackCustomerId: String,

    profile: {
      name: {
        type: String,
        // required: true,
      },
      phone: String,
      photo: {
        type: String,
        default:
          'https://res.cloudinary.com/dqwulfc1j/image/upload/v1707553702/tw3c16vw47vpizhn6oy7.png',
      },
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
    verification_status: {
      type: String,
      enum: [
        'verified',
        'unverified',
        'suspended',
        'partially',
        'pending',
        'rejected',
      ],
      default: 'unverified',
    },
    isLegalNameVerified: {
      type: Boolean,
      default: false,
    },
    isAddressVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: Date,
  },
  {
    timestamps: true,
  }
);

const UserModel = model('User', userSchema);

export default UserModel;
