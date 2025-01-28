// import { Router } from 'express';
import express from 'express';
import { Route } from '../../interfaces/route.interface.js';

import { validate } from '../../middlewares/validation.js';
import CategoryController from '../../controller/category/category.controller.js';

class CategoryRoute extends Route {
  constructor() {
    super(express.Router());
    this.path = '/categories';
    this.controller = new CategoryController();
    this.initializeRoute();
  }
  initializeRoute() {
    this.router.post(`${this.path}/add`, this.controller.createCategory);
    this.router.get(`${this.path}`, this.controller.getAllCategories);
    this.router.get(`${this.path}/:id`, this.controller.getCategoryById);
  }
}

export default CategoryRoute;
