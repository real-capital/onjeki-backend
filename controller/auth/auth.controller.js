import { body, validationResult } from 'express-validator';
import AuthService from '../../services/auth/auth.service.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';
// import { verifyGoogleToken } from '../../utils/googleAuth.js';

const authService = new AuthService();

class AuthController {
  // Handle create account or login request
  async createAccount(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      const response = await authService.createAccount(req.body);
      res.status(StatusCodes.OK).json({ message: response });
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
      const { token, name } = await authService.validateOtp(req.body);
      res.status(StatusCodes.OK).json({ token, name });
    } catch (error) {
      next(error);
    }
  }

  // Google Login
  //   async googleLogin(req, res, next) {
  //     try {
  //       const { idToken } = req.body; // The ID token sent from Flutter

  //       if (!idToken) {
  //         return next(
  //           new HttpException(StatusCodes.BAD_REQUEST, 'ID token is required')
  //         );
  //       }

  //       // Verify the Google ID token
  //       const profile = await verifyGoogleToken(idToken);

  //       // Call AuthService to create or update the user
  //       const user = await authService.createOrUpdateUser(profile);

  //       // Respond with user details (you can also generate a JWT token here)
  //       res.status(StatusCodes.OK).json({
  //         status: 'success',
  //         message: 'User successfully logged in or created',
  //         user: user,
  //       });
  //     } catch (error) {
  //       next(error);
  //     }
  //   }

  async googleLogin(req, res, next) {
    try {
      const { code } = req.query; // Extract the code from the query parameters

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
        console.log(error);
      next(error);
    }
  }
}



export default AuthController;
