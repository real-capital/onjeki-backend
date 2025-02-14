// services/property.service.js
import PropertyModel from '../../models/properties.model.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';
import UploadService from '../upload/upload.service.js';
import { EListStatus } from '../../enum/house.enum.js';
import mongoose from 'mongoose';
import LastListingModel from '../../models/lastListing.model.js';
import OnboardingModel from '../../models/onboarding.model.js';

const uploadService = new UploadService();

class PropertyService {
  async postLastListingPath(listingPath, userId) {
    try {
      if (!userId) {
        throw new HttpException(StatusCodes.BAD_REQUEST, 'User is required');
      }
      if (!listingPath) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Listing Path is required'
        );
      }

      const lastListing = await LastListingModel.findOneAndUpdate(
        { userId },
        { lastListingPath: listingPath, lastVisitedAt: Date.now() },
        { new: true, upsert: true }
      );
      await lastListing.save();
      return lastListing;
    } catch (error) {
      throw new HttpException(
        error.statusCode || StatusCodes.BAD_REQUEST,
        error.message
      );
    }
  }
  async getLastListingPath(userId) {
    try {
      return await LastListingModel.findOne({ userId });
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching listing path'
      );
    }
  }

  async uploadImage(images, userId) {
    console.log(images);
    console.log('uploading');
    let uploadedImages = [];
    let imageUrls = []; // Initialize as an empty array
    try {
      // Handle image uploads if present
      if (images && Array.isArray(images)) {
        uploadedImages = await uploadService.uploadMultipleImages(
          images,
          `localUploads/${userId}`
        );
        imageUrls = await Promise.all(
          uploadedImages.map(async (image) => image.secure_url)
        );
      }
      console.log('uploadedImages');
      console.log(uploadedImages);
      console.log(imageUrls);

      return imageUrls;
    } catch (error) {
      // If there's an error, cleanup any uploaded images
      if (uploadedImages.length > 0) {
        try {
          await Promise.all(
            uploadedImages.map(async (img) => {
              if (img.public_id) {
                await uploadService.deleteImage(img.public_id);
              }
            })
          );
        } catch (cleanupError) {
          console.error('Error cleaning up images:', cleanupError);
        }
      }

      throw new HttpException(
        StatusCodes.BAD_REQUEST,
        error.message || 'Error uploading images'
      );
    }
  }

  async createProperty(propertyData, userId) {
    let uploadedImages = [];
    try {
      // Handle image uploads if present
      if (propertyData.images && Array.isArray(propertyData.images)) {
        const uploadedImages = await uploadService.uploadMultipleImages(
          propertyData.images,
          `properties/${userId}`
        );

        propertyData.photo = {
          images: await Promise.all(
            uploadedImages.map(async (image) => ({
              url: image.secure_url,
              caption: image.originalname || '',
              isPrimary: false,
              publicId: image.public_id,
            }))
          ),
          videos: [],
        };
      }

      const property = new PropertyModel({
        ...propertyData,
        owner: userId,
      });
      await property.save();

      return property;
    } catch (error) {
      // If there's an error, cleanup any uploaded images
      if (uploadedImages.length > 0) {
        try {
          await Promise.all(
            uploadedImages.map(async (img) => {
              if (img.public_id) {
                await uploadService.deleteImage(img.public_id);
              }
            })
          );
        } catch (cleanupError) {
          console.error('Error cleaning up images:', cleanupError);
        }
      }

      throw new HttpException(
        StatusCodes.BAD_REQUEST,
        error.message || 'Error creating property'
      );
    }
  }

  async updatePropertyImages(propertyId, newImages, userId) {
    try {
      const property = await PropertyModel.findOne({
        _id: propertyId,
        owner: userId,
      });

      if (!property) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'Property not found');
      }

      // Upload new images
      const uploadedImages = await uploadService.uploadMultipleImages(
        newImages,
        `properties/${userId}`
      );

      // Add new images to property
      const formattedImages = await Promise.all(
        uploadedImages.map(async (image) => ({
          url: image.secure_url,
          caption: image.originalname || '',
          isPrimary: false,
          publicId: image.public_id,
        }))
      );

      // Initialize photo object if it doesn't exist
      if (!property.photo) {
        property.photo = {
          images: [],
          videos: [],
        };
      }

      // Add new images to existing ones
      property.photo.images = [
        ...(property.photo.images || []),
        ...formattedImages,
      ];

      await property.save();
      return property;
    } catch (error) {
      throw new HttpException(
        StatusCodes.BAD_REQUEST,
        error.message || 'Error updating property images'
      );
    }
  }

  async getListingByuser(userId) {
    try {
      const properties = await PropertyModel.find({ owner: userId })
        .populate('amenities')
        .populate('buildingType')
        .populate('owner', 'name email');

      return properties;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching properties'
      );
    }
  }

  async getAllProperties(filters = {}, pagination = { page: 1, limit: 10 }) {
    try {
      const query = this.buildSearchQuery(filters);
      const skip = (pagination.page - 1) * pagination.limit;

      const properties = await PropertyModel.find(query)
        .populate('amenities')
        .populate('buildingType')
        .skip(skip)
        .limit(pagination.limit)
        .populate('owner', '_id name email')
        .sort('createdAt');

      // // Increment views if visitor is not the host
      // if (userId !== properties.owner._id) {
      //   properties.stats.views += 1;
      //   await properties.save({ validateBeforeSave: false });
      // }

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
      throw new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error);
    }
  }

  async getPropertyById(propertyId) {
    try {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(propertyId)) {
        throw new HttpException(StatusCodes.BAD_REQUEST, 'Invalid property ID');
      }

      const property = await PropertyModel.findById(propertyId)
        .populate('amenities')
        .populate({
          path: 'amenities',
          populate: {
            path: 'category',
            model: 'Category',
          },
        })
        .populate('buildingType')
        .populate('owner', '_id name email')
        .lean(); // Use lean() for better performance if you don't need Mongoose documents

      if (!property) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'Property not found');
      }
      // console.log(property.owner._id);
      // if (userId !== property.owner._id) {
      //   property.stats.views += 1;
      //   await property.save();
      // }

      return property;
    } catch (error) {
      console.error('Error in getPropertyById:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching property'
      );
    }
  }

  async searchProperties(filters, pagination, sort) {
    try {
      console.log('Received filters:', filters);
      console.log('Pagination:', pagination);
      console.log('Sort:', sort);

      const query = this.buildSearchQuery(filters);
      console.log('Built query:', JSON.stringify(query, null, 2));

      const skip = (pagination.page - 1) * pagination.limit;

      // Execute query with pagination
      const [properties, total] = await Promise.all([
        PropertyModel.find(query)
          .populate('owner', 'name email')
          .populate('buildingType')
          .populate('amenities')
          .sort(sort)
          .skip(skip)
          .limit(pagination.limit)
          .lean(),
        PropertyModel.countDocuments(query),
      ]);

      console.log(
        `Found ${properties.length} properties out of ${total} total`
      );

      return {
        properties,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit),
          hasMore: skip + properties.length < total,
        },
      };
    } catch (error) {
      console.error('Search error:', error);
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        `Error searching properties: ${error.message}`
      );
    }
  }

  buildSearchQuery(filters) {
    try {
      const query = {};

      query.listStatus = 'published';
      // Type filter
      if (filters.type) {
        query.type = filters.type;
      }

      // Building type filter
      if (filters.buildingType) {
        query.buildingType = filters.buildingType;
      }

      // Space filter
      if (filters.space) {
        query.space = filters.space;
      }

      // Price range filter
      if (filters.priceRange) {
        query['price.base'] = {};
        if (filters.priceRange.min) {
          query['price.base'].$gte = filters.priceRange.min;
        }
        if (filters.priceRange.max && filters.priceRange.max !== Infinity) {
          query['price.base'].$lte = filters.priceRange.max;
        }
      }

      // Location filters
      if (filters.location) {
        if (filters.location.city) {
          query['location.city'] = new RegExp(filters.location.city, 'i');
        }
        if (filters.location.country) {
          query['location.country'] = new RegExp(filters.location.country, 'i');
        }
        if (filters.location.state) {
          query['location.state'] = new RegExp(filters.location.state, 'i');
        }
      }

      // Amenities filter
      if (filters.amenities && filters.amenities.length > 0) {
        query.amenities = { $all: filters.amenities };
      }

      // Guest filter
      if (filters.guests) {
        query.guests = { $gte: parseInt(filters.guests) };
      }

      // Bedroom filter
      if (filters.bedrooms) {
        query.bedrooms = { $gte: parseInt(filters.bedrooms) };
      }

      // Status filters
      // if (filters.listStatus) {
      //   query.listStatus = filters.listStatus;
      // }

      // Boolean filters
      if (filters.isBooked !== undefined) {
        query.isBooked = filters.isBooked;
      }

      if (filters.isFurnished !== undefined) {
        query.isFurnished = filters.isFurnished;
      }

      // Add date-based availability filter
      // if (req.query.checkIn && req.query.checkOut) {
      //   const checkIn = new Date(req.query.checkIn);
      //   const checkOut = new Date(req.query.checkOut);

      //   features.query.find({
      //     'availability.calendar': {
      //       $not: {
      //         $elemMatch: {
      //           date: { $gte: checkIn, $lt: checkOut },
      //           isBlocked: true
      //         }
      //       }
      //     }
      //   });
      // }

      console.log('Built query:', query);
      return query;
    } catch (error) {
      console.error('Error building query:', error);
      throw new Error(`Error building search query: ${error.message}`);
    }
  }

  async getPropertyNearBy(latitude, longitude, radius) {
    try {
      // Validate inputs
      if (!latitude || !longitude) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Latitude and longitude are required.'
        );
      }

      // Parse and validate coordinates
      const parsedLatitude = parseFloat(latitude);
      const parsedLongitude = parseFloat(longitude);

      // Validate coordinate ranges
      if (parsedLatitude < -90 || parsedLatitude > 90) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Invalid latitude. Must be between -90 and 90.'
        );
      }

      if (parsedLongitude < -180 || parsedLongitude > 180) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Invalid longitude. Must be between -180 and 180.'
        );
      }

      // Set default radius if not provided or invalid
      const parsedRadius = radius ? parseInt(radius) : 5000; // Default to 5km
      if (isNaN(parsedRadius) || parsedRadius <= 0) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Invalid radius. Must be a positive number.'
        );
      }

      // Find nearby properties
      const properties = await PropertyModel.find({
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parsedLongitude, parsedLatitude],
            },
            $maxDistance: parsedRadius,
          },
        },
      })
        .populate('owner', 'name email') // Populate owner details
        .populate('buildingType') // Populate building type
        .populate('amenities') // Populate amenities
        .select('-__v'); // Exclude version key

      return {
        status: 'success',
        count: properties.length,
        data: properties,
        metadata: {
          searchLocation: {
            latitude: parsedLatitude,
            longitude: parsedLongitude,
          },
          radiusInMeters: parsedRadius,
        },
      };
    } catch (error) {
      // Handle specific MongoDB errors
      if (error.name === 'MongoServerError' && error.code === 16755) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Invalid coordinates format'
        );
      }

      // If it's already an HttpException, rethrow it
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle unexpected errors
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error finding nearby properties'
      );
    }
  }

  async getProgress(userId) {
    try {
      const progress = await OnboardingModel.findOne({
        userId,
        isCompleted: false,
      }).sort({ lastUpdated: -1 });

      // if (!progress) {
      //   throw new HttpException(
      //     StatusCodes.NOT_FOUND,
      //     'No onboarding progress found'
      //   );
      // }

      return progress;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching progress'
      );
    }
  }

  async postProgress(userId, data) {
    try {
      const progressData = {
        userId: userId,
        currentStep: data.currentStep,
        formData: data.formData || {},
        isCompleted: data.isCompleted || false,
        lastUpdated: new Date(),
      };

      const progress = await OnboardingModel.findOneAndUpdate(
        { userId: userId, isCompleted: false },
        progressData,
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      await progress.save();
      return progress;
    } catch (error) {
      console.log(error);
      throw new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error);
    }
  }

  async completeOnboaring(userId) {
    try {
      const progress = await OnboardingModel.findOne({
        userId,
        isCompleted: false,
      });

      // if (!progress) {
      //   throw new HttpException(
      //     StatusCodes.NOT_FOUND,
      //     'No onboarding progress found'
      //   );
      // }

      progress.isCompleted = true;
      await progress.save();

      return progress;
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error completing onboarding'
      );
    }
  }
}

export default PropertyService;
