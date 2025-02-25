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

      //   if (!wishlist) {
      //     return res
      //       .status(404)
      //       .json({ message: 'Wishlist not found or unauthorized' });
      //   }

      res.json(wishlist);
    } catch (error) {
      console.log(error);
      next(error);

      //   res.status(500).json({ error: error.message });
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
