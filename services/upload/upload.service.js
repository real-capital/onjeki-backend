import cloudinary from '../../config/cloudinary.js';
import { Readable } from 'stream';

class UploadService {
  async uploadImage(file, folder = 'properties') {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
            transformation: [
              { width: 1200, height: 800, crop: 'limit' }, // Main image size
              { quality: 'auto' }, // Automatic quality optimization
              { fetch_format: 'auto' }, // Automatic format optimization
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        // Convert buffer to stream and pipe to cloudinary
        const stream = Readable.from(file.buffer);
        stream.pipe(uploadStream);
      });
    } catch (error) {
      throw new Error(`Error uploading image: ${error.message}`);
    }
  }

  static async uploadMultipleImages(images, folder) {
    try {
      if (!images || !Array.isArray(images)) {
        throw new Error('No images provided or invalid format');
      }

      const uploadPromises = images.map(async (image) => {
        const result = await cloudinary.uploader.upload(image.path, {
          folder: folder,
        });
        return {
          public_id: result.public_id,
          secure_url: result.secure_url,
          originalname: image.originalname,
        };
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      throw new HttpException(
        StatusCodes.BAD_REQUEST,
        `Error uploading images: ${error.message}`
      );
    }
  }


  static async deleteImage(publicId) {
    try {
      if (!publicId) {
        throw new Error('No publicId provided for image deletion');
      }

      const result = await cloudinary.uploader.destroy(publicId);

      if (result.result !== 'ok') {
        throw new Error(`Failed to delete image: ${result.result}`);
      }

      return result;
    } catch (error) {
      throw new HttpException(
        StatusCodes.BAD_REQUEST,
        `Error deleting image: ${error.message}`
      );
    }
  }

  // async deleteImage(publicId) {
  //   try {
  //     const result = await cloudinary.uploader.destroy(publicId);
  //     return result;
  //   } catch (error) {
  //     throw new Error(`Error deleting image: ${error.message}`);
  //   }
  // }

  // Generate different image variants
  async generateImageVariants(publicId, config = {}) {
    const variants = {
      thumbnail: cloudinary.url(publicId, {
        width: 150,
        height: 150,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto',
        ...config.thumbnail,
      }),
      medium: cloudinary.url(publicId, {
        width: 600,
        height: 400,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto',
        ...config.medium,
      }),
      large: cloudinary.url(publicId, {
        width: 1200,
        height: 800,
        crop: 'limit',
        quality: 'auto',
        fetch_format: 'auto',
        ...config.large,
      }),
    };

    return variants;
  }
}

export default new UploadService();
