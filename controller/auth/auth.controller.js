import { body, validationResult } from 'express-validator';
import AuthService from '../../services/auth/auth.service.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';

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
}

export default AuthController;
