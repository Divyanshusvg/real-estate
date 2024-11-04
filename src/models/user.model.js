import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const userSchema = new Schema(
    {
        userName: {
            type: String,
            required: false,

        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        userType: {
            type: String,
            required: true,
            enum: [0,1,2,3], // 0: normal 1: pro, 2: individual, 3: admin
        },
        isAdmin: {
            type: Boolean,
            default: false
        },
        password: {
            type: String,
            required: [true, 'Password is required']
        },
        refreshToken: {
            type: String
        },
        isVerified:{
            type:Boolean,
            default:true
        },
        subscriptionPlan: {
            type: Schema.Types.ObjectId,
            ref: 'SubscriptionPlan', // Make sure this matches the model name
            default:null
        },
        profilepic:{
            type: String,
            default:"/temp/1724663076256-384334.png", 
        },
        userAddress:{
            type: String,
            default:null, 
        },
        resetPasswordToken:{
            type: String,
            default:null, 
        },
        resetPasswordExpires:{
            type: Date,
            default:null, 
        },
        userPhoneNumber:{
            type: String,
            default:null, 
        },
        favorites:[{
            type: Schema.Types.ObjectId,
            ref: 'PropertyAdd' 
        }],
        properties: [{ 
            type: Schema.Types.ObjectId,
            ref: 'PropertyAdd' }],
        },
    {
        timestamps: true
    }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
    console.log('Candidate Password:', password);
    console.log('Stored Hashed Password:', this.password);

    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            fullName: this.fullName,
            userType: this.userType
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
};

userSchema.plugin(mongooseAggregatePaginate)

export const User = mongoose.model("User", userSchema);
