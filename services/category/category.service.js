// services/category.service.js
import CategoryModel from '../../models/category.model.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';

class CategoryService {
  async createCategory(categoryData) {
    try {
      const category = new CategoryModel(categoryData);
      await category.save();
      return category;
    } catch (error) {
      throw new HttpException(
        StatusCodes.BAD_REQUEST,
        'Error creating category'
      );
    }
  }

  async getAllCategories() {
    try {
      return await CategoryModel.find();
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching categories'
      );
    }
  }

  async getCategoryById(categoryId) {
    try {
      const category = await CategoryModel.findById(categoryId);
      if (!category) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'Category not found');
      }
      return category;
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching category'
      );
    }
  }
}

export default CategoryService;