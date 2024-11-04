import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const propSubCategory = new  Schema(
    {
        name:{
            type:String,
            required:true,
            unique: true
        },
        category:{
            type: Schema.Types.ObjectId,
            ref: 'PropType',
            required:true
        },
        status:{
            type:Number,
            required:true
        }
    }
    ,
    {
        timestamps: true,
    }
)

propSubCategory.plugin(mongooseAggregatePaginate);
export const SubCategory = mongoose.model("SubCategory", propSubCategory);
export default SubCategory;
