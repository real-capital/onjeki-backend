import { StatusCodes } from 'http-status-codes';

export const validateImages = (req, res, next) => {
  console.log('Validating images:', req.files);
  if (!req.files || req.files.length === 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: 'error',
      message: 'No files uploaded'
    });
  }

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxFileSize = 5 * 1024 * 1024; // 5MB

  const invalidFiles = req.files.filter(
    file => 
      !allowedMimeTypes.includes(file.mimetype) || 
      file.size > maxFileSize
  );

  if (invalidFiles.length > 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: 'error',
      message: 'Invalid files detected. Please ensure all files are images (JPEG, PNG, or WebP) and under 5MB'
    });
  }

  next();
};