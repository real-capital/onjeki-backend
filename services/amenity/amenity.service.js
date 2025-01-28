// services/amenity.service.js
import AmenityModel from '../../models/amenities.model.js';
import CategoryModel from '../../models/category.model.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';

class AmenityService {
  async createAmenity(amenityData) {
    try {
      // Check if the category exists
      const categoryExists = await CategoryModel.exists({ _id: amenityData.category });
      if (!categoryExists) {
        throw new HttpException(StatusCodes.BAD_REQUEST, 'Category does not exist');
      }

      const amenity = new AmenityModel(amenityData);
      await amenity.save();
      return amenity;
    } catch (error) {
      throw new HttpException(
        StatusCodes.BAD_REQUEST,
        error.message || 'Error creating amenity'
      );
    }
  }

  async getAllAmenities() {
    try {
      return await AmenityModel.find().populate('category');
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching amenities'
      );
    }
  }

  async getAmenityById(amenityId) {
    try {
      const amenity = await AmenityModel.findById(amenityId).populate('category');
      if (!amenity) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'Amenity not found');
      }
      return amenity;
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching amenity'
      );
    }
  }
}

export default AmenityService;