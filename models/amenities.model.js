import mongoose, { Schema, model } from "mongoose";

const amenitySchema = new Schema({
    amenity: {
        type: String,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    }
});

const amenityModel = model("Amenity", amenitySchema);

export default amenityModel;
