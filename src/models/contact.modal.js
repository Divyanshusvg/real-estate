import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const contactSchema = new  Schema(
    {
        userId:{
            type: Schema.Types.ObjectId,
            ref : 'User',
            required: true
        },
        userEnquiry:{
            type: String,
            required: true
        },
    }
    ,
    {
        timestamps: true,
    }
)

contactSchema.plugin(mongooseAggregatePaginate);
export const Contact = mongoose.model("Contact", contactSchema);
