import { StatusCodes } from 'http-status-codes';
import RentOrSalesService from '../../services/property/rent.service.js';

// controllers/property.controller.js
class RentOrSalesController {
  constructor() {
    this.rentOrSalesService = new RentOrSalesService();
  }

  createRentOrSale = async (req, res, next) => {
    try {
      const propertyData = req.body;
      const userId = req.user._id;

      const property = await this.rentOrSalesService.createRentOrSale(
        propertyData,
        userId
      );

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: property,
      });
    } catch (error) {
      next(error);
    }
  };

  searchRentOrSales = async (req, res, next) => {
    try {
      // const filters = req.query;
      const { filters, pagination, sort } = this.parseSearchParams(req);
      console.log('Parsed search parameters:', { filters, pagination, sort });

      const result = await this.rentOrSalesService.searchRentOrSales(
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
      next(error);
    }
  };

  parseSearchParams = (req) => {
    const {
      page = 1,
      limit = 10,
      type,
      propertyType,
      space,
      minPrice,
      maxPrice,
      city,
      state,
      country,
      // amenities,
      // guests,
      // bedrooms,
      // sortBy = 'createdAt',
      // sortOrder = 'asc',
      status,
      // listStatus = 'Approved',
      // isBooked,
      // isFurnished,
    } = req.query;

    const filters = {};

    // Add filters only if they exist
    if (type) filters.type = type;
    if (propertyType) filters.propertyType = propertyType;
    if (space) filters.space = space;
    if (status) filters.status = status;

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
    // if (amenities) {
    //   filters.amenities = amenities.split(',').map((id) => id.trim());
    // }

    // Numeric filters
    // if (guests) filters.guests = Number(guests);
    // if (bedrooms) filters.bedrooms = Number(bedrooms);

    // Boolean filters
    // if (isBooked !== undefined) filters.isBooked = isBooked === 'true';
    // if (isFurnished !== undefined) filters.isFurnished = isFurnished === 'true';
    //
    return {
      filters,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
      // sort: {
      //   [sortBy]: sortOrder === 'asc' ? 1 : -1,
      // },
    };
  };

  getRentOrSaleAnalytics = async (req, res, next) => {
    try {
      const { propertyId } = req.params;
      const userId = req.user._id;

      const analytics = await this.rentOrSalesService.getRentOrSaleAnalytics(
        propertyId,
        userId
      );

      res.json({
        status: 'success',
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default RentOrSalesController;
