import { Router } from 'express';

import AuthController from '../../controller/auth/auth.controller.js';
import {
  validateCreateAccount,
  validateOtp,
  validate,
} from '../../middlewares/validation.js';

class AuthRoute {
  constructor() {
    this.path = '/auth';
    this.router = Router();
    this.controller = new AuthController();
    this.initializeRoute();
  }

  initializeRoute() {
    this.router.post(
      `${this.path}/create`,
      validateCreateAccount,
      validate,
      this.controller.createAccount
    );
    this.router.get(`${this.path}/start-google-login`, this.controller.startGoogleLogin);
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
    // this.router.post(
    //   `${this.path}/complete`,
    //   dtoValidationMiddleware(completeRegDto, 'body', 'missing params'),
    //   this.controller.completeReg
    // );
    // this.router.get(
    //   `${this.path}/my-profile`,
    //   UserGuard.createInstance,
    //   this.controller.getProfile
    // );
  }
}

export default AuthRoute;
