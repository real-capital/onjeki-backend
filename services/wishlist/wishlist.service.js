import { StatusCodes } from 'http-status-codes';
import WishlistModel from '../../models/wishlist.model.js';
import HttpException from '../../utils/exception.js';

class WishListService {
  async getWishlist(userId) {
    try {
      const wishlists = await WishlistModel.find({
        $or: [{ owner: userId }, { collaborators: userId }],
      })
        .populate({
          path: 'properties.property',
        })
        .sort({ createdAt: -1 })
        .lean();

      return wishlists;
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching wishlist'
      );
    }
  }

  async createWishlist(userId, name) {
    try {
      // Check if the user already has a wishlist with this name
      const wishlistExists = await WishlistModel.findOne({
        owner: userId,
        name: name,
      });

      if (wishlistExists) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'You already have a wishlist with this name'
        );
      }

      // Create new wishlist
      const wishlist = await WishlistModel.create({
        name,
        owner: userId,
        properties: [],
      });

      // Return the created wishlist
      return wishlist;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        StatusCodes.BAD_REQUEST,
        error.message || 'Error creating wishlist'
      );
    }
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

  async deleteWishlist(wishlistId, userId) {
    try {
      // Check if wishlist exists and belongs to user
      const wishlist = await WishlistModel.findOne({
        _id: wishlistId,
        owner: userId,
      });

      if (!wishlist) {
        throw new HttpException(
          StatusCodes.NOT_FOUND,
          'Wishlist not found or unauthorized'
        );
      }

      // Delete the wishlist
      await WishlistModel.deleteOne({ _id: wishlistId });

      return {
        status: 'success',
        message: 'Wishlist deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        StatusCodes.BAD_REQUEST,
        error.message || 'Error deleting wishlist'
      );
    }
  }

  async removeFromWishlist(userId, wishlistId, propertyId) {
    try {
      const wishlist = await WishlistModel.findOneAndUpdate(
        {
          _id: wishlistId,
          $or: [{ owner: userId }, { collaborators: userId }],
        },
        {
          $pull: {
            properties: {
              property: propertyId,
            },
          },
        },
        { new: true }
      );

      if (!wishlist) {
        return res
          .status(404)
          .json({ message: 'Wishlist not found or unauthorized' });
      }

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

  // wishlist.controller.js
  // const inviteToWishlist = async (req, res) => {
  //     try {
  //       const { wishlistId } = req.params;
  //       const { email, role } = req.body;

  //       const user = await UserModel.findOne({ email });
  //       if (!user) {
  //         return res.status(404).json({ message: 'User not found' });
  //       }

  //       const wishlist = await WishlistModel.findOneAndUpdate(
  //         {
  //           _id: wishlistId,
  //           owner:userId,
  //           'collaborators.user': { $ne: user._id },
  //         },
  //         {
  //           $push: {
  //             collaborators: {
  //               user: user._id,
  //               role,
  //               invitedBy:userId,
  //             },
  //           },
  //         },
  //         { new: true },
  //       );

  //       if (!wishlist) {
  //         return res.status(404).json({ message: 'Wishlist not found or user already invited' });
  //       }

  //       // Send email notification
  //       await sendInvitationEmail(user.email, req.user.name, wishlist.name);

  //       res.json(wishlist);
  //     } catch (error) {
  //       res.status(500).json({ error: error.message });
  //     }
  //   };

  //   const respondToInvitation = async (req, res) => {
  //     try {
  //       const { wishlistId } = req.params;
  //       const { accept } = req.body;

  //       const wishlist = await WishlistModel.findOneAndUpdate(
  //         {
  //           _id: wishlistId,
  //           'collaborators.user':userId,
  //           'collaborators.status': 'pending',
  //         },
  //         {
  //           $set: {
  //             'collaborators.$.status': accept ? 'accepted' : 'declined',
  //             'collaborators.$.respondedAt': new Date(),
  //           },
  //         },
  //         { new: true },
  //       );

  //       if (!wishlist) {
  //         return res.status(404).json({ message: 'Invitation not found or already responded' });
  //       }

  //       res.json(wishlist);
  //     } catch (error) {
  //       res.status(500).json({ error: error.message });
  //     }
  //   };
}

export default WishListService;
