// controllers/category.controller.js
import CategoryService from '../../services/category/category.service.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';

const categoryService = new CategoryService();

class CategoryController {
  async createCategory(req, res, next) {
    try {
      const category = await categoryService.createCategory(req.body);
      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllCategories(req, res, next) {
    try {
      const categories = await categoryService.getAllCategories();
      res.status(StatusCodes.OK).json({
        status: 'success',
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategoryById(req, res, next) {
    try {
      const category = await categoryService.getCategoryById(req.params.id);
      res.status(StatusCodes.OK).json({
        status: 'success',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default CategoryController;