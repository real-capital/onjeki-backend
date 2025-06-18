import express from 'express';
import { Route } from '../../interfaces/route.interface.js';

import { validate } from '../../middlewares/validation.js';
import AmenityController from '../../controller/amenity/amenity.controller.js';

class AmenitiesRoute extends Route {
  constructor() {
    super(express.Router());
    this.path = '/amenities';
    this.controller = new AmenityController();
    this.initializeRoute();
  }
  initializeRoute() {
    this.router.post(
      `${this.path}/add`,
      validate,
      this.controller.createAmenity
    );
    this.router.get(`${this.path}`, this.controller.getAllAmenities);
    this.router.get(`${this.path}/:id`, this.controller.getAmenityById);
  }
}

export default AmenitiesRoute;
