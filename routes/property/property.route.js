import PropertyController from '../../controller/property/property.controller.js';

import { validate } from '../../middlewares/validation.js';
class PropertyRoute {
  constructor() {
    this.path = '/properties';
    this.router = Router();
    this.controller = new PropertyController();
    this.initializeRoute();
  }
  initializeRoute() {
    this.router.post(
      `${this.path}/create`,
      //   validateCreateProperty,
      validate,
      this.controller.createProperty
    );

    this.router.get(
      `${this.path}/`,
      //   validateCreateProperty,
      validate,
      this.controller.searchProperties
    );
    // this.router.get(
    //   `${this.path}/:id`,
    //   //   validateCreateProperty,
    //   validate,
    //   this.controller.getP
    // );
  }
}

export default PropertyRoute;
