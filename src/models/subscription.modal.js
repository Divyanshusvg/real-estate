import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const subscriptionSchema = new Schema(
  {
    subscriptionType: {
      type: Schema.Types.ObjectId,
      ref: 'subscriptionManagement',
      required: true,// Define possible subscription types
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    months: {
      type: String,
      default: null,
    }
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.plugin(mongooseAggregatePaginate);

export const SubscriptionModel = mongoose.model("Subscription", subscriptionSchema);
export default SubscriptionModel;
