import mongoose, { Schema, model } from "mongoose";
import { EHouseSpace, EListStatus, EPurpose } from "../enum/house.enum"; // Assuming these enums are defined somewhere

const propertySchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    type: {
        type: String,
        enum: Object.values(EPurpose), // Assuming EPurpose is an enum
    },
    listStatus: {
        type: String,
        enum: Object.values(EListStatus), // Assuming EListStatus is an enum
    },
    buildingType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Building",
    },
    amenities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Amenity' }],
    space: {
        type: String,
        enum: Object.values(EHouseSpace), // Assuming EHouseSpace is an enum
    },
    usedCurrentLocation: { type: Boolean },
    location: {
        country: { type: String },
        streetAddress: { type: String },
        city: { type: String },
        town: { type: String },
        flatOrFloor: { type: String },
        postCode: { type: String },
        pointer: {
            latitude: { type: Number },
            longitude: { type: Number }
        }
    },
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    guests: { type: Number },
    bed: { type: Number },
    photo: { type: [Object] },
    title: { type: String },
    description: { type: String },
    instantBooking: { type: String },
    price: { type: Number },
    discount: {
        firstBooking: { type: Number },
        weekBooking: { type: Number },
        monthlyBooking: { type: Number },
        general: { type: Number },
    },
    size: { type: String, required: false },
    hasMortgage: { type: Boolean },
    isNew: { type: Boolean },
    isFurnished: { type: Boolean },
    isBooked: { type: Boolean, required: false },
}, {
    timestamps: true
});

const PropModel = model("Properties", propertySchema);

export default PropModel;
