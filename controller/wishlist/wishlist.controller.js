import { validationResult } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import WishListService from '../../services/wishlist/wishlist.service.js';
import HttpException from '../../utils/exception.js';

const wishlistService = new WishListService();

class WishListController {
  getWishlist = async (req, res, next) => {
    try {
      const wishlist = await wishlistService.getWishlist(req.user.id);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: wishlist,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  };

  createWishlist = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }
    try {
      const { name } = req.body;
      const wishlist = await wishlistService.createWishlist(req.user._id, name);
      res.status(201).json({
        status: 'success',
        data: wishlist,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  };

  addToWishlist = async (req, res, next) => {
    try {
      const { wishlistId } = req.params;
      const { propertyId } = req.body;

      const wishlist = await wishlistService.addToWishlist(
        req.user._id,
        wishlistId,
        propertyId
        // note
      );

      res.json(wishlist);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };

  deleteWishlist = async (req, res, next) => {
    try {
      const { wishlistId } = req.params;
      const userId = req.user._id;

      // Find and delete the wishlist, ensuring it belongs to the user
      const deletedWishlist = await wishlistService.deleteWishlist(
        wishlistId,
        userId
      );

      res.status(StatusCodes.NO_CONTENT).json({
        status: 'success',
        data: deletedWishlist,
      });
      res.json(deletedWishlist);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };

  removeFromWishlist = async (req, res, next) => {
    const { wishlistId, propertyId } = req.params;
    try {
      const wishlist = await wishlistService.removeFromWishlist(
        req.user._id,
        wishlistId,
        propertyId
      );

      res.json(wishlist);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };

  generateShareableLink = async (req, res) => {
    try {
      const { wishlistId } = req.params;
      const { isEditable } = req.body;

      const shareableLink = await wishlistService.generateShareableLink(
        req.user._id,
        wishlistId,
        isEditable
      );

      res.json({ shareableLink });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
}

export default WishListController;
