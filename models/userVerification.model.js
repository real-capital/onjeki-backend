import mongoose from 'mongoose';

const userVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    verificationMethod: {
      type: String,
      enum: ['manual', 'document', 'self_declaration'],
      default: 'self_declaration',
    },
    legalNameVerification: {
      isVerified: {
        type: Boolean,
        default: false,
      },
      verifiedAt: Date,
      method: {
        type: String,
        enum: ['manual', 'document', 'self_declaration'],
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    addressVerification: {
      isVerified: {
        type: Boolean,
        default: false,
      },
      verifiedAt: Date,
      method: {
        type: String,
        enum: ['manual', 'document', 'self_declaration'],
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    phoneVerification: {
      isVerified: {
        type: Boolean,
        default: false,
      },
      verifiedAt: Date,
    },
    verificationDocuments: [
      {
        type: {
          type: String,
          enum: ['legal_name', 'address', 'identity'],
        },
        documentType: String,
        documentNumber: String,
        documentImageUrl: String,
        issuedBy: String,
        expiryDate: Date,
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'partially_verified', 'fully_verified', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);



const UserVerification = mongoose.model(
  'UserVerification',
  userVerificationSchema
);

export default UserVerification;
