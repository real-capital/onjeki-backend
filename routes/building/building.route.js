// import { Router } from 'express';
import express from 'express';
import { Route } from '../../interfaces/route.interface.js';

import { validate } from '../../middlewares/validation.js';
import BuildingController from '../../controller/building/building.controller.js';

class BuildingRoute extends Route {
  constructor() {
    super(express.Router());
    this.path = '/buildings';
    this.controller = new BuildingController();
    this.initializeRoute();
  }

  initializeRoute() {
    this.router.get(`${this.path}`, this.controller.getAllBuildings);
    this.router.post(`${this.path}`, this.controller.createBuilding);
  }
}

export default BuildingRoute;
