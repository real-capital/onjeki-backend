import { body, validationResult } from 'express-validator';
import AuthService from '../../services/auth/auth.service.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';
// import { verifyGoogleToken } from '../../utils/googleAuth.js';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  CALLBACK_URL,
} from '../../config/index.js';

const authService = new AuthService();

class AuthController {
  // Handle create account or login request
  async createAccount(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      console.log(req.body);
      const response = await authService.createAccount(req.body);
      console.log(response);
      res.status(StatusCodes.OK).json({
        statusCode: StatusCodes.OK,
        status: 'success',
        message: response,
      });
    } catch (error) {
      next(error);
    }
  }

  // Handle OTP verification and user authentication
  async validateOtp(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      const { token, user, needsName } = await authService.validateOtp(
        req.body
      );
      res.status(StatusCodes.OK).json({
        statusCode: StatusCodes.OK,
        status: 'success',
        token,
        user,
        needsName,
      });
    } catch (error) {
      next(error);
    }
  }
  async updateUserName(req, res, next) {
    console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      console.log(req.user.id);
      const user = await authService.updateUserName(req.body.name, req.user.id);
      res
        .status(StatusCodes.OK)
        .json({ statusCode: StatusCodes.OK, status: 'success', user });
    } catch (error) {
      next(error);
    }
  }

  async updateUserImage(req, res, next) {
    console.log('req.body');
    console.log(req.body);
    console.log(req.file);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      console.log(req.user.id);
      const user = await authService.updateUserImage(req.user.id, req.file);
      res
        .status(StatusCodes.OK)
        .json({ statusCode: StatusCodes.OK, status: 'success', user });
    } catch (error) {
      next(error);
    }
  }

  async getUser(req, res, next) {
    try {
      const user = await authService.getUser(req.user.id);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: user,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async updatePersonalInfo(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      const user = await authService.updatePersonalInfo(req.user.id, req.body);
      res.status(StatusCodes.OK).json({
        statusCode: StatusCodes.OK,
        status: 'success',
        user,
        message: 'Personal information updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
  async updateEmail(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      const result = await authService.updateEmail(req.user.id, req.body.email);
      res.status(StatusCodes.OK).json({
        statusCode: StatusCodes.OK,
        status: 'success',
        message: result.message,
        requiresVerification: result.requiresVerification,
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePhoneNumber(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      const user = await authService.updatePhoneNumber(
        req.user.id,
        req.body.phoneNumber
      );
      res.status(StatusCodes.OK).json({
        statusCode: StatusCodes.OK,
        status: 'success',
        user,
        message: 'Phone number updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async startGoogleLogin(req, res) {
    const redirectUri = CALLBACK_URL; // The URL to which Google will redirect the user after login
    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${redirectUri}&` +
      `response_type=code&` +
      `scope=openid profile email`;

    res.json({ url: googleAuthUrl });
  }
  async googleLogin(req, res, next) {
    try {
      const { code } = req.query; // Extract the authorization code from query parameters

      if (!code) {
        return res.status(400).json({
          status: 'error',
          message: 'Authorization code not provided',
          errorCode: 'MISSING_AUTH_CODE',
        });
      }

      const userData = await authService.handleGoogleLogin(code);
      res.status(200).json({
        status: 'success',
        message: 'Google login successful',
        data: userData,
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  updateNewToListing = async (req, res, next) => {
    try {
      await authService.updateNewToListing(req.user.id);

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        message: 'User Updated successfully',
        // data: lastListing,
      });
    } catch (error) {
      next(error);
    }
  };


  sendPhoneOtp = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { phoneNumber } = req.body;
      const result = await authService.sendPhoneOtp(userId, phoneNumber);
      res.status(StatusCodes.OK).json({ status: 'success', data: result });
    } catch (error) {
      console.log(error);
      next(error);
    }
  };

  verifyPhoneOtp = async (req, res, next) => {
    try {
      const { otp, phoneNumber } = req.body;
      const userId = req.user.id;
      const result = await authService.verifyPhoneOtp(userId, otp, phoneNumber);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  };
  selfDeclareVerification = async (req, res, next) => {
    try {
      // const verificationData = req.body;
      const userId = req.user.id;
      const result = await authService.selfDeclareVerification(
        userId,
        req.body.fullName,
        req.body.address
      );
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  };

  getVerificationStatus = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await authService.getVerificationStatus(userId);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  };
  publishUserListings = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await authService.publishUserListings(userId);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  };
}

export default AuthController;
