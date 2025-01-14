import { body, validationResult } from 'express-validator';
import HttpException from '../utils/exception.js';
import { StatusCodes } from 'http-status-codes';

// Middleware to validate create account
const validateCreateAccount = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
];

// Middleware to validate OTP
const validateOtp = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('otp').isString(),
];

// Handle validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpException(StatusCodes.BAD_REQUEST, 'Invalid email format')
    ); // Here
  }
  // if (!errors.isEmpty()) {
  //   return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
  // }
  next();
};

export { validateCreateAccount, validateOtp, validate };
