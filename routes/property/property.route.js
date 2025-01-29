// routes/property/property.route.js
import express from 'express';
import { Route } from '../../interfaces/route.interface.js';
import PropertyController from '../../controller/property/property.controller.js';
import { validate } from '../../middlewares/validation.js';
import { isAuthenticated } from '../../middlewares/auth.js';
import { validateSearchQuery } from '../../validation/validateSearch.js';

class PropertyRoute extends Route {
  constructor() {
    super(express.Router()); // Initialize the parent class
    this.path = '/properties'; // Set the base path
    this.controller = new PropertyController(); // Instantiate the controller
    this.initializeRoute();
  }

  initializeRoute() {
    // Define routes
    this.router.post(
      `${this.path}/create`,
      isAuthenticated,
      validate,
      this.controller.createProperty
    );
    this.router.post(
      `${this.path}/lastListingPath`,
      isAuthenticated,
      validate,
      this.controller.postLastListingPath
    );
    this.router.get(
      `${this.path}/lastListingPath`,
      isAuthenticated,
      validate,
      this.controller.getLastListingPath
    );

    this.router.get(
      `${this.path}/search`,
      validateSearchQuery,
      this.controller.searchProperties
    );

    this.router.get(
      `${this.path}/getAll`,
      validate,
      this.controller.getAllProperties
    );

    this.router.get(
      `${this.path}/property/:id`,
      validate,
      this.controller.getPropertyById
    );

    this.router.get(
      `${this.path}/nearby`,
      validate,
      this.controller.getPropertyNearBy
    );
  }
}

export default PropertyRoute;
