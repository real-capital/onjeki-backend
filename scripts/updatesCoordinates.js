// scripts/updateCoordinates.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';
import PropertyModel from '../models/properties.model.js';

dotenv.config();

const updateCoordinates = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info('Connected to MongoDB');

    // Get the properties collection
    const Property = mongoose.model('Property');

    // Find all properties with coordinates
    const properties = await PropertyModel.find({
      'location.coordinates': { $exists: true }
    });

    logger.info(`Found ${properties.length} properties to update`);

    // Update each property
    for (const property of properties) {
      if (property.location?.coordinates?.coordinates) {
        const [lat, lng] = property.location.coordinates.coordinates;
        
        // Swap coordinates to [longitude, latitude]
        property.location.coordinates = {
          type: 'Point',
          coordinates: [lng, lat]
        };

        await property.save();
        logger.info(`Updated property ${property._id}`);
      }
    }

    logger.info('Finished updating coordinates');
    process.exit(0);
  } catch (error) {
    logger.error('Error updating coordinates:', error);
    process.exit(1);
  }
};

// Run the update
updateCoordinates();