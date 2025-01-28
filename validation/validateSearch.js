// middlewares/validation/property.validation.js
import { query } from 'express-validator';
import { EPurpose, EHouseSpace } from '../enum/house.enum.js';

export const validateSearchQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('type')
    .optional()
    .isIn(Object.values(EPurpose))
    .withMessage('Invalid property type'),
  
  query('space')
    .optional()
    .isIn(Object.values(EHouseSpace))
    .withMessage('Invalid space type'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),
  
  query('guests')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Guests must be a positive integer'),
  
  query('bedrooms')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Bedrooms must be a positive integer'),
  
  query('bathrooms')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Bathrooms must be a positive integer'),
  
  query('amenities')
    .optional()
    .custom((value) => {
      if (value) {
        const ids = value.split(',');
        return ids.every(id => /^[0-9a-fA-F]{24}$/.test(id));
      }
      return true;
    })
    .withMessage('Invalid amenity IDs'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'price.base', 'title'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];