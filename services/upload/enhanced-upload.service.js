import cloudinary from '../config/cloudinary.js';
import imageTransformations from '../../utils/image-transformations.js';

class EnhancedUploadService {
  async uploadWithTransformation(file, options = {}) {
    const {
      folder = 'general',
      transformation = 'propertyMain',
      tags = [],
      publicId = null,
    } = options;

    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: publicId,
            tags,
            transformation: imageTransformations[transformation],
            responsive_breakpoints: {
              create_derived: true,
              bytes_step: 20000,
              min_width: 200,
              max_width: 1200,
              max_images: 5,
            },
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(this.formatImageResponse(result));
          }
        );

        const stream = Readable.from(file.buffer);
        stream.pipe(uploadStream);
      });
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async uploadWithOptimization(file, options = {}) {
    const baseOptions = {
      folder: options.folder || 'optimized',
      quality: 'auto',
      fetch_format: 'auto',
      flags: 'progressive',
      optimization: true,
    };

    if (options.isRetina) {
      return this.handleRetinaUpload(file, baseOptions);
    }

    return this.uploadWithTransformation(file, {
      ...baseOptions,
      transformation: [
        { width: 'auto', crop: 'scale', dpr: 'auto' },
        { quality: 'auto:best' },
      ],
    });
  }

  async handleRetinaUpload(file, baseOptions) {
    const [standardVersion, retinaVersion] = await Promise.all([
      this.uploadWithTransformation(file, {
        ...baseOptions,
        transformation: [{ width: 'auto', crop: 'scale', dpr: '1.0' }],
      }),
      this.uploadWithTransformation(file, {
        ...baseOptions,
        transformation: [{ width: 'auto', crop: 'scale', dpr: '2.0' }],
      }),
    ]);

    return {
      standard: standardVersion,
      retina: retinaVersion,
    };
  }

  formatImageResponse(result) {
    return {
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.bytes,
      variants: result.responsive_breakpoints?.[0]?.breakpoints || [],
      metadata: {
        originalFilename: result.original_filename,
        createdAt: result.created_at,
        tags: result.tags,
      },
    };
  }
}


export default new EnhancedUploadService()