import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const propertyTypeSchema = new  Schema(
    {
        name:{
            type:String,
            required:true,
            unique: true
        },
        status:{
            type:String,
            require:true
        }
    }
    ,
    {
        timestamps: true,
    }
)

propertyTypeSchema.plugin(mongooseAggregatePaginate);
export const PropType = mongoose.model("PropType", propertyTypeSchema);
