// services/building.service.js
import BuildingModel from '../../models/building.model.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';

class BuildingService {
  async createBuilding(buildingData) {
    try {
      const building = new BuildingModel(buildingData);
      await building.save();
      return building;
    } catch (error) {
      throw new HttpException(
        StatusCodes.BAD_REQUEST,
        'Error creating building'
      );
    }
  }

  async getAllBuildings() {
    try {
      return await BuildingModel.find();
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching buildings'
      );
    }
  }

  async getBuildingById(buildingId) {
    try {
      const building = await BuildingModel.findById(buildingId);
      if (!building) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'Building not found');
      }
      return building;
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching building'
      );
    }
  }
}

export default BuildingService;