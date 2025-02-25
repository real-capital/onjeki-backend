import { StatusCodes } from 'http-status-codes';
import WishlistModel from '../../models/wishlist.model.js';
import HttpException from '../../utils/exception.js';

class WishListService {
  async getWishlist(userId) {
    try {
      const wishlist = await WishlistModel.find({
        owner: userId,
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
