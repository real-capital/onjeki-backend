import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const wishlistSchema = new Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  properties: [
    {
      property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
      note: String,
      addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      addedAt: { type: Date, default: Date.now },
    },
  ],
  shareableLink: {
    type: String,
    sparse: true, // Only index non-null values
    unique: true,
  },
  isPublic: { type: Boolean, default: false },
  isEditable: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const WishlistModel = model('Wishlist', wishlistSchema);

export default WishlistModel;
