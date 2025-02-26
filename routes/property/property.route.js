// routes/property/property.route.js
import express from 'express';
import multer from 'multer';
import { Route } from '../../interfaces/route.interface.js';
import PropertyController from '../../controller/property/property.controller.js';
import { validate } from '../../middlewares/validation.js';
import { isAuthenticated } from '../../middlewares/auth.js';
import { validateSearchQuery } from '../../validation/validateSearch.js';
import RentOrSalesController from '../../controller/property/rent.controller.js';
const storage = multer.diskStorage({
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  },
});

const upload = multer({ storage });
// const upload = multer({ storage: multer.memoryStorage() });
class PropertyRoute extends Route {
  constructor() {
    super(express.Router()); // Initialize the parent class
    this.path = '/properties'; // Set the base path
    this.controller = new PropertyController(); // Instantiate the controller
    this.rentController = new RentOrSalesController();
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
      `${this.path}/rent/create`,
      isAuthenticated,
      validate,
      this.rentController.createRentOrSale
    );
    // this.router.patch(
    //   `${this.path}/:id`,
    //   isAuthenticated,
    //   // uploadMiddleware.array('images'), // If you're handling file uploads
    //   this.controller.updateProperty
    // );

    this.router.patch(
      `${this.path}/:id`,
      isAuthenticated,
      validate,
      this.controller.updateProperty
    );

    this.router.post(
      `${this.path}/:id/images`,
      isAuthenticated,
      upload.array('locals'),
      // upload.array('images', 10),
      this.controller.uploadImagestoProperty
    );

    this.router.delete(
      `${this.path}/:id/images/:imageId`,
      isAuthenticated,
      this.controller.deleteImage
    );

    this.router.patch(
      `${this.path}/:id/images/:imageId/primary`,
      isAuthenticated,
      this.controller.setPrimaryImage
    );
    this.router.post(
      `${this.path}/lastListingPath`,
      isAuthenticated,
      this.controller.postLastListingPath
    );
    this.router.get(
      `${this.path}/progress`,
      isAuthenticated,
      this.controller.getProgress
    );
    this.router.post(
      `${this.path}/progress`,
      isAuthenticated,
      this.controller.postProgress
    );
    this.router.post(
      `${this.path}/upload`,

      upload.array('locals'),
      isAuthenticated,
      this.controller.uploadImages
    );
    this.router.post(
      `${this.path}/complete`,
      isAuthenticated,
      this.controller.completeOnboarding
    );
    this.router.get(
      `${this.path}/lastListingPath`,
      isAuthenticated,
      this.controller.getLastListingPath
    );

    this.router.get(
      `${this.path}/search`,
      validateSearchQuery,
      this.controller.searchProperties
    );
    this.router.get(
      `${this.path}/rent/search`,
      validateSearchQuery,
      this.rentController.searchRentOrSales
    );

    this.router.get(
      `${this.path}/getAll`,
      validate,
      isAuthenticated,
      this.controller.getAllProperties
    );

    this.router.get(
      `${this.path}/property/:id`,
      validate,
      isAuthenticated,
      this.controller.getPropertyById
    );
    this.router.get(
      `${this.path}/userListing`,
      validate,
      isAuthenticated,
      this.controller.getListingByuser
    );

    this.router.get(
      `${this.path}/nearby`,
      validate,
      isAuthenticated,
      this.controller.getPropertyNearBy
    );
  }
}

export default PropertyRoute;
