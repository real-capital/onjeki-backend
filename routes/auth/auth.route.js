import express from 'express';
import { Route } from '../../interfaces/route.interface.js';

import AuthController from '../../controller/auth/auth.controller.js';
import {
  validateCreateAccount,
  validateOtp,
  validate,
} from '../../middlewares/validation.js';
// import PropertyController from '../../controller/property/property.controller.js';
import { isAuthenticated } from '../../middlewares/auth.js';

class AuthRoute extends Route {
  constructor() {
    super(express.Router());
    this.path = '/auth';
    // this.router = Router();
    this.controller = new AuthController();
    // this.propController = new PropertyController();
    this.initializeRoute();
  }

  initializeRoute() {
    this.router.post(
      `${this.path}/create`,
      validateCreateAccount,
      validate,
      this.controller.createAccount
    );
    this.router.get(
      `${this.path}/start-google-login`,
      this.controller.startGoogleLogin
    );
    this.router.get(`${this.path}/google-login`, this.controller.googleLogin);
    // this.router.post(
    //   `${this.path}/apple`,
    //   dtoValidationMiddleware(createUserDto, 'body', 'missing params'),
    //   this.controller.appleLogin
    // );
    this.router.post(
      `${this.path}/login`,
      validateOtp,
      validate,
      this.controller.validateOtp
    );
    this.router.get(
      `${this.path}/me`,
      isAuthenticated,
      this.controller.getUser
    );
    this.router.post(
      `${this.path}/updateNewToListing`,
      isAuthenticated,
      this.controller.updateNewToListing
    );
    // this.router.get(
    //   `${this.path}/my-profile`,
    //   UserGuard.createInstance,
    //   this.controller.getProfile
    // );
  }
}

export default AuthRoute;
