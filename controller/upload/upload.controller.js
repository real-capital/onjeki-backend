import UploadService from '../../services/upload/upload.service.js';
import { StatusCodes } from 'http-status-codes';

class UploadController {
  async uploadPropertyImages(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: 'error',
          message: 'No files uploaded',
        });
      }

      const uploadedImages = await UploadService.uploadMultipleImages(
        req.files,
        `properties/${req.user._id}`
      );

      const formattedImages = await Promise.all(
        uploadedImages.map(async (image) => ({
          publicId: image.public_id,
          url: image.secure_url,
          variants: await UploadService.generateImageVariants(image.public_id),
        }))
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: formattedImages,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  async deletePropertyImage(req, res) {
    try {
      const { publicId } = req.params;
      await UploadService.deleteImage(publicId);

      res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'Image deleted successfully',
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }
}

export default UploadController;
