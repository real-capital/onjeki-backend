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
      const { token, name } = await authService.validateOtp(req.body);
      res
        .status(StatusCodes.OK)
        .json({ statusCode: StatusCodes.OK, status: 'success', token, name });
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

  // upgradePlan = async (req, res, next) => {
  //   try {
  //     const { plan } = req.body; // "premium" or "enterprise"
  //     const validPlans = ['basic', 'premium', 'enterprise'];

  //     if (!validPlans.includes(plan)) {
  //       return next(new HttpException(StatusCodes.BAD_REQUEST, 'Invalid plan'));
  //     }

  //     // Update the user's plan
  //     const user = await User.findByIdAndUpdate(
  //       req.user.id,
  //       { plan },
  //       { new: true }
  //     );

  //     res.status(StatusCodes.OK).json({
  //       status: 'success',
  //       message: `Your plan has been upgraded to ${plan}`,
  //       data: user,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // };
}

export default AuthController;
