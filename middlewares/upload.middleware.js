import multer from 'multer';
import { StatusCodes } from 'http-status-codes';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: 'error',
          message: 'File too large. Maximum size is 5MB',
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: 'error',
          message: 'Too many files uploaded',
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: 'error',
          message: 'Unexpected field name in upload',
        });
      default:
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: 'error',
          message: 'Error uploading file',
        });
    }
  }
  // If it's not a Multer error, pass it to the next error handler
  next();
};
