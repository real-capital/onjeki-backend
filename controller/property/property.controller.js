// controllers/property.controller.js
import { validationResult } from 'express-validator';
import PropertyService from '../../services/property.service.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';

const propertyService = new PropertyService();

class PropertyController {
  constructor() {
    this.propertyService = new PropertyService();
  }
  async createProperty(req, res, next) {
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
  }

  async searchProperties(req, res, next) {
    try {
      const { filters, pagination } = this.parseSearchParams(req);
      const result = await this.propertyService.searchProperties(
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
  }

  parseSearchParams(req) {
    const {
      page = 1,
      limit = 10,
      type,
      buildingType,
      space,
      minPrice,
      maxPrice,
      city,
      country,
      amenities,
      guests,
      bedrooms,
      ...rest
    } = req.query;

    const filters = {
      ...rest,
    };

    if (type) filters.type = type;
    if (buildingType) filters.buildingType = buildingType;
    if (space) filters.space = space;
    if (minPrice || maxPrice) {
      filters.priceRange = {
        min: minPrice ? Number(minPrice) : 0,
        max: maxPrice ? Number(maxPrice) : Infinity,
      };
    }
    if (city || country) {
      filters.location = {
        ...(city && { city }),
        ...(country && { country }),
      };
    }
    if (amenities) {
      filters.amenities = amenities.split(',');
    }
    if (guests) filters.guests = Number(guests);
    if (bedrooms) filters.bedrooms = Number(bedrooms);

    return {
      filters,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
    };
  }
}

export default PropertyController;
