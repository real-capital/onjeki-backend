// controllers/property.controller.js
import { validationResult } from 'express-validator';
import PropertyService from '../../services/property/property.service.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';
import SearchService from '../../services/property/search.service.js';

const propertyService = new PropertyService();
const searchService = new SearchService();

class PropertyController {
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

  // getPropertyNearBy = async (req, res, next) => {
  //   const errors = validationResult(req);
  //   if (!errors.isEmpty()) {
  //     return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
  //   }

  //   try {
  //     const { latitude, longitude, radius } = req.query;

  //     if (!latitude || !longitude || !radius) {
  //       return next(
  //         new HttpException(
  //           StatusCodes.BAD_REQUEST,
  //           'Latitude, longitude, and radius are required.'
  //         )
  //       );
  //     }

  //     const properties = await propertyService.getPropertyNearBy(
  //       latitude,
  //       longitude,
  //       radius
  //     );

  //     res.status(StatusCodes.OK).json({
  //       status: 'success',
  //       data: properties,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // };

  // searchProperties = async (req, res, next) => {
  //   try {
  //     const { filters, pagination } = this.parseSearchParams(req);
  //     const result = await searchService.searchProperties(filters, pagination);

  //     res.status(StatusCodes.OK).json({
  //       status: 'success',
  //       data: result,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // };

  // parseSearchParams = (req) => {
  //   const {
  //     page = 1,
  //     limit = 10,
  //     type,
  //     buildingType,
  //     space,
  //     minPrice,
  //     maxPrice,
  //     city,
  //     country,
  //     amenities,
  //     guests,
  //     bedrooms,
  //     ...rest
  //   } = req.query;

  //   const filters = {
  //     ...rest,
  //   };

  //   if (type) filters.type = type;
  //   if (buildingType) filters.buildingType = buildingType;
  //   if (space) filters.space = space;
  //   if (minPrice || maxPrice) {
  //     filters.priceRange = {
  //       min: minPrice ? Number(minPrice) : 0,
  //       max: maxPrice ? Number(maxPrice) : Infinity,
  //     };
  //   }
  //   if (city || country) {
  //     filters.location = {
  //       ...(city && { city }),
  //       ...(country && { country }),
  //     };
  //   }
  //   if (amenities) {
  //     filters.amenities = amenities.split(',');
  //   }
  //   if (guests) filters.guests = Number(guests);
  //   if (bedrooms) filters.bedrooms = Number(bedrooms);

  //   return {
  //     filters,
  //     pagination: {
  //       page: Number(page),
  //       limit: Number(limit),
  //     },
  //   };
  // };

  // searchProperties = async (req, res, next) => {
  //   try {
  //     const { filters, pagination, sort } = this.parseSearchParams(req);
  //     console.log('Search Filters:', filters);

  //     const result = await searchService.searchProperties(filters, pagination, sort);

  //     res.status(StatusCodes.OK).json({
  //       status: 'success',
  //       data: result,
  //       metadata: {
  //         filters,
  //         pagination,
  //         sort
  //       }
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // };

  // parseSearchParams = (req) => {
  //   const {
  //     page = 1,
  //     limit = 10,
  //     type,
  //     buildingType,
  //     space,
  //     minPrice,
  //     maxPrice,
  //     city,
  //     country,
  //     state,
  //     amenities,
  //     guests,
  //     bedrooms,
  //     bathrooms,
  //     sortBy = 'createdAt',
  //     sortOrder = 'desc',
  //     isActive,
  //     isBooked,
  //     isFurnished,
  //     ...rest
  //   } = req.query;

  //   // Validate pagination parameters
  //   const validatedPage = Math.max(1, parseInt(page));
  //   const validatedLimit = Math.min(100, Math.max(1, parseInt(limit)));

  //   const filters = {};

  //   // Basic filters
  //   if (type) filters.type = type;
  //   if (buildingType) filters.buildingType = buildingType;
  //   if (space) filters.space = space;

  //   // Price range
  //   if (minPrice || maxPrice) {
  //     filters['price.base'] = {};
  //     if (minPrice) filters['price.base'].$gte = Number(minPrice);
  //     if (maxPrice) filters['price.base'].$lte = Number(maxPrice);
  //   }

  //   // Location
  //   if (city || state || country) {
  //     if (city) filters['location.city'] = new RegExp(city, 'i');
  //     if (state) filters['location.state'] = new RegExp(state, 'i');
  //     if (country) filters['location.country'] = new RegExp(country, 'i');
  //   }

  //   // Amenities
  //   if (amenities) {
  //     const amenityArray = amenities.split(',').map(id => id.trim());
  //     filters.amenities = { $all: amenityArray };
  //   }

  //   // Numeric filters
  //   if (guests) filters.guests = { $gte: Number(guests) };
  //   if (bedrooms) filters.bedrooms = { $gte: Number(bedrooms) };
  //   if (bathrooms) filters.bathrooms = { $gte: Number(bathrooms) };

  //   // Boolean filters
  //   if (isActive !== undefined) filters['availability.isActive'] = isActive === 'true';
  //   if (isBooked !== undefined) filters.isBooked = isBooked === 'true';
  //   if (isFurnished !== undefined) filters.isFurnished = isFurnished === 'true';

  //   // Additional filters from rest
  //   Object.entries(rest).forEach(([key, value]) => {
  //     if (value !== undefined && value !== '') {
  //       filters[key] = value;
  //     }
  //   });

  //   // Sorting
  //   const sort = {
  //     [sortBy]: sortOrder.toLowerCase() === 'asc' ? 1 : -1
  //   };

  //   return {
  //     filters,
  //     pagination: {
  //       page: validatedPage,
  //       limit: validatedLimit,
  //     },
  //     sort
  //   };
  // };

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
}

export default PropertyController;
