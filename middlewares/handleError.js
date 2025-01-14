// appError.js

export class AppError extends Error {
    constructor(statusCode, message, cause, errorCode, isOperational = true) {
      super(message);
      this.statusCode = statusCode;  // The status code to be used in the response
      this.cause = cause instanceof Error ? cause : undefined;
      this.errorCode = errorCode;
      this.isOperational = isOperational;
  
      // Capture stack trace
      Error.captureStackTrace(this, this.constructor);
    }
  
    // Method to generate a standardized HTTP response
    toHttpResponse() {
      return {
        status: this.isOperational ? 'error' : 'fail',  // Operational errors return 'error'
        message: this.message,  // The error message
        errorCode: this.errorCode,  // A custom error code
        cause: this.cause ? this.cause.message : undefined,  // The underlying cause (if available)
      };
    }
  }
  