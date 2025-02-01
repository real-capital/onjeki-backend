const mongoose = require('mongoose');

const OnboardingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    currentStep: {
      type: String,
      required: true,
    },
    formData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const OnboardingModel = mongoose.model('Onboarding', OnboardingSchema);
export default OnboardingModel;
