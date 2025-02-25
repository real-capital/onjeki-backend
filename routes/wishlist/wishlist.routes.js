// import { Router } from 'express';
import express from 'express';
import { Route } from '../../interfaces/route.interface.js';

import { validate } from '../../middlewares/validation.js';
import WishListController from '../../controller/wishlist/wishlist.controller.js';
import { isAuthenticated } from '../../middlewares/auth.js';

class WIshlistRoute extends Route {
  constructor() {
    super(express.Router());
    this.path = '/wishlists';
    this.controller = new WishListController();
    this.initializeRoute();
  }
  initializeRoute() {
    this.router.post(
      `${this.path}`,
      validate,
      isAuthenticated,
      this.controller.createWishlist
    );
    this.router.get(
      `${this.path}`,
      isAuthenticated,
      this.controller.getWishlist
    );
    // this.router.get(`${this.path}/:id`, this.controller.addToWishlist);
    this.router.post(
      `${this.path}/:wishlistId/properties`,
      isAuthenticated,
      this.controller.addToWishlist
    );
    this.router.delete(
      `${this.path}/:wishlistId/properties/:propertyId`,
      isAuthenticated,
      this.controller.addToWishlist
    );
  }
}

export default WIshlistRoute;
