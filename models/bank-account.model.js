// models/bank-account.model.js
import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    accountName: {
      type: String,
      required: true,
      trim: true
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function(v) {
          // Nigerian bank account numbers are typically 10 digits
          return /^\d{10}$/.test(v);
        },
        message: props => `${props.value} is not a valid Nigerian bank account number!`
      }
    },
    bankCode: {
      type: String,
      required: true
    },
    bankName: {
      type: String,
      required: true
    },
    recipientCode: {
      type: String,
      sparse: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    isDefault: {
      type: Boolean,
      default: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastUsed: Date
  },
  {
    timestamps: true
  }
);

// Only allow one default account per user
bankAccountSchema.index({ user: 1, isDefault: 1 }, { 
  unique: true,
  partialFilterExpression: { isDefault: true }
});

// Create a unique index for user + account number + bank code
bankAccountSchema.index(
  { user: 1, accountNumber: 1, bankCode: 1 },
  { unique: true }
);

const BankAccountModel = mongoose.model('BankAccount', bankAccountSchema);

export default BankAccountModel;