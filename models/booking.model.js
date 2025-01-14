import mongoose, { model, Schema } from "mongoose";
import { BookingStatus } from "../enum/booking.enum"; // Assuming `BookingStatus` is an enum

const bookingSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    property: { 
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Properties'
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: Object.values(BookingStatus) // Assuming `BookingStatus` is an enum
    },
    totalPrice: {
        type: Number,
        required: true
    }
});

const BookingModel = model("Booking", bookingSchema);

export default BookingModel;
