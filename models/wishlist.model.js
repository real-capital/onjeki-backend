// wishlist.model.js
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const wishlistSchema = new Schema({
  name: { type: String, required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  collaborators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  properties: [
    {
      property: { type: Schema.Types.ObjectId, ref: 'Property' },
      note: String,
      addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      addedAt: { type: Date, default: Date.now },
    },
  ],
  shareableLink: {
    type: String,
    sparse: true,
    unique: true,
  }, // Remove default: undefined as it's not needed with sparse: true
  isPublic: { type: Boolean, default: false },
  isEditable: { type: Boolean, default: false },
}, {
  timestamps: true, // This automatically handles createdAt and updatedAt
});

// Create sparse unique index
// wishlistSchema.index({ shareableLink: 1 }, { unique: true, sparse: true });

const WishlistModel = model('Wishlist', wishlistSchema);

export default WishlistModel;