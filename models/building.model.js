import mongoose, { model, Schema } from "mongoose";

const buildingSchema = new Schema({
    buildingType: {
        type: String,
        required: true,
        unique: true
    },
}, {
    timestamps: true
});

const buildingModel = model("Building", buildingSchema);

export default buildingModel;
