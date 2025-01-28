// models/building.model.js
import mongoose, { Schema, model } from 'mongoose';

const buildingSchema = new Schema(
  {
    buildingType: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const BuildingModel = model('Building', buildingSchema);

export default BuildingModel;
