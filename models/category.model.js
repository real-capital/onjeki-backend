import mongoose, { model, Schema } from "mongoose";

const categorySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    }
});

const CategoryModel = model("Category", categorySchema);

export default CategoryModel;
