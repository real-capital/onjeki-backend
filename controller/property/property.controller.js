// controllers/property.controller.js
import { validationResult } from 'express-validator';
import PropertyService from '../../services/property/property.service.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';
import SearchService from '../../services/property/search.service.js';

const propertyService = new PropertyService();
const searchService = new SearchService();

class PropertyController {
  getProgress = async (req, res, next) => {
    try {
      const progress = await propertyService.getProgress(req.user.id);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: progress,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  };

  postProgress = async (req, res, next) => {
    console.log(req.body);
    console.log(req.user.id);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      const userId = req.user._id; // Assuming you have user info in request
      const progressData = req.body;
      const progress = await propertyService.postProgress(userId, progressData);

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  };

  completeOnboarding = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      const completed = await propertyService.completeOnboaring(req.user.id);

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: completed,
      });
    } catch (error) {
      next(error);
    }
  };

  postLastListingPath = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }
    try {
      const lastListing = await propertyService.postLastListingPath(
        req.body.listingPath,
        req.user.id
      );
      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: lastListing,
      });
    } catch (error) {
      next(error);
    }
  };

  getLastListingPath = async (req, res, next) => {
    try {
      const lastListing = await propertyService.getLastListingPath(req.user.id);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: lastListing,
      });
    } catch (error) {
      next(error);
    }
  };
  uploadImages = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      const urls = await propertyService.uploadImage(req.body, req.user.id);
      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: urls, // Ensure this contains the URLs
      });
    } catch (error) {
      next(error);
    }
  };

  createProperty = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      const property = await propertyService.createProperty(
        req.body,
        req.user.id
      );
      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: property,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllProperties = async (req, res, next) => {
    try {
      const { filters, pagination } = this.parseSearchParams(req);
      const result = await propertyService.getAllProperties(
        filters,
        pagination
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
  getPropertyById = async (req, res, next) => {
    try {
      const { id } = req.params;
      console.log('Fetching property with ID:', id);

      const property = await propertyService.getPropertyById(id);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: property,
      });
    } catch (error) {
      // Let the error middleware handle it
      next(error);
    }
  };

  getPropertyNearBy = async (req, res, next) => {
    try {
      const { latitude, longitude, radius } = req.query;
      if (!latitude || !longitude || !radius) {
        return next(
          new HttpException(
            StatusCodes.BAD_REQUEST,
            'Latitude, longitude, and radius are required.'
          )
        );
      }

      const result = await propertyService.getPropertyNearBy(
        latitude,
        longitude,
        radius
      );

      res.status(StatusCodes.OK).json(result);
    } catch (error) {
      next(error);
    }
  };

  searchProperties = async (req, res, next) => {
    try {
      console.log('Search request query:', req.query);

      const { filters, pagination, sort } = this.parseSearchParams(req);
      console.log('Parsed search parameters:', { filters, pagination, sort });

      const result = await searchService.searchProperties(
        filters,
        pagination,
        sort
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: result,
        metadata: {
          filters,
          pagination,
          sort,
        },
      });
    } catch (error) {
      console.error('Controller error:', error);
      next(error);
    }
  };

  parseSearchParams = (req) => {
    const {
      page = 1,
      limit = 10,
      type,
      buildingType,
      space,
      minPrice,
      maxPrice,
      city,
      state,
      country,
      amenities,
      guests,
      bedrooms,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      listStatus,
      isBooked,
      isFurnished,
    } = req.query;

    const filters = {};

    // Add filters only if they exist
    if (type) filters.type = type;
    if (buildingType) filters.buildingType = buildingType;
    if (space) filters.space = space;
    if (listStatus) filters.listStatus = listStatus;

    // Price range
    if (minPrice || maxPrice) {
      filters.priceRange = {
        min: minPrice ? Number(minPrice) : undefined,
        max: maxPrice ? Number(maxPrice) : undefined,
      };
    }

    // Location
    if (city || state || country) {
      filters.location = {};
      if (city) filters.location.city = city;
      if (state) filters.location.state = state;
      if (country) filters.location.country = country;
    }

    // Amenities
    if (amenities) {
      filters.amenities = amenities.split(',').map((id) => id.trim());
    }

    // Numeric filters
    if (guests) filters.guests = Number(guests);
    if (bedrooms) filters.bedrooms = Number(bedrooms);

    // Boolean filters
    if (isBooked !== undefined) filters.isBooked = isBooked === 'true';
    if (isFurnished !== undefined) filters.isFurnished = isFurnished === 'true';

    return {
      filters,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
      sort: {
        [sortBy]: sortOrder === 'asc' ? 1 : -1,
      },
    };
  };

  // export const updateAvailability = catchAsync(async (req, res, next) => {
  //   const { dates, status } = req.body;

  //   const property = await Property.findOne({
  //     _id: req.params.id,
  //     host: req.user.id
  //   });

  //   if (!property) {
  //     return next(new AppError('Property not found or unauthorized', 404));
  //   }

  //   await property.updateAvailability(dates.map(date => new Date(date)), status);

  //   res.status(200).json({
  //     status: 'success',
  //     data: { property }
  //   });
  // });
}

export default PropertyController;
