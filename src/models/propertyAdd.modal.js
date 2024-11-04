import mongoose, { Schema } from "mongoose";
import { PropType } from "./propertyType.modal.js";
import { User } from "./user.model.js";
import SubCategory from "./propSubCategory.modal.js";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import moment from 'moment';
import slug from "mongoose-slug-updater"
const { defineLocale } = moment;

const propertyAddress=new Schema({
    address:{type: String,required:true},
    street:{type: String,required:true},
    streetNumber:{type: String,required:true},
    city:{type: String,required:true},
    postalCode:{type: Number,required:true},
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    location: {
        type: { type: String, enum: ['Point'], required: true },
        coordinates: {
            type: [Number],
            required: true
        }
    }
})

const sellerContact=new Schema({
    firstName:{type:String,required:true},
    lastName:{type:String,required:true},
    email:{type:String,required:true},
    phoneNumber:{type:String,required:true},
    address:{type:String,required:true},
    street:{type:String,required:true},
    streetNumber:{type:String,required:true},
    city:{type:String,required:true},
    postalCode:{type:String,required:true},
    
})

const imageSchema = new Schema({
    imageId: { type: String, required: true }
});

const videoSchema = new Schema({
    videoId: { type: String, required: true }
});


const postAdSchema = new Schema({
    //Common fields
    ownerId:{type: Schema.Types.ObjectId, ref: 'User', required: true},
    propertyType: { type: Schema.Types.ObjectId, ref: 'PropType', required: true },
    propertySubCategory:{type: Schema.Types.ObjectId, ref: 'SubCategory', required: true},
    area:{type:String,required:true},
    propertyName:{type:String,required:true},
    propertyAddress:{type: propertyAddress,required: true},
    propertySalePrice:{type: String ,required:true},
    propertyDescription:{type:String ,required:true},
    images: [imageSchema],
    videos: [videoSchema],
    slug: { type: String, slug: ["propertyName"], slugPaddingSize: 0, unique: true },
    //
    noOfBedroom:{type:String,default: null},
    noOfBathroom:{type:String,default: null},
    elevator:{type:String,default: null},
    parking:{type:String,default: null},
    garage:{type:String,default: null},
    noOfGarage:{type:String,default: null},
    areaOfGarage:{type:String,default: null},
    cellar:{type:String,default: null},
    noOfcellar:{type:String,default: null},
    areaOfcellar:{type:String,default: null},
    propertyTax:{type:String,default: null},
    yearOfConstruction:{type:String,default: null},
    condominiumFees:{type:String,default: null},
    proximityToService:{type:Array,default: null},
    Balcony:{type:String,default:null},
    noOfBalcony:{type:String,default:null},
    areaOfBalcony:{type:String,default:null},
    terrace:{type:String,default:null},
    noOfterrace:{type:String,default:null},
    areaOfterrace:{type:String,default:null},
    heatingType:{type:String,default: null},
    typeOfHeating:{type:String,default: null},
    hotWaterType:{type:String,default: null},
    typeOfhotWaterSystem:{type:String,default: null},
    garden:{type:String,default: null},
    gardenArea:{type:String,default: null},
    selleraddress:{type:sellerContact},
    floorNumber:{type:String,default: null},
    numberOfUnits:{type:String,default:null},
    numberOfFloors:{type:String,default:null},
    adjacentParking:{type:String,default:null},
    availability:{type:Date,default:null},
    lastRenovationYear:{type:String,default: null},
    lastRenovationMonth:{type:String,default: null},
    securitySystem:{type:String,default: null},
    commonEquipment:{type:Array,default: null},  //array
    centralHeating:{type:String,default: null},
    noOfRooms:{type:String,default: null},
    airConditioning:{type:String,default: null},
    specificEquipment:{type:Array,default: null},
    specificFeatures:{type:Array,default: null},
    noOfOutbuilding:{type:String,default: null},
    sizeOfOutbuilding:{type:String,default: null},
    plot:{type:String,default: null},
    areaOfPlot:{type:String,default: null},
    tower:{type:String,default: null},
    moat:{type:String,default: null},
    chapel:{type:String,default: null},
    typeOfview:{type:String,default: null},
    wineCellar:{type:String,default: null},
    areaOfWineCellar:{type:String,default: null},
    chapelOrOratory:{type:String,default: null},
    energyConsumption:{type:String,default: null},
    GreenhouseGasEmissions:{type:String,default: null},
    ggeGrade:{type:String,default: null},
    ecGrade:{type:String,default: null},
    isfeatured:{type:String,default:"0"},
    contacts:{
        type:[],
        default:null
    },
    views:{
        type:[],
        default:null
    }
}, { timestamps: true });

mongoose.plugin(slug)
propertyAddress.index({ location: '2dsphere' });
postAdSchema.plugin(mongooseAggregatePaginate)
const PropertyAdd = mongoose.model("PropertyAdd", postAdSchema);
export default PropertyAdd;