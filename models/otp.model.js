import mongoose, { Schema } from 'mongoose';

const OtpSchema = new Schema({
  userId: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
  otp: { type: String, required: true },
  expiration: { type: Date, required: true }
}, {
  timestamps: true
});

const OtpModel = mongoose.model('Otp', OtpSchema);

export default OtpModel;
