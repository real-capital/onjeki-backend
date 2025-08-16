// services/search.service.js
import PropertyModel from '../../models/properties.model.js';

class SearchService {
  async searchProperties(filters, pagination, sorting = { createdAt: -1 }) {
    // Extract excludeOwnerId from filters
    const { excludeOwnerId, ...searchFilters } = filters;

    // Build the query with the remaining filters
    const query = this.buildSearchQuery(searchFilters);

    if (excludeOwnerId) {
      query.owner = { $ne: excludeOwnerId };
    }

    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    console.log('Built query:', JSON.stringify(query, null, 2));

    try {
      const [properties, total] = await Promise.all([
        PropertyModel.find(query)
          .populate({
            path: 'amenities',
            select: 'amenity _id',
          })
          .populate({
            path: 'buildingType',
            select: 'buildingType _id',
          })
          .populate('owner', 'name email')
          .sort(sorting)
          .skip(skip)
          .limit(limit)
          .lean(),
        PropertyModel.countDocuments(query),
      ]);

      return {
        properties,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: skip + properties.length < total,
        },
      };
    } catch (error) {
      throw new Error(error);
    }
  }

  buildSearchQuery(filters) {
    const query = {};

    if (filters.listStatus) {
      query.listStatus = filters.listStatus;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.priceRange) {
      query['price.base'] = {};
      if (filters.priceRange.min !== undefined) {
        query['price.base'].$gte = filters.priceRange.min;
      }
      if (filters.priceRange.max !== undefined) {
        query['price.base'].$lte = filters.priceRange.max;
      }
    }

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
            $maxDistance: filters.location.radius || 5000,
          },
        };
      } else {
        if (filters.location.city)
          query['location.city'] = new RegExp(filters.location.city, 'i');
        if (filters.location.state)
          query['location.state'] = new RegExp(filters.location.state, 'i');
        if (filters.location.address)
          query['location.address'] = new RegExp(filters.location.address, 'i');
        if (filters.location.country)
          query['location.country'] = new RegExp(filters.location.country, 'i');
      }
    }

    if (filters._id) {
      query._id = filters._id;
    }

    if (filters.amenities?.length) {
      query.amenities = { $all: filters.amenities };
    }

    if (filters.guests) query.guests = { $gte: filters.guests };
    if (filters.bedrooms) query.bedrooms = { $gte: filters.bedrooms };
    if (filters.bathrooms) query.bathrooms = { $gte: filters.bathrooms };

    if (filters.buildingType) {
      query.buildingType = filters.buildingType;
    }

    if (filters.space) {
      query.space = filters.space;
    }

    if (filters.instantBooking) query.instantBooking = filters.instantBooking;
    if (filters.isFurnished !== undefined)
      query.isFurnished = filters.isFurnished;
    if (filters.newlyCreated !== undefined)
      query.newlyCreated = filters.newlyCreated;

    if (
      filters.search &&
      typeof filters.search === 'string' &&
      filters.search.trim() !== ''
    ) {
      const regex = new RegExp(filters.search, 'i');

      query.$or = [
        { title: regex },
        { description: regex },
        { slug: regex },
        { type: regex },
        { space: regex },
        { size: regex },
        { 'location.city': regex },
        { 'location.state': regex },
        { 'location.country': regex },
        { 'location.address': regex },
        { 'location.town': regex },
        { 'location.flatOrFloor': regex },
        { 'location.postCode': regex },
        { 'rules.additionalRules': { $elemMatch: { $regex: regex } } },
        { 'rules.houseRules.rule': regex },
        { 'directions.written': regex },
        { 'directions.parking': regex },
        { 'directions.publicTransport': regex },
        { 'directions.landmarks': { $elemMatch: { $regex: regex } } },
        { 'photo.images.caption': regex },
        { 'photo.videos.caption': regex },
        { 'price.currency': regex },
        { 'availability.blockedDates.reason': regex },
        { 'availability.calendar.notes': regex },
        {
          'availability.restrictedDays.checkIn': {
            $in: [filters.search.toLowerCase()],
          },
        },
        {
          'availability.restrictedDays.checkOut': {
            $in: [filters.search.toLowerCase()],
          },
        },
      ];

      if (filters.$or && Array.isArray(filters.$or)) {
        query.$or = [...query.$or, ...filters.$or];
      }
    }

    return query;
  }
}

export default SearchService;
