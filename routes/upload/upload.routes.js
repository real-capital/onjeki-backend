import multer from 'multer';
import UploadController from '../../controller/upload/upload.controller.js';
import { validateImages } from '../../middlewares/image-processing.js';
import EnhancedUploadController from '../../controller/upload/ehnanced-upload.controller.js';

const upload = multer({ storage: multer.memoryStorage() });
class UploadRoute {
  constructor() {
    this.path = '/upload';
    this.router = Router();
    this.controller = new UploadController();
    this.enhanceController = new EnhancedUploadController();
    this.initializeRoute();
  }

  initializeRoute() {
    this.router.post(
      `${this.path}/property-images`,
      //   validateCreateProperty,
      upload.array('images', 10),
      validateImages,
      this.controller.uploadPropertyImages
    );
    this.router.post(
      `${this.path}/optimize/:publicId`,
      //   validateCreateProperty,
      this.enhanceController.optimizeExistingImage
    );
    this.router.post(
      `${this.path}/responsive/:publicId`,
      //   validateCreateProperty,
      this.enhanceController.generateResponsiveSet
    );
    this.router.delete(
      `${this.path}/property-images/:publicId`,
      //   validateCreateProperty,
      validate,
      this.controller.deletePropertyImage
    );
  }
}
