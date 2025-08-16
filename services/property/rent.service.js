import { StatusCodes } from 'http-status-codes';
import RentAndSales from '../../models/rentAndSales.model.js';
import HttpException from '../../utils/exception.js';
import UploadService from '../upload/upload.service.js';
import mongoose from 'mongoose';

// services/property.service.js

const uploadService = new UploadService();

class RentOrSalesService {
  async createRentOrSale(propertyData, userId) {
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

      // Create property with uploaded image URLs
      const property = new RentAndSales({
        ...propertyData,
        owner: userId,
        status: 'AVAILABLE',
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

  async getRentOrSalesById(propertyId) {
    try {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(propertyId)) {
        throw new HttpException(StatusCodes.BAD_REQUEST, 'Invalid property ID');
      }

      const property = await RentAndSales.findById(propertyId)
        .populate('owner', '_id name email phoneNumber')
        .lean();

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

  async searchRentOrSales(filters, pagination, sort) {
    try {
      console.log('Received filters:', filters);
      console.log('Pagination:', pagination);
      console.log('Sort:', sort);
      const { excludeOwnerId, ...searchFilters } = filters;
      const query = this.buildSearchQuery(searchFilters);

      if (excludeOwnerId) {
        query.owner = { $ne: excludeOwnerId };
      }
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;
      const sortQuery = this.buildSortQuery(sort);
      // const skip = (pagination.page - 1) * pagination.limit;
      const [properties, total] = await Promise.all([
        RentAndSales.find(query)
          .populate('owner', 'name email phoneNumber')
          .sort(sortQuery)
          .skip(skip)
          .limit(limit)
          .lean(),
        RentAndSales.countDocuments(query),
      ]);

      return {
        properties,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: skip + properties.length < total,
        },
      };
    } catch (error) {
      throw new HttpException(
        StatusCodes.BAD_REQUEST,
        error.message || 'Error searching properties'
      );
    }
  }

  // Update your buildSearchQuery method in rent/sales service
  buildSearchQuery(filters) {
    const query = { status: 'AVAILABLE' };

    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.listStatus) {
      query.listStatus = filters.listStatus;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.propertyType) {
      query.propertyType = filters.propertyType;
    }

    if (filters.priceRange) {
      query['price.amount'] = {};
      if (filters.priceRange.min !== undefined) {
        query['price.amount'].$gte = filters.priceRange.min;
      }
      if (filters.priceRange.max !== undefined) {
        query['price.amount'].$lte = filters.priceRange.max;
      }
    }

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

    if (filters.bedrooms) {
      query['features.bedrooms'] = { $gte: filters.bedrooms };
    }
    if (filters.bathrooms) {
      query['features.bathrooms'] = { $gte: filters.bathrooms };
    }
    if (filters.furnished !== undefined) {
      query['features.furnished'] = filters.furnished;
    }

    if (filters.amenities?.length) {
      query.amenities = { $all: filters.amenities };
    }

    if (filters.search) {
      const regex = new RegExp(filters.search, 'i');
      query.$or = [
        { title: regex },
        { description: regex },
        { 'location.address': regex },
        { 'location.city': regex },
        { 'location.state': regex },
        { 'location.country': regex },
      ];
    }

    return query;
  }
  buildSortQuery(sort) {
    switch (sort) {
      case 'price_asc':
        return { 'price.amount': 1 };
      case 'price_desc':
        return { 'price.amount': -1 };
      case 'date_desc':
        return { createdAt: -1 };
      case 'date_asc':
        return { createdAt: 1 };
      case 'asc':
        return { createdAt: 1 };
      default:
        return { createdAt: -1 };
    }
  }

  async getRentOrSaleAnalytics(propertyId, userId) {
    try {
      const property = await RentAndSales.findOne({
        _id: propertyId,
        owner: userId,
      });

      if (!property) {
        throw new HttpException(
          StatusCodes.NOT_FOUND,
          'Property not found or unauthorized'
        );
      }

      const analytics = {
        views: property.views,
        inquiries: await InquiryModel.countDocuments({ property: propertyId }),
        favorited: await WishlistModel.countDocuments({
          'properties.property': propertyId,
        }),
        viewsOverTime: await this.getViewsOverTime(propertyId),
        popularityScore: await this.calculatePopularityScore(propertyId),
      };

      return analytics;
    } catch (error) {
      throw new HttpException(
        StatusCodes.BAD_REQUEST,
        error.message || 'Error getting property analytics'
      );
    }
  }

  async getViewsOverTime(propertyId) {
    // Implement view tracking over time
    const viewsLog = await PropertyViewModel.aggregate([
      { $match: { property: propertyId } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return viewsLog;
  }

  async calculatePopularityScore(propertyId) {
    const property = await RentAndSales.findById(propertyId);
    const inquiryCount = await InquiryModel.countDocuments({
      property: propertyId,
    });
    const wishlistCount = await WishlistModel.countDocuments({
      'properties.property': propertyId,
    });

    // Calculate score based on various factors
    const score =
      property.views * 0.3 + inquiryCount * 0.4 + wishlistCount * 0.3;

    return score;
  }
}

export default RentOrSalesService;
