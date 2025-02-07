// controllers/building.controller.js
import { validationResult } from 'express-validator';
import BuildingService from '../../services/building/building.service.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';

const buildingService = new BuildingService();

class BuildingController {
  async createBuilding(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      const building = await buildingService.createBuilding(req.body);
      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: building,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllBuildings(req, res, next) {
    try {
      const buildings = await buildingService.getAllBuildings();
      res.status(StatusCodes.OK).json({
        status: 'success',
        data: buildings,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBuildingById(req, res, next) {
    try {
      const building = await buildingService.getBuildingById(req.params.id);
      res.status(StatusCodes.OK).json({
        status: 'success',
        data: building,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default BuildingController;
