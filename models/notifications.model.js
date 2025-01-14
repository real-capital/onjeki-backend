import mongoose, { model, Schema } from "mongoose";

const notificationSchema = new Schema({
    header: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    date: { type: Date, required: true }
});

const notificationModel = model("Notification", notificationSchema);

export default notificationModel;
