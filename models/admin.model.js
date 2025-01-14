import mongoose, { model, Schema } from "mongoose";
import bcrypt from "bcrypt";
import { ERole } from "../enum/role.enum"; // Assuming `ERole` is an enum

const adminSchema = new Schema({
    first_name: {
        type: String,
        required: true,
    },
    last_name: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    profile_pic: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    role: {
        type: String,
        enum: Object.values(ERole) // Assuming `ERole` is an enum
    }
});

// Hash the password before saving if it's modified
adminSchema.pre('save', async function (next) {
    if (!this.isModified("password")) next();
    if (this.password) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
});

// Method to check if password matches
adminSchema.methods.isPasswordMatch = async function (password) {
    return await bcrypt.compare(password, this.password);
};

const AdminModel = model("admin", adminSchema);

export default AdminModel;
