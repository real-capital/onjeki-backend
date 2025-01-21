const imageTransformations = {
  propertyMain: {
    width: 1200,
    height: 800,
    crop: 'fill',
    quality: 'auto',
    format: 'auto',
    effect: 'sharpen',
  },
  propertyThumbnail: {
    width: 300,
    height: 200,
    crop: 'thumb',
    gravity: 'auto',
    quality: 'auto',
    format: 'auto',
  },
  propertyGallery: {
    width: 800,
    height: 600,
    crop: 'fill',
    quality: 'auto',
    format: 'auto',
  },
  userProfile: {
    width: 150,
    height: 150,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    format: 'auto',
  },
};

export default imageTransformations;
