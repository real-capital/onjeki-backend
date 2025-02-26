import { StatusCodes } from 'http-status-codes';
import RentAndSales from '../../models/rentAndSales.model.js';
import HttpException from '../../utils/exception.js';
import UploadService from '../upload/upload.service.js';

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
      const query = this.buildSearchQuery(filters);
      const skip = (pagination.page - 1) * pagination.limit;
      const [properties, total] = await Promise.all([
        RentAndSales.find(query)
          .populate('owner', 'name email phoneNumber')
          .sort(this.buildSortQuery(filters.sort))
          .skip(skip)
          .limit(pagination.limit)
          .lean(),
        RentAndSales.countDocuments(query),
      ]);

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
      throw new HttpException(
        StatusCodes.BAD_REQUEST,
        error.message || 'Error searching properties'
      );
    }
  }

  buildSearchQuery(filters) {
    const query = { status: 'AVAILABLE' };

    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.status) {
      query.status = filters.status;
    }

    // if (filters.category) {
    //   query.category = filters.category;
    // }

    if (filters.priceRange) {
      query['price.amount'] = {
        $gte: filters.priceRange.min,
        $lte: filters.priceRange.max,
      };
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
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [
              filters.location.longitude,
              filters.location.latitude,
            ],
          },
          $maxDistance: filters.location.radius || 5000, // 5km default radius
        },
      };
    }

    if (filters.features) {
      Object.entries(filters.features).forEach(([key, value]) => {
        if (value !== undefined) {
          query[`features.${key}`] = value;
        }
      });
    }

    if (filters.amenities?.length) {
      query.amenities = { $all: filters.amenities };
    }

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { 'location.address': { $regex: filters.search, $options: 'i' } },
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
