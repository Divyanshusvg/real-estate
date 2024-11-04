import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const subscriptionPlanSchema = new Schema(
  {
    planName: {
      type: String,
      required: true,
      trim: true, // Removes whitespace from the beginning and end of the string
    },
    planPrice: {
      type: String,
      required: true,
      min: [0, 'Plan price must be a positive number'], // Ensures planPrice is a positive number
    },
    anualDiscount: {
      type: String,
      default: 0, // Default value if not provided
      min: [0, 'Annual discount must be a positive number'],
    },
    planDurationInMonths: {
      type: String,
      required: true,
      min: [1, 'Plan duration must be at least 1 month'], // Ensures duration is at least 1 month
    },
    propertyAddLimit:{
      type: String,
      required:true
    }
  },
  {
    timestamps: true,
  }
);

subscriptionPlanSchema.plugin(mongooseAggregatePaginate);

export const subscriptionManagement = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
export default subscriptionManagement;
