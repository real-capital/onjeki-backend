// controllers/property.controller.js
import { validationResult } from 'express-validator';
import PropertyService from '../../services/property/property.service.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';
import SearchService from '../../services/property/search.service.js';
import PropertyModel from '../../models/properties.model.js';
import UserModel from '../../models/user.model.js';
import amenityModel from '../../models/amenities.model.js';
import BuildingModel from '../../models/building.model.js';

const propertyService = new PropertyService();
const searchService = new SearchService();

class PropertyController {
  getProgress = async (req, res, next) => {
    try {
      const progress = await propertyService.getProgress(req.user.id);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: progress,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  };
  deleteCompletedOnboarding = async (req, res, next) => {
    try {
      const progress = await propertyService.deleteCompletedOnboarding(
        req.user.id
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: progress,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  };

  postProgress = async (req, res, next) => {
    console.log(req.body);
    console.log(req.user.id);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      const userId = req.user._id; // Assuming you have user info in request
      const progressData = req.body;
      const progress = await propertyService.postProgress(userId, progressData);

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  };

  completeOnboarding = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      const completed = await propertyService.completeOnboaring(req.user.id);

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: completed,
      });
    } catch (error) {
      next(error);
    }
  };

  postLastListingPath = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }
    try {
      const lastListing = await propertyService.postLastListingPath(
        req.body.listingPath,
        req.user.id
      );
      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: lastListing,
      });
    } catch (error) {
      next(error);
    }
  };

  getLastListingPath = async (req, res, next) => {
    try {
      const lastListing = await propertyService.getLastListingPath(req.user.id);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: lastListing,
      });
    } catch (error) {
      next(error);
    }
  };
  uploadImages = async (req, res, next) => {
    console.log(req.files.locals);
    if (!req.files) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'No files uploaded',
      });
    }
    console.log('req');
    console.log(req.user.id);
    console.log(req.files);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      const urls = await propertyService.uploadImage(req.files, req.user.id);
      res.status(StatusCodes.CREATED).json({
        urls: urls,
      });
    } catch (error) {
      next(error);
    }
  };

  createProperty = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpException(StatusCodes.BAD_REQUEST, errors.array()));
    }

    try {
      const userId = req.user.id;

      // Fetch user details (assuming you store plan info in the User model)
      const user = await UserModel.findById(userId);

      if (!user) {
        return next(new HttpException(StatusCodes.NOT_FOUND, 'User not found'));
      }

      // Fetch the number of listings created by the user
      const userListingsCount = await PropertyModel.countDocuments({
        owner: userId,
      });

      // Restrict based on plan
      if (user.plan === 'basic' && userListingsCount >= 1) {
        return next(
          new HttpException(
            StatusCodes.UPGRADE_REQUIRED,
            'You have reached your listing limit. Upgrade to Premium or Enterprise to add more listings.'
          )
        );
      }
      const property = await propertyService.createProperty(
        req.body,
        req.user.id
      );
      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: property,
      });
    } catch (error) {
      next(error);
    }
  };

  async updateProperty(req, res, next) {
    console.log(req.body);
    try {
      const propertyId = req.params.id;
      const userId = req.user.id;
      const updateData = req.body;

      const updatedProperty = await propertyService.updateProperty(
        propertyId,
        userId,
        updateData
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: updatedProperty,
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadImagestoProperty(req, res, next) {
    try {
      const propertyId = req.params.id;
      const userId = req.user.id;
      const files = req.files;

      if (!files || files.length === 0) {
        throw new HttpException(StatusCodes.BAD_REQUEST, 'No images provided');
      }

      const newImages = await propertyService.uploadPropertyImages(
        propertyId,
        userId,
        files
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: {
          images: newImages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteImage(req, res, next) {
    try {
      const { propertyId, imageId } = req.params;
      const userId = req.user.id;

      await propertyService.deletePropertyImage(propertyId, userId, imageId);

      res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'Image deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async setPrimaryImage(req, res, next) {
    try {
      // console.log(req.params);
      const { id, imageId } = req.params;
      const userId = req.user.id;

      const updatedProperty = await propertyService.setPrimaryImage(
        id,
        userId,
        imageId
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: updatedProperty,
      });
    } catch (error) {
      next(error);
    }
  }



  getListingByuser = async (req, res, next) => {
    try {
      const userId = req.user.id; // Get the logged-in user ID

      // Fetch properties where the user is the owner
      const properties = await propertyService.getListingByuser(userId);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: properties,
      });
    } catch (error) {
      next(error);
    }
  };
  getRentByUser = async (req, res, next) => {
    try {
      const userId = req.user.id; // Get the logged-in user ID

      // Fetch properties where the user is the owner
      const properties = await propertyService.getPropertiesByUser(userId);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: properties,
      });
    } catch (error) {
      next(error);
    }
  };
  getSaleByUser = async (req, res, next) => {
    try {
      const userId = req.user.id; // Get the logged-in user ID

      // Fetch properties where the user is the owner
      const properties = await propertyService.getSaleByUser(userId);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: properties,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllProperties = async (req, res, next) => {
    try {
      const { filters, pagination } = this.parseSearchParams(req);
      const result = await propertyService.getAllProperties(
        filters,
        pagination
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
  getAllListingsInProgress = async (req, res, next) => {
    try {
      // const { pagination } = req.query;
      const userId = req.user.id;
      const result = await propertyService.getAllListingInProgress(userId);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
  getPropertyById = async (req, res, next) => {
    try {
      const { id } = req.params;
      console.log('Fetching property with ID:', id);

      const property = await propertyService.getPropertyById(id);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: property,
      });
    } catch (error) {
      // Let the error middleware handle it
      next(error);
    }
  };

  getPropertyNearBy = async (req, res, next) => {
    try {
      const { latitude, longitude, radius } = req.query;
      if (!latitude || !longitude || !radius) {
        return next(
          new HttpException(
            StatusCodes.BAD_REQUEST,
            'Latitude, longitude, and radius are required.'
          )
        );
      }

      const result = await propertyService.getPropertyNearBy(
        latitude,
        longitude,
        radius
      );

      res.status(StatusCodes.OK).json(result);
    } catch (error) {
      next(error);
    }
  };

  searchProperties = async (req, res, next) => {
    try {
      console.log('Search request query:', req.query);

      const { filters, pagination, sort } = await this.parseSearchParams(req);

      // Add the excludeOwnerId to filters if user is logged in
      if (req.user) {
        filters.excludeOwnerId = req.user._id;
      }

      console.log('Parsed search parameters:', { filters, pagination, sort });

      const result = await searchService.searchProperties(
        filters,
        pagination,
        sort
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: result,
        metadata: {
          filters,
          pagination,
          sort,
        },
      });
    } catch (error) {
      console.error('Controller error:', error);
      next(error);
    }
  };

  parseSearchParams = async (req) => {
    const {
      page = 1,
      limit = 10,
      type,
      buildingType,
      space,
      minPrice,
      maxPrice,
      city,
      state,
      country,
      amenities,
      guests,
      bedrooms,
      sortBy = 'createdAt',
      sortOrder = 'asc',
      listStatus,
      isBooked,
      isFurnished,
      search, // ✅ your search query
    } = req.query;

    const filters = {};
    if (listStatus) filters.listStatus = listStatus;

    if (type) filters.type = type;
    if (space) filters.space = space;
    if (listStatus) filters.listStatus = listStatus;
   
    if (search) {
      filters.search = search; 

      console.log('Searching for:', search);


      const matchingAmenities = await amenityModel
        .find({
          amenity: new RegExp(search, 'i'),
        })
        .select('_id amenity');

      console.log('Matching amenities:', matchingAmenities);

     
      const matchingBuildingTypes = await BuildingModel.find({
        buildingType: new RegExp(search, 'i'),
      }).select('_id buildingType');

      console.log('Matching building types:', matchingBuildingTypes);


      if (matchingAmenities.length > 0 || matchingBuildingTypes.length > 0) {
     
        filters.$or = filters.$or || [];

        if (matchingAmenities.length > 0) {
          const amenityIds = matchingAmenities.map((doc) => doc._id);
          filters.$or.push({ amenities: { $in: amenityIds } });
          console.log('Added amenity IDs to $or:', amenityIds);
        }


        if (matchingBuildingTypes.length > 0) {
          const buildingTypeIds = matchingBuildingTypes.map((doc) => doc._id);
          filters.$or.push({ buildingType: { $in: buildingTypeIds } });
          console.log('Added building type IDs to $or:', buildingTypeIds);
        }
      }
    }
    if (minPrice || maxPrice) {
      filters.priceRange = {
        min: minPrice ? Number(minPrice) : undefined,
        max: maxPrice ? Number(maxPrice) : undefined,
      };
    }

    if (city || state || country) {
      filters.location = {};
      if (city) filters.location.city = city;
      if (state) filters.location.state = state;
      if (country) filters.location.country = country;
    }

    // if (amenities) {
    //   filters.amenities = amenities.split(',').map((id) => id.trim());
    // }
    // ✅ Resolve amenity names to ObjectIds
    if (amenities) {
      const amenityNames = amenities.split(',').map((name) => name.trim());
      const amenityDocs = await amenityModel
        .find({
          amenity: { $in: amenityNames },
        })
        .select('_id');

      const amenityIds = amenityDocs.map((doc) => doc._id);

      // ❗ Return no matches if no amenities found
      if (amenityIds.length !== amenityNames.length) {
        // Include a dummy filter that guarantees no matches
        filters._id = { $exists: false };
      } else {
        filters.amenities = amenityIds;
      }
    }

    // Backend code (for reference)
    if (buildingType) {
      const buildingTypeDoc = await BuildingModel.findOne({
        buildingType: buildingType,
      });

      if (buildingTypeDoc) {
        filters.buildingType = buildingTypeDoc._id;
      } else {
        // Optional: handle not found case
        filters._id = { $exists: false }; // Force no results
      }
    }

    if (guests) filters.guests = Number(guests);
    if (bedrooms) filters.bedrooms = Number(bedrooms);
    if (isBooked !== undefined) filters.isBooked = isBooked === 'true';
    if (isFurnished !== undefined) filters.isFurnished = isFurnished === 'true';

    return {
      filters,
      pagination: { page: Number(page), limit: Number(limit) },
      sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 },
    };
  };

  async bulkUpdateCalendar(req, res) {
    try {
      const { propertyId } = req.params;
      const { dates, type, price, reason } = req.body;

      const result = await propertyService.bulkUpdateCalendar(
        propertyId,
        dates,
        type,
        price,
        reason
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error('Calendar update error:', error);
      return res
        .status(500)
        .json({ message: 'Failed to update calendar', error: error.message });
    }
  }
  async getPropertyCalendar(req, res) {
    try {
      const { propertyId } = req.params;
      const result = await propertyService.getPropertyCalendar(propertyId);

      return res.status(200).json(result);
    } catch (error) {
      console.error('Get calendar error:', error);
      return res
        .status(500)
        .json({ message: 'Failed to fetch calendar', error: error.message });
    }
  }
}

export default PropertyController;
