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
    appleUserId: { type: String, unique: true, sparse: true }, // Store Apple User ID
    isEmailVerified: { type: Boolean, default: false }, // Email verification status
    phoneNo: { type: String },
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
    criteria: [{ type: String }],
    notification: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'notificationModel' },
    ],
    inbox: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OtherModel' }],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Properties' }],
  },
  {
    timestamps: true,
  }
);

const UserModel = model('User', userSchema);

export default UserModel;
