import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

// requir crna cityaddress me sb ko 
const cityAddress=new Schema({
    city:{type: String,required:true},
    latitude: { type: Number,  },
    longitude: { type: Number, },
    location: {
        type: { type: String, enum: ['Point'], required: true },
        coordinates: {
            type: [Number],
            // required: true
        }
    }
})

const citySchema = new  Schema(
    {
        image:{
            type:String,
            default:null
        },
        isfeatured:{
            type:String,
            default:"0",
            required:true
        },
        locationName:{type:[cityAddress],
        required:true}
    },
    {
        timestamps: true,
    }
)

citySchema.plugin(mongooseAggregatePaginate);
export const City = mongoose.model("City", citySchema);