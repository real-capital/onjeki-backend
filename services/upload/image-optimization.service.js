class ImageOptimizationService {
  constructor() {
    this.cloudinary = cloudinary;
  }

  async optimizeImage(publicId, options = {}) {
    const defaultOptions = {
      quality: 'auto:best',
      fetch_format: 'auto',
      flags: ['progressive', 'strip_profile', 'strip_metadata'],
      optimization: true,
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      const result = await this.cloudinary.uploader.explicit(publicId, {
        type: 'upload',
        eager: [finalOptions],
      });

      return result.eager[0];
    } catch (error) {
      throw new Error(`Optimization failed: ${error.message}`);
    }
  }

  async generateResponsiveImages(
    publicId,
    breakpoints = [320, 480, 768, 1024, 1200]
  ) {
    try {
      const result = await this.cloudinary.uploader.explicit(publicId, {
        type: 'upload',
        responsive_breakpoints: {
          create_derived: true,
          breakpoints,
        },
      });

      return result.responsive_breakpoints[0].breakpoints;
    } catch (error) {
      throw new Error(`Responsive generation failed: ${error.message}`);
    }
  }

  generateImageUrl(publicId, options = {}) {
    const defaultOptions = {
      secure: true,
      quality: 'auto',
      fetch_format: 'auto',
    };

    return this.cloudinary.url(publicId, {
      ...defaultOptions,
      ...options,
    });
  }
}
