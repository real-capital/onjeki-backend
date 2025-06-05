import express from 'express';
import { Route } from '../../interfaces/route.interface.js';

import AuthController from '../../controller/auth/auth.controller.js';

const upload = multer({ storage: multer.memoryStorage() });
import {
  validateCreateAccount,
  validateOtp,
  validate,
  validateEmail,
  validatePhone,
  validatePersonalInfo,
} from '../../middlewares/validation.js';
import { isAuthenticated } from '../../middlewares/auth.js';
import { validateImages } from '../../middlewares/image-processing.js';
import multer from 'multer';

class AuthRoute extends Route {
  constructor() {
    super(express.Router());
    this.path = '/auth';
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
    this.router.post(
      `${this.path}/name`,
      isAuthenticated,
      // validateOtp,
      validate,
      this.controller.updateUserName
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
    this.router.post(
      `${this.path}/verify/send-otp`,
      isAuthenticated,
      this.controller.sendPhoneOtp
    );
    this.router.post(
      `${this.path}/verify/verify-otp`,
      isAuthenticated,
      this.controller.verifyPhoneOtp
    );
    this.router.post(
      `${this.path}/verify/self-declare`,
      isAuthenticated,
      this.controller.selfDeclareVerification
    );
    this.router.get(
      `${this.path}/verify/status`,
      isAuthenticated,
      this.controller.getVerificationStatus
    );
    this.router.post(
      `${this.path}/verify/publish`,
      isAuthenticated,
      this.controller.publishUserListings
    );
    this.router.post(
      `${this.path}/update-image`,
      isAuthenticated,
      upload.single('avatar'),
      // validateImages,
      this.controller.updateUserImage
    );
    this.router.patch(
      `${this.path}/personal-info`,
      isAuthenticated,
      validatePersonalInfo,
      validate,
      this.controller.updatePersonalInfo
    );

    this.router.patch(
      `${this.path}/email`,
      isAuthenticated,
      validateEmail,
      validate,
      this.controller.updateEmail
    );

    this.router.patch(
      `${this.path}/phone`,
      isAuthenticated,
      validatePhone,
      validate,
      this.controller.updatePhoneNumber
    );
  }
}

export default AuthRoute;
