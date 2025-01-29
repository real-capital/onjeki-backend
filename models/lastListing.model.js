import mongoose, { model, Schema } from 'mongoose';

const LastListingSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  lastListingPath: {
    type: String,
    required: true,
    unique: true,
  },
  lastVisitedAt: { type: Date, default: Date.now }, // Timestamp of last visit
});

const LastListingModel = model('LastListing', LastListingSchema);
export default LastListingModel;
