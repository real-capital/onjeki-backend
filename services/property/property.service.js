// services/property.service.js
import PropertyModel from '../../models/properties.model.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';
import UploadService from '../upload/upload.service.js';

// const uploadService = new UploadService();

class PropertyService {
  async createProperty(propertyData, userId) {
    try {
      // Handle image uploads if present
      if (propertyData.images) {
        const uploadedImages = await UploadService.uploadMultipleImages(
          propertyData.images,
          `properties/${userId}`
        );

        propertyData.photo = await Promise.all(
          uploadedImages.map(async (image) => ({
            publicId: image.public_id,
            url: image.secure_url,
            variants: await UploadService.generateImageVariants(
              image.public_id
            ),
          }))
        );
      }

      const property = new PropertyModel({
        ...propertyData,
        owner: userId,
      });
      await property.save();
      return property;
    } catch (error) {
      // If there's an error, cleanup any uploaded images
      if (propertyData.photo) {
        await Promise.all(
          propertyData.photo.map((img) =>
            UploadService.deleteImage(img.publicId)
          )
        );
      }
      throw error;

      //   throw new HttpException(
      //     StatusCodes.BAD_REQUEST,
      //     'Error creating property'
      //   );
    }
  }

  async updatePropertyImages(propertyId, newImages, userId) {
    const property = await PropModel.findOne({
      _id: propertyId,
      user: userId,
    });

    if (!property) {
      throw new Error('Property not found');
    }

    // Upload new images
    const uploadedImages = await UploadService.uploadMultipleImages(
      newImages,
      `properties/${userId}`
    );

    // Add new images to property
    const formattedImages = await Promise.all(
      uploadedImages.map(async (image) => ({
        publicId: image.public_id,
        url: image.secure_url,
        variants: await UploadService.generateImageVariants(image.public_id),
      }))
    );

    property.photo = [...property.photo, ...formattedImages];
    await property.save();

    return property;
  }

  async getProperties(filters = {}, pagination = { page: 1, limit: 10 }) {
    try {
      const query = this.buildPropertyQuery(filters);
      const skip = (pagination.page - 1) * pagination.limit;

      const properties = await PropertyModel.find(query)
        .populate('amenities')
        .populate('buildingType')
        .skip(skip)
        .limit(pagination.limit)
        .populate('owner', 'name email')
        .sort('-createdAt');

      const total = await PropertyModel.countDocuments(query);

      return {
        properties,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit),
        },
      };
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching properties'
      );
    }
  }

  buildSearchQuery(filters) {
    const query = { listStatus: EListStatus.APPROVED };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.buildingType) {
      query.buildingType = filters.buildingType;
    }

    if (filters.space) {
      query.space = filters.space;
    }

    if (filters.priceRange) {
      query.price = {
        $gte: filters.priceRange.min,
        $lte: filters.priceRange.max,
      };
    }

    if (filters.location) {
      if (filters.location.city) {
        query['location.city'] = filters.location.city;
      }
      if (filters.location.country) {
        query['location.country'] = filters.location.country;
      }
      if (filters.location.coordinates) {
        query['location.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [
                filters.location.coordinates.longitude,
                filters.location.coordinates.latitude,
              ],
            },
            $maxDistance: filters.location.radius || 10000, // Default 10km
          },
        };
      }
    }

    if (filters.amenities?.length) {
      query.amenities = { $all: filters.amenities };
    }

    if (filters.guests) {
      query.guests = { $gte: filters.guests };
    }

    if (filters.bedrooms) {
      query.bedrooms = { $gte: filters.bedrooms };
    }

    return query;
  }

  // Add more methods as needed
}

export default PropertyService;

// // routes/mobile.routes.js
// import { Router } from 'express';
// import { isAuthenticated } from '../middlewares/auth.middleware.js';

// const router = Router();

// // Device registration
// router.post('/devices', isAuthenticated, async (req, res) => {
//   const { deviceToken, platform } = req.body;
//   await UserModel.findByIdAndUpdate(req.user._id, {
//     deviceToken,
//     platform
//   });
//   res.status(200).json({ message: 'Device registered successfully' });
// });

// // Mobile-specific property listing
// router.get('/featured-properties', async (req, res) => {
//   const properties = await PropModel.find({ isFeatured: true })
//     .select('title photos price location')
//     .limit(10);
//   res.json(properties);
// });

// // Mobile search with location
// router.get('/nearby-properties', isAuthenticated, async (req, res) => {
//   const { latitude, longitude, radius = 5 } = req.query;

//   const properties = await PropModel.find({
//     'location.pointer': {
//       $near: {
//         $geometry: {
//           type: 'Point',
//           coordinates: [parseFloat(longitude), parseFloat(latitude)]
//         },
//         $maxDistance: radius * 1000 // Convert km to meters
//       }
//     }
//   });

//   res.json(properties);
// });

// export default router;
