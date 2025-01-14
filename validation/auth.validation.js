const { body, validationResult } = require('express-validator');
// Validation for creating an account
const validateCreateAccount = [body('email').isEmail().normalizeEmail()];

// Validation for OTP verification
const validateOtp = [
  body('email').isEmail().normalizeEmail(),
  body('otp').isString(),
];


