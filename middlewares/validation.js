import { body, validationResult } from 'express-validator';
import HttpException from '../utils/exception.js';
import { StatusCodes } from 'http-status-codes';
import { EHouseSpace, EPurpose } from '../enum/house.enum.js';

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

const validatePropertyCreation = [
  body('type').isIn(Object.values(EPurpose)),
  body('space').isIn(Object.values(EHouseSpace)),
  body('title').notEmpty(),
  body('description').notEmpty(),
  body('price.base').isNumeric().notEmpty(),
  body('location').isObject(),
  body('location.country').notEmpty(),
  body('location.state').notEmpty(),
  body('bedrooms').isNumeric(),
  body('bathrooms').isNumeric(),
  body('guests').isNumeric(),
];

const validateBookingCreation = [
  body('property').isMongoId(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('guests').isObject(),
  body('guests.adults').isNumeric(),
];

export {
  validateCreateAccount,
  validateOtp,
  validate,
  validatePropertyCreation,
  validateBookingCreation,
};
