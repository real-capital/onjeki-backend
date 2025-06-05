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
export const validatePersonalInfo = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('username')
    .optional()
    .isLength({ min: 2, max: 30 })
    .withMessage('Username must be between 2 and 30 characters'),
  body('preferredName')
    .optional()
    .isLength({ min: 2, max: 30 })
    .withMessage('Preferred name must be between 2 and 30 characters'),
  body('address')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
];

export const validateEmail = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
];

export const validatePhone = [
  body('phoneNumber')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
];

export {
  validateCreateAccount,
  validateOtp,
  validate,
  validatePropertyCreation,
  validateBookingCreation,
};
