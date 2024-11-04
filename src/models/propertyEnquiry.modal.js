import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const propertyEnquiry = new  Schema(
    {
        userId:{
            type: Schema.Types.ObjectId,
            ref : 'User',
            required: true
        },
        propertyId:{
            type: Schema.Types.ObjectId, 
            ref: 'PropertyAdd',
            required: true
        },
        propertyType: { 
            type: Schema.Types.ObjectId,
            ref: 'PropType',
            required: true 
        },
        propertySubCategory:{
            type: Schema.Types.ObjectId,
            ref: 'SubCategory',
            required: true
        },
        userEnquiry:{
            type: String,
            required: true
        },
        adminReply:{
            type: String
        },
    }
    ,
    {
        timestamps: true,
    }
)

propertyEnquiry.plugin(mongooseAggregatePaginate);
export const Enquiry = mongoose.model("Enquiry", propertyEnquiry);