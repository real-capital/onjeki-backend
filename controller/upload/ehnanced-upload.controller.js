import enhancedUploadService from "../../services/upload/enhanced-upload.service";

class EnhancedUploadController {
    constructor() {
      this.uploadService = new enhancedUploadService();
      this.optimizationService = new ImageOptimizationService();
    }
  
    async uploadPropertyImages(req, res) {
      try {
        const uploadPromises = req.files.map(file =>
          this.uploadService.uploadWithOptimization(file, {
            folder: `properties/${req.user._id}`,
            isRetina: req.query.retina === 'true'
          })
        );
  
        const uploadedImages = await Promise.all(uploadPromises);
  
        res.status(StatusCodes.OK).json({
          status: 'success',
          data: uploadedImages
        });
      } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          status: 'error',
          message: error.message
        });
      }
    }
  
    async optimizeExistingImage(req, res) {
      try {
        const { publicId } = req.params;
        const optimizedImage = await this.optimizationService.optimizeImage(
          publicId,
          req.body.options
        );
  
        res.status(StatusCodes.OK).json({
          status: 'success',
          data: optimizedImage
        });
      } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          status: 'error',
          message: error.message
        });
      }
    }
  
    async generateResponsiveSet(req, res) {
      try {
        const { publicId } = req.params;
        const { breakpoints } = req.body;
  
        const responsiveImages = await this.optimizationService
          .generateResponsiveImages(publicId, breakpoints);
  
        res.status(StatusCodes.OK).json({
          status: 'success',
          data: responsiveImages
        });
      } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          status: 'error',
          message: error.message
        });
      }
    }
  }
  

export default EnhancedUploadController;