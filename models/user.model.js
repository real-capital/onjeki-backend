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
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
    criteria: [{ type: String }],
    phoneNo: { type: String },
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
