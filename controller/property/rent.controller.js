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
      const result = await this.parseSearchParams(req);

      if (!result || !result.filters) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: 'error',
          message: 'Invalid search parameters',
        });
      }

      const { filters, pagination, sort } = result;

      if (req.user && req.user._id) {
        filters.excludeOwnerId = req.user._id;
      }

      console.log('Parsed search parameters:', { filters, pagination, sort });

      const searchResult = await rentOrSalesService.searchRentOrSales(
        filters,
        pagination,
        sort
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: searchResult,
        metadata: {
          filters,
          pagination,
          sort,
        },
      });
    } catch (error) {
      console.error('Rent/Sales search error:', error);
      next(error);
    }
  };
  parseSearchParams = async (req) => {
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
      amenities,
      bedrooms,
      bathrooms,
      furnished,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'AVAILABLE',
      listStatus = 'Approved',
      search,
    } = req.query;

    const filters = {};

    if (listStatus) filters.listStatus = listStatus;
    if (type) filters.type = type;
    if (propertyType) filters.propertyType = propertyType;
    if (space) filters.space = space;
    if (status) filters.status = status;

    if (search) {
      filters.search = search;
    }

    if (minPrice || maxPrice) {
      filters.priceRange = {
        min: minPrice ? Number(minPrice) : undefined,
        max: maxPrice ? Number(maxPrice) : undefined,
      };
    }

    if (city || state || country) {
      filters.location = {};
      if (city) filters.location.city = city;
      if (state) filters.location.state = state;
      if (country) filters.location.country = country;
    }

    if (amenities) {
      const amenityArray = amenities.split(',').map((name) => name.trim());
      filters.amenities = amenityArray;
    }

    if (bedrooms) filters.bedrooms = Number(bedrooms);
    if (bathrooms) filters.bathrooms = Number(bathrooms);
    if (furnished !== undefined) filters.furnished = furnished === 'true';

    return {
      filters,
      pagination: { page: Number(page), limit: Number(limit) },
      sort: `${sortBy}_${sortOrder}`,
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
