import { StatusCodes } from 'http-status-codes';
import RentOrSalesService from '../../services/property/rent.service.js';

// controllers/property.controller.js
const rentOrSalesService = new RentOrSalesService();
class RentOrSalesController {
  createRentOrSale = async (req, res, next) => {
    try {
      const propertyData = req.body;
      const userId = req.user._id;

      const property = await rentOrSalesService.createRentOrSale(
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

  getRentOrSalesById = async (req, res, next) => {
    try {
      const { id } = req.params;
      console.log('Fetching property with ID:', id);

      const property = await rentOrSalesService.getRentOrSalesById(id);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: property,
      });
    } catch (error) {
      // Let the error middleware handle it
      next(error);
    }
  };

  searchRentOrSales = async (req, res, next) => {
    try {
      // const filters = req.query;
      const { filters, pagination, sort } = this.parseSearchParams(req);

      // Add the excludeOwnerId to filters if user is logged in
      if (req.user) {
        filters.excludeOwnerId = req.user._id;
      }

      console.log('Parsed search parameters:', { filters, pagination, sort });

      const result = await rentOrSalesService.searchRentOrSales(
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
      sortBy = 'date',
      sortOrder = 'asc',
      status,
      listStatus = 'Approved',
      // isBooked,
      // isFurnished,
    } = req.query;

    const filters = {};
    const sort = `${sortBy}_${sortOrder}`;

    if (listStatus) filters.listStatus = listStatus;
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


    return {
      filters,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
      sort,
    };
  };

  getRentOrSaleAnalytics = async (req, res, next) => {
    try {
      const { propertyId } = req.params;
      const userId = req.user._id;

      const analytics = await rentOrSalesService.getRentOrSaleAnalytics(
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
