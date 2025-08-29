// services/property.service.js
import PropertyModel from '../../models/properties.model.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';
import UploadService from '../upload/upload.service.js';
import { EListStatus } from '../../enum/house.enum.js';
import mongoose from 'mongoose';
import LastListingModel from '../../models/lastListing.model.js';
import OnboardingModel from '../../models/onboarding.model.js';
import RentAndSales from '../../models/rentAndSales.model.js';
import UserModel from '../../models/user.model.js';
import EarningModel from '../../models/earning.model.js';
import BookingModel from '../../models/booking.model.js';

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
    let imageUrls = [];
    try {
      if (images && Array.isArray(images)) {
        uploadedImages = await uploadService.uploadMultipleImages(
          images,
          `properties/${userId}`
        );
        imageUrls = await Promise.all(
          uploadedImages.map(async (image) => image.secure_url)
        );
      }
      console.log('uploadedImages');
      console.log(uploadedImages);
      console.log(imageUrls);

      return uploadedImages;
    } catch (error) {
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
    const session = await mongoose.startSession();
    session.startTransaction();
    let uploadedImages = [];
    try {
      const user = await UserModel.findById(userId);

      if (!user) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'User not found');
      }

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

      let initialListStatus = EListStatus.UNDER_REVIEW;

      if (
        user.verification_status === 'verified' ||
        (user.isEmailVerified && user.isPhoneVerified)
      ) {
        initialListStatus = EListStatus.APPROVED;
      }

      const property = new PropertyModel({
        ...propertyData,
        owner: userId,
        listStatus: initialListStatus,
      });

      await property.save();

      const propertiesCount = await PropertyModel.countDocuments({
        owner: userId,
      });

      if (propertiesCount === 1) {
        await UserModel.findByIdAndUpdate(
          userId,
          {
            'hostProfile.joinedAt': new Date(),
            'hostProfile.responseRate': 100,
            'hostProfile.responseTime': 60,
            'hostProfile.acceptanceRate': 100,
          },
          { new: true }
        );
      }
      await session.commitTransaction();
      return property;
    } catch (error) {
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
      await session.abortTransaction();
      throw new HttpException(
        StatusCodes.BAD_REQUEST,
        error.message || 'Error creating property'
      );
    } finally {
      session.endSession();
    }
  }

  async updateProperty(propertyId, userId, updateData) {
    console.log('Updating property with data:', updateData);

    try {
      const flattenedUpdate = {};

      function flatten(obj, prefix = '') {
        for (const key in obj) {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            flatten(obj[key], `${prefix}${key}.`);
          } else {
            flattenedUpdate[`${prefix}${key}`] = obj[key];
          }
        }
      }

      flatten(updateData);
      const property = await PropertyModel.findOneAndUpdate(
        {
          _id: propertyId,
          owner: userId,
        },
        {
          // ...updateData,
          $set: flattenedUpdate,
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!property) {
        throw new HttpException(
          StatusCodes.NOT_FOUND,
          'Property not found or unauthorized'
        );
      }
      return property;
    } catch (error) {
      throw error;
    }
  }

  async uploadPropertyImages(propertyId, userId, files) {
    let uploadedImages = [];
    try {
      // Verify property ownership
      const property = await PropertyModel.findOne({
        _id: propertyId,
        owner: userId,
      });

      if (!property) {
        throw new HttpException(
          StatusCodes.NOT_FOUND,
          'Property not found or unauthorized'
        );
      }

      uploadedImages = await uploadService.uploadMultipleImages(
        files,
        `properties/${userId}`
      );

      const newImages = await Promise.all(
        uploadedImages.map(async (image) => ({
          url: image.secure_url,
          caption: image.originalname || '',
          isPrimary: false,
          publicId: image.public_id,
        }))
      );

      const existingImages = property.photo?.images || [];
      property.photo = {
        images: [...existingImages, ...newImages],
        videos: property.photo?.videos || [],
      };

      await property.save();

      return newImages;
    } catch (error) {
      // Cleanup uploaded images if there's an error
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
      throw error;
    }
  }

  async deletePropertyImage(propertyId, userId, imageId) {
    try {
      const property = await PropertyModel.findOne({
        _id: propertyId,
        owner: userId,
      });

      if (!property) {
        throw new HttpException(
          StatusCodes.NOT_FOUND,
          'Property not found or unauthorized'
        );
      }

      const imageToDelete = property.photo.images.find(
        (img) => img._id.toString() === imageId
      );

      if (!imageToDelete) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'Image not found');
      }

      // Delete from cloud storage
      if (imageToDelete.publicId) {
        await uploadService.deleteImage(imageToDelete.publicId);
      }

      // Remove image from property
      property.photo.images = property.photo.images.filter(
        (img) => img._id.toString() !== imageId
      );

      await property.save();
      return property;
    } catch (error) {
      throw error;
    }
  }

  async setPrimaryImage(propertyId, userId, imageId) {
    try {
      const property = await PropertyModel.findOne({
        _id: propertyId,
        owner: userId,
      });

      if (!property) {
        throw new HttpException(
          StatusCodes.NOT_FOUND,
          'Property not found or unauthorized'
        );
      }

      property.photo.images = property.photo.images.map((img) => ({
        ...img,
        isPrimary: img._id.toString() === imageId,
      }));

      await property.save();
      return property;
    } catch (error) {
      throw error;
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
        .populate('owner', 'name email')
        .sort('createdAt');

      return properties;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching properties'
      );
    }
  }
  async getPropertiesByUser(userId) {
    try {
      const properties = await RentAndSales.find({
        owner: userId,
        type: { $in: ['RENT', 'SALE'] }, // Fetch both RENT and SALE
      })
        .populate('owner', 'name email')
        .sort('createdAt');

      return properties;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching properties'
      );
    }
  }

  async getSaleByUser(userId) {
    try {
      const properties = await RentAndSales.find({
        owner: userId,
        type: 'SALE',
      }).sort('createdAt');

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
  async getAllListingInProgress(userId) {
    // pagination = { page: 1, limit: 10 }
    try {
      // const query = this.buildSearchQuery(filters);
      // const skip = (pagination.page - 1) * pagination.limit;

      const properties = await OnboardingModel.find({ userId: userId })

        // .skip(skip)
        // .limit(pagination.limit)
        .sort('createdAt');

      // // Increment views if visitor is not the host
      // if (userId !== properties.owner._id) {
      //   properties.stats.views += 1;
      //   await properties.save({ validateBeforeSave: false });
      // }

      // const total = await OnboardingModel.countDocuments();

      return properties;
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
    const query = {};
    query.listStatus = 'Approved';

    // ✅ Deep fuzzy search
    if (
      filters.search &&
      typeof filters.search === 'string' &&
      filters.search.trim() !== ''
    ) {
      const regex = new RegExp(filters.search, 'i');

      query.$or = [
        { title: regex },
        { description: regex },
        { slug: regex },
        { type: regex },
        { space: regex },
        { size: regex },
        { amenities: regex },
        { buildingType: regex },
        { 'location.city': regex },
        { 'location.state': regex },
        { 'location.country': regex },
        { 'location.address': regex },
        { 'location.town': regex },
        { 'rules.additionalRules': regex },
        { 'rules.houseRules.rule': regex },
        { 'directions.written': regex },
        { 'directions.parking': regex },
        { 'directions.publicTransport': regex },
        { 'directions.landmarks': regex },
        { 'photo.images.caption': regex },
        { 'photo.videos.caption': regex },
        { 'price.currency': regex },
        { 'availability.blockedDates.reason': regex },
        { 'availability.calendar.notes': regex },
        { 'availability.restrictedDays.checkIn': regex },
        { 'availability.restrictedDays.checkOut': regex },
        { 'calendarSync.googleCalendarId': regex },
      ];

      console.log('Applied $or search conditions:', query.$or);
    }

    if (filters.type) query.type = filters.type;
    if (filters.buildingType) query.buildingType = filters.buildingType;
    if (filters.space) query.space = filters.space;

    if (filters.priceRange) {
      query['price.base'] = {};
      if (filters.priceRange.min)
        query['price.base'].$gte = filters.priceRange.min;
      if (filters.priceRange.max && filters.priceRange.max !== Infinity)
        query['price.base'].$lte = filters.priceRange.max;
    }

    if (filters.location) {
      if (filters.location.city) {
        query['location.city'] = new RegExp(filters.location.city, 'i');
      }
      if (filters.location.state) {
        query['location.state'] = new RegExp(filters.location.state, 'i');
      }
      if (filters.location.country) {
        query['location.country'] = new RegExp(filters.location.country, 'i');
      }
    }

    if (filters.amenities?.length > 0) {
      query.amenities = { $all: filters.amenities };
    }

    if (filters.guests) query.guests = { $gte: parseInt(filters.guests) };
    if (filters.bedrooms) query.bedrooms = { $gte: parseInt(filters.bedrooms) };
    if (filters.isFurnished !== undefined)
      query.isFurnished = filters.isFurnished;
    if (filters.isBooked !== undefined) query.isBooked = filters.isBooked;

    console.log('filters:', filters);
    console.log('built query:', JSON.stringify(query, null, 2));

    return query;
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
        .hint({ 'location.coordinates': '2dsphere' }) // Add index hint
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

      return progress;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching progress'
      );
    }
  }
  async deleteCompletedOnboarding(userId) {
    try {
      // Find the most recent completed onboarding
      const progress = await OnboardingModel.findOneAndDelete({
        userId,
        isCompleted: true,
      }).sort({ lastUpdated: -1 }); // Sort by lastUpdated descending to get the latest one

      if (!progress) {
        throw new HttpException(
          StatusCodes.NOT_FOUND,
          'No completed onboarding found for this user'
        );
      }

      return {
        message: 'Successfully deleted the most recent completed onboarding',
      };
    } catch (error) {
      console.log(error);
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error deleting completed onboarding'
      );
    }
  }

  async postProgress(userId, data) {
    try {
      const progressData = {
        userId: userId,
        type: data.type,
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

  async bulkUpdateCalendar(propertyId, dates, type, price, reason) {
    try {
      const property = await PropertyModel.findById(propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      const validDates = dates.map((date) => new Date(date));

      validDates.forEach((date) => {
        const existingEntryIndex = property.availability.calendar.findIndex(
          (entry) =>
            entry.date.toISOString().split('T')[0] ===
            date.toISOString().split('T')[0]
        );

        if (existingEntryIndex !== -1) {
          if (type === 'block') {
            property.availability.calendar[existingEntryIndex].isBlocked = true;
            property.availability.calendar[existingEntryIndex].notes =
              reason || 'Blocked';
          } else if (type === 'pricing') {
            property.availability.calendar[existingEntryIndex].customPrice =
              price;
            property.availability.calendar[existingEntryIndex].notes =
              'Custom pricing';
          }
        } else {
          property.availability.calendar.push({
            date,
            isBlocked: type === 'block',
            customPrice: type === 'pricing' ? price : undefined,
            notes: type === 'block' ? reason || 'Blocked' : 'Custom pricing',
          });
        }
      });

      await property.save();

      return {
        message: 'Calendar updated successfully',
        updatedDates: validDates.length,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getPropertyCalendar(propertyId) {
    try {
      const property = await PropertyModel.findById(propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      const availabilityMonths =
        property.availability.availabilityWindow?.months || 12;
      const customEndDate =
        property.availability.availabilityWindow?.customEndDate;

      const start = new Date();
      let end;

      if (customEndDate) {
        end = new Date(customEndDate);
      } else {
        end = new Date(start);
        end.setMonth(start.getMonth() + availabilityMonths);
      }

      const calendarEntries = property.availability.calendar;

      const pricing = {
        basePrice: property.price.base,
        customPricing: property.price.customPricing || [],
      };

      return {
        calendar: calendarEntries,
        availabilityWindow: {
          months: availabilityMonths,
          customEndDate,
          startDate: start,
          endDate: end,
        },
        pricing,
      };
    } catch (error) {
      console.log(error);
      throw new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error.message);
      // throw new Error(error.message);
    }
  }

  /**
   * Get property revenue statistics
   */
  async getPropertyRevenueStats(propertyId, userId) {
    try {
      // Verify ownership
      const property = await PropertyModel.findOne({
        _id: propertyId,
        owner: userId,
      });

      if (!property) {
        throw new HttpException(
          StatusCodes.NOT_FOUND,
          'Property not found or unauthorized'
        );
      }

      // Get earnings for this property
      const earnings = await EarningModel.find({ property: propertyId });

      // Calculate statistics
      const stats = {
        totalEarnings: 0,
        totalBookings: 0,
        averagePerBooking: 0,
        pendingEarnings: 0,
        availableEarnings: 0,
        paidEarnings: 0,
        occupancyRate: 0, // Requires calculation based on calendar
      };

      // Process earnings
      if (earnings.length > 0) {
        stats.totalBookings = earnings.length;

        // Sum up amounts by status
        earnings.forEach((earning) => {
          stats.totalEarnings += earning.netAmount;

          switch (earning.status) {
            case 'pending':
              stats.pendingEarnings += earning.netAmount;
              break;
            case 'available':
              stats.availableEarnings += earning.netAmount;
              break;
            case 'paid':
              stats.paidEarnings += earning.netAmount;
              break;
          }
        });

        stats.averagePerBooking = stats.totalEarnings / stats.totalBookings;
      }

      // Calculate occupancy rate
      const bookings = await BookingModel.find({
        property: propertyId,
        status: { $in: ['CONFIRMED', 'COMPLETED'] },
      });

      if (bookings.length > 0) {
        // Calculate total days booked
        let totalDaysBooked = 0;
        bookings.forEach((booking) => {
          const checkIn = new Date(booking.checkIn);
          const checkOut = new Date(booking.checkOut);
          const days = (checkOut - checkIn) / (1000 * 60 * 60 * 24);
          totalDaysBooked += days;
        });

        // Assume time period is last 90 days
        stats.occupancyRate = (totalDaysBooked / 90) * 100;
      }

      return stats;
    } catch (error) {
      logger.error('Error getting property revenue stats', {
        error,
        propertyId,
      });
      throw error;
    }
  }

  async suggestPriceOptimization(propertyId, userId) {
    try {
      const property = await PropertyModel.findOne({
        _id: propertyId,
        owner: userId,
      });

      if (!property) {
        throw new HttpException(
          StatusCodes.NOT_FOUND,
          'Property not found or unauthorized'
        );
      }

      // Get bookings for this property
      const bookings = await BookingModel.find({
        property: propertyId,
        status: { $in: ['CONFIRMED', 'COMPLETED'] },
      });

      // Calculate current occupancy rate
      let currentOccupancyRate = 0;
      if (bookings.length > 0) {
        // Calculate as above
      }

      // Get nearby similar properties
      const nearbyProperties = await PropertyModel.find({
        _id: { $ne: propertyId },
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: property.location.coordinates.coordinates,
            },
            $maxDistance: 5000, // 5km radius
          },
        },
        bedrooms: { $gte: property.bedrooms - 1, $lte: property.bedrooms + 1 },
        bathrooms: {
          $gte: property.bathrooms - 1,
          $lte: property.bathrooms + 1,
        },
      });

      // Calculate average price of similar properties
      let totalPrice = 0;
      let count = 0;
      nearbyProperties.forEach((prop) => {
        totalPrice += prop.price.base;
        count++;
      });

      const averageMarketPrice =
        count > 0 ? totalPrice / count : property.price.base;

      // Suggest optimization
      let suggestedPrice = property.price.base;
      let pricingStrategy = 'maintain';

      if (
        currentOccupancyRate < 40 &&
        property.price.base > averageMarketPrice
      ) {
        // Low occupancy and price above market - suggest decrease
        suggestedPrice = Math.max(
          averageMarketPrice * 0.95,
          property.price.base * 0.9
        );
        pricingStrategy = 'decrease';
      } else if (
        currentOccupancyRate > 80 &&
        property.price.base < averageMarketPrice
      ) {
        // High occupancy and price below market - suggest increase
        suggestedPrice = Math.min(
          averageMarketPrice * 1.05,
          property.price.base * 1.1
        );
        pricingStrategy = 'increase';
      }

      return {
        currentPrice: property.price.base,
        suggestedPrice: Math.round(suggestedPrice),
        marketAverage: Math.round(averageMarketPrice),
        occupancyRate: currentOccupancyRate,
        pricingStrategy,
        potentialRevenueChange: Math.round(
          (suggestedPrice - property.price.base) * 30
        ), // monthly estimate
      };
    } catch (error) {
      logger.error('Error suggesting price optimization', {
        error,
        propertyId,
      });
      throw error;
    }
  }
}

export default PropertyService;
