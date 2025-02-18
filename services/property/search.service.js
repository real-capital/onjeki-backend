// services/search.service.js
import PropertyModel from '../../models/properties.model.js';
// import { EPurpose } from '../enum/house.enum.js';

class SearchService {
  async searchProperties(filters, pagination, sorting = { createdAt: -1 }) {
    const query = this.buildSearchQuery(filters);
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    try {
      const [properties, total] = await Promise.all([
        PropertyModel.find(query)
          .populate('amenities')
          .populate('buildingType')
          .populate('owner', 'name email')
          .skip(skip)
          .limit(limit)
          .sort(sorting),
        PropertyModel.countDocuments(query),
      ]);

      return {
        properties,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(error);
    }
  }

  buildSearchQuery(filters) {
    const query = {};

    // Purpose filter (Layover, Rent, Sale)
    if (filters.listStatus) {
      query.listStatus = filters.listStatus;
    }
    if (filters.type) {
      query.type = filters.type;
    }

    // Price range filter
    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = filters.minPrice;
      if (filters.maxPrice) query.price.$lte = filters.maxPrice;
    }

    // Location filter
    if (filters.location) {
      if (filters.location.coordinates) {
        query['location.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [
                filters.location.coordinates.longitude,
                filters.location.coordinates.latitude,
              ],
            },
            $maxDistance: filters.location.radius || 5000, // 5km default radius
          },
        };
      } else {
        if (filters.location.city)
          query['location.city'] = new RegExp(filters.location.city, 'i');
        if (filters.location.country)
          query['location.country'] = new RegExp(filters.location.country, 'i');
      }
    }

    // Amenities filter
    if (filters.amenities?.length) {
      query.amenities = { $all: filters.amenities };
    }

    // Capacity filters
    if (filters.guests) query.guests = { $gte: filters.guests };
    if (filters.bedrooms) query.bedrooms = { $gte: filters.bedrooms };
    if (filters.bathrooms) query.bathrooms = { $gte: filters.bathrooms };

    // Property type filter
    if (filters.buildingType) {
      query.buildingType = filters.buildingType;
    }

    // Space type filter
    if (filters.space) {
      query.space = filters.space;
    }

    // Additional filters
    if (filters.instantBooking) query.instantBooking = filters.instantBooking;
    if (filters.isFurnished !== undefined)
      query.isFurnished = filters.isFurnished;
    if (filters.isNew !== undefined) query.isNew = filters.isNew;

    return query;
  }
}

export default SearchService;
