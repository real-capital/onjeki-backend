// controllers/amenity.controller.js
import AmenityService from '../../services/amenity/amenity.service.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';

const amenityService = new AmenityService();

class AmenityController {
  async createAmenity(req, res, next) {
    try {
      const amenity = await amenityService.createAmenity(req.body);
      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: amenity,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllAmenities(req, res, next) {
    try {
      const amenities = await amenityService.getAllAmenities();
      res.status(StatusCodes.OK).json({
        status: 'success',
        data: amenities,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAmenityById(req, res, next) {
    try {
      const amenity = await amenityService.getAmenityById(req.params.id);
      res.status(StatusCodes.OK).json({
        status: 'success',
        data: amenity,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AmenityController;