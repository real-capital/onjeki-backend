import mongoose from 'mongoose';

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
      type: Object, // Changed from Map to Object
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
