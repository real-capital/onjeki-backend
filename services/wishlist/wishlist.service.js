import { StatusCodes } from 'http-status-codes';
import WishlistModel from '../../models/wishlist.model.js';
import HttpException from '../../utils/exception.js';

class WishListService {
  async getWishlist(userId) {
    try {
      const wishlist = await WishlistModel.findOne({
        userId,
      }).sort({ createdAt: -1 });

      return wishlist;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching wishlist'
      );
    }
  }
  async createWishlist(userId, name) {
    console.log(name);
    try {
      // Check if the category exists
      const wishlistExists = await WishlistModel.exists({ name: name });
      if (wishlistExists) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Wishlist already exist'
        );
      }

      return await WishlistModel.create({ name, owner: userId });
    } catch (error) {
      throw new HttpException(
        StatusCodes.BAD_REQUEST,
        error.message || 'Error creating wishlist'
      );
    }
    // return await WishlistModel.create({ name, owner: userId });
  }

  async addToWishlist(userId, wishlistId, propertyId) {
    try {
      const wishlist = await WishlistModel.findOneAndUpdate(
        {
          _id: wishlistId,
          $or: [{ owner: userId }, { collaborators: userId }],
        },
        {
          $push: {
            properties: { property: propertyId, addedBy: userId },
          },
        },
        { new: true }
      );
      if (!wishlist) {
        throw new HttpException(
          StatusCodes.NOT_FOUND,
          'Wishlist not found or unauthorized'
        );
      }
      //   await wishlist.save();
      return wishlist;
    } catch (error) {
      console.log(error);
      throw new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error);
    }
  }
  async generateShareableLink(userId, wishlistId, isEditable) {
    try {
      const wishlist = await WishlistModel.findOne({
        _id: wishlistId,
        owner: userId,
      });

      if (!wishlist) {
        throw new Error('Wishlist not found or unauthorized');
      }

      const shareableLink = crypto.randomBytes(32).toString('hex');
      wishlist.shareableLink = shareableLink;
      wishlist.isEditable = isEditable;
      wishlist.isPublic = true;
      await wishlist.save();

      return `${process.env.APP_URL}/wishlist/shared/${shareableLink}`;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching amenity'
      );
    }
  }
}

export default WishListService;
