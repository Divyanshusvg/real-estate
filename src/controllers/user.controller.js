import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { buildPipeline } from "../utils/buildingPipeLine.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import otpService from "../utils/OtpServices.js";
import PropertyAdd from "../models/propertyAdd.modal.js";
import { PropType } from "../models/propertyType.modal.js";
import { sendEmail } from "../utils/emailService.js";
import {Enquiry} from "../models/propertyEnquiry.modal.js";
import { Contact } from "../models/contact.modal.js";
import bcrypt from "bcrypt";
import crypto from "crypto"

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { userName, email, password, userType } = req.body;
  if (
    [userName, email, password, userType].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    return res
      .status(400)
      .json(
        new ApiError(409, "All fields are required", [
          "All fields are required",
        ])
      );
    // throw new ApiError(400, "All fields are required");
  }
  const existedUser = await User.findOne({ $or: [{ email }] });
  if (existedUser) {
    // throw new ApiError(409, "User with email  already exists");
    return res
      .status(409)
      .json(
        new ApiError(409, "User with email already exists", [
          "User with email already exists",
        ])
      );
  }
  const user = await User.create({
    userName,
    email,
    password,
    userType,
  });
  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -isVerified -isAdmin"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res
      .status(400)
      .json(
        new ApiError(400, "username or email is required", [
          "username or email is required",
        ])
      );
  }
  const user = await User.findOne({
    $or: [{ email }],
  });

  if (!user) {
    return res
      .status(404)
      .json(new ApiError(404, "User does not exist", ["User does not exist"]));
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    return res
      .status(401)
      .json(
        new ApiError(401, "Invalid user credentials", [
          "Invalid user credentials",
        ])
      );
  }
  if (!user.isVerified) {
    return res
      .status(403)
      .json(
        new ApiError(403, "Account is not verified", [
          "Account is not verified",
        ])
      );
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    return new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user;
  const userData = await User.findById({ _id: user._id });
  return res
    .status(200)
    .json(new ApiResponse(200, userData, "User fetched successfully"));
});

// const updateAccountDetails = asyncHandler(async (req, res) => {
//     const { fullName, email , profileImage ,phone_no ,address } = req.body

//     const user = await User.findByIdAndUpdate(
//         req.user?._id,
//         {
//             $set: {
//                 fullName:fullName,
//                 email: email,
//                 profileImage:profileImage,
//                 phone_no:phone_no,
//                 address:address
//             }
//         },
//         { new: true }

//     ).select("-password")

//     return res
//         .status(200)
//         .json(new ApiResponse(200, user, "Account details updated successfully"))
// });

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'No files were uploaded.');
  }
  
  // Generate URLs for each uploaded file
  const fileUrls = req.files.map(file => `/temp/${file.filename}`);

  return res.status(200).json(new ApiResponse(200, fileUrls, 'Images uploaded successfully'));
});

const uploadVideos = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'No files were uploaded.');
  }
  
  // Generate URLs for each uploaded video
  const fileUrls = req.files.map(file => `/temp/${file.filename}`);

  return res.status(200).json(new ApiResponse(200, fileUrls, 'Videos uploaded successfully'));
});

const addProperty = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;
  const {
    propertyType,
    propertySubCategory,
    area,
    propertyAddress,
    propertyName,
    propertySalePrice,
    propertyDescription,
    images,
    videos,
    noOfBedroom,
    noOfBathroom,
    elevator,
    parking,
    garage,
    noOfGarage,
    areaOfGarage,
    cellar,
    noOfcellar,
    areaOfcellar,
    propertyTax,
    yearOfConstruction,
    condominiumFees,
    proximityToService,
    balcony,
    noOfBalcony,
    areaOfBalcony,
    terrace,
    noOfterrace,
    areaOfterrace,
    heatingType,
    typeOfHeating,
    hotWaterType,
    typeOfhotWaterSystem,
    garden,
    gardenArea,
    selleraddress,
    floorNumber,
    numberOfUnits,
    numberOfFloors,
    adjacentParking,
    availability,
    lastRenovationYear,
    lastRenovationMonth,
    securitySystem,
    commonEquipment,
    centralHeating,
    noOfRooms,
    airConditioning,
    specificEquipment,
    specificFeatures,
    sizeOfOutbuilding,
    plot,
    areaOfPlot,
    tower,
    moat,
    chapel,
    typeOfview,
    wineCellar,
    areaOfWineCellar,
    chapelOrOratory,
    energyConsumption,
    GreenhouseGasEmissions,
    ggeGrade,
    ecGrade,
    isfeatured,
    del,
    editId,
  } = req.body;

  if (del) {
    // Handle deletion
    const propertyToDelete = await PropertyAdd.findByIdAndDelete(editId);
    if (!propertyToDelete) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Property not found"));
    }

    // Remove property ID from user's properties array
    await User.updateOne({ _id: ownerId }, { $pull: { properties: editId } });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Property deleted successfully"));
  }

  if (editId) {
    // Handle editing
    const updatedProperty = await PropertyAdd.findByIdAndUpdate(
      editId,
      {
        ownerId,
        propertyType,
        propertySubCategory,
        area,
        propertyAddress,
        propertyName,
        propertySalePrice,
        propertyDescription,
        images,
        videos,
        noOfBedroom,
        noOfBathroom,
        elevator,
        parking,
        garage,
        noOfGarage,
        areaOfGarage,
        cellar,
        noOfcellar,
        areaOfcellar,
        propertyTax,
        yearOfConstruction,
        condominiumFees,
        proximityToService,
        balcony,
        noOfBalcony,
        areaOfBalcony,
        terrace,
        noOfterrace,
        areaOfterrace,
        heatingType,
        typeOfHeating,
        hotWaterType,
        typeOfhotWaterSystem,
        garden,
        gardenArea,
        selleraddress,
        floorNumber,
        numberOfUnits,
        numberOfFloors,
        adjacentParking,
        availability,
        lastRenovationYear,
        lastRenovationMonth,
        securitySystem,
        commonEquipment,
        centralHeating,
        noOfRooms,
        airConditioning,
        specificEquipment,
        specificFeatures,
        sizeOfOutbuilding,
        plot,
        areaOfPlot,
        tower,
        moat,
        chapel,
        typeOfview,
        wineCellar,
        areaOfWineCellar,
        chapelOrOratory,
        energyConsumption,
        GreenhouseGasEmissions,
        ggeGrade,
        ecGrade,
        isfeatured,
      },
      { new: true }
    );

    if (!updatedProperty) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Property not found"));
    }

    const propertyWithDetails = await PropertyAdd.aggregate([
      { $match: { _id: updatedProperty._id } },
      {
        $lookup: {
          from: "users",
          localField: "ownerId",
          foreignField: "_id",
          as: "owner_info",
        },
      },
      {
        $lookup: {
          from: "subcategories",
          localField: "propertySubCategory",
          foreignField: "_id",
          as: "category_info",
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          propertyWithDetails,
          "Property updated successfully"
        )
      );
  }

  const user = await User.findById(ownerId).populate("subscriptionPlan");
  console.log(user)
  const propertyCount = user?.properties?.length;
  console.log("propertyCount......", propertyCount);

  const subscription = user?.subscriptionPlan;

  let limit = subscription ? subscription?.propertyAddLimit : 2; // Default limit if no subscription
  console.log("propertyCount...",subscription.propertyAddLimit)
  if (limit !== "unlimited" && propertyCount >= parseInt(limit)) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "Property limit reached for your subscription plan"
        )
      );
  }

  // Handle creation if neither del nor editId
  const newProperty = await PropertyAdd.create({
    ownerId,
    propertyType,
    propertySubCategory,
    area,
    propertyAddress,
    propertyName,
    propertySalePrice,
    propertyDescription,
    images,
    videos,
    noOfBedroom,
    noOfBathroom,
    elevator,
    parking,
    garage,
    noOfGarage,
    areaOfGarage,
    cellar,
    noOfcellar,
    areaOfcellar,
    propertyTax,
    yearOfConstruction,
    condominiumFees,
    proximityToService,
    balcony,
    noOfBalcony,
    areaOfBalcony,
    terrace,
    noOfterrace,
    areaOfterrace,
    heatingType,
    typeOfHeating,
    hotWaterType,
    typeOfhotWaterSystem,
    garden,
    gardenArea,
    selleraddress,
    floorNumber,
    numberOfUnits,
    numberOfFloors,
    adjacentParking,
    availability,
    lastRenovationYear,
    lastRenovationMonth,
    securitySystem,
    commonEquipment,
    centralHeating,
    noOfRooms,
    airConditioning,
    specificEquipment,
    specificFeatures,
    sizeOfOutbuilding,
    plot,
    areaOfPlot,
    tower,
    moat,
    chapel,
    typeOfview,
    wineCellar,
    areaOfWineCellar,
    chapelOrOratory,
    energyConsumption,
    GreenhouseGasEmissions,
    ggeGrade,
    ecGrade,
    isfeatured,
  });

  const propertyWithDetails = await PropertyAdd.aggregate([
    { $match: { _id: newProperty._id } },
    {
      $lookup: {
        from: "users",
        localField: "ownerId",
        foreignField: "_id",
        as: "owner_info",
      },
    },
    {
      $lookup: {
        from: "subcategories",
        localField: "propertySubCategory",
        foreignField: "_id",
        as: "category_info",
      },
    },
  ]);

  // Add property ID to user's properties array
  await User.findByIdAndUpdate(
    ownerId,
    { $push: { properties: newProperty._id } },
    { new: true }
  );

  return res
    .status(201)
    .json(
      new ApiResponse(201, propertyWithDetails, "Property added successfully")
    );
});

const getAllProperties = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      ownerId,
      slug,
      propertyTypeid,
      salepricegt,
      salepricelt,
      arealt,
      areagt,
      searchKeyword,
      lat,long,radius,
      isfeatured
    } = req.body;

    // Create the match condition based on query parameters
    const matchCondition = {};
    console.log(ownerId)
    if (ownerId) {
      matchCondition.ownerId = new mongoose.Types.ObjectId(ownerId);
    }
    if (slug) {
      matchCondition.slug = slug;
    }
    if (propertyTypeid) {
      matchCondition.propertyType = new mongoose.Types.ObjectId(propertyTypeid);
    }
    if (isfeatured) {
      matchCondition.isfeatured = isfeatured;
    }
    if (salepricegt || salepricelt) {
      matchCondition.$expr = {
        $and: [],
      };

      if (salepricegt) {
        matchCondition.$expr.$and.push({
          $gte: [{ $toInt: "$propertySalePrice" }, parseFloat(salepricegt)],
        });
      }
      if (salepricelt) {
        matchCondition.$expr.$and.push({
          $lte: [{ $toInt: "$propertySalePrice" }, parseFloat(salepricelt)],
        });
      }
    }
    if (arealt || areagt) {
      matchCondition.$expr = {
        $and: [],
      };

      if (areagt) {
        matchCondition.$expr.$and.push({
          $gte: [
            {
              $toInt: {
                $arrayElemAt: [
                  {
                    $split: [
                      "$area", 
                      " "
                    ]
                  },
                  0
                ]
              }
            },
            parseFloat(areagt),
          ],
        });
      }
      if (arealt) {
        matchCondition.$expr.$and.push({
          $lte: [
            {
              $toInt: {
                $arrayElemAt: [
                  {
                    $split: [
                      "$area", 
                      " "
                    ]
                  },
                  0
                ]
              }
            },
            parseFloat(arealt),
          ],
        });
      }
    }
    if (searchKeyword) {
      matchCondition.propertyName = {
        $regex: new RegExp(searchKeyword, "i"), // 'i' for case-insensitive search
      };
    }
    console.log(matchCondition)
    let pipeline=buildPipeline(matchCondition,lat, long, radius);
    const propertie = PropertyAdd.aggregate(pipeline)
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };

    const properties = await PropertyAdd.aggregatePaginate(propertie, options);
    console.log(properties)

    if (!properties.docs.length) {
      return res
        .status(404)
        .json(new ApiResponse(404, [], "No properties found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, properties, "Properties fetched successfully")
      );
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(500, ["Internal Server Error"]));
  }
});

const getPropertyType = asyncHandler(async (req, res) => {
  try {
    const propertyTypes = await PropType.aggregate([
      {
        $match: {}, // Add your matching criteria if needed
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(200, propertyTypes, "Properties fetched successfully")
      );
  } catch (error) {
    res.status(500).json(new ApiError(500, ["Internal Server Error"]));
  }
});

const getSubcategories = asyncHandler(async (req, res) => {
  try {
    const { propertyTypeId } = req.body;

    const propertyWithSubcategories = await mongoose
      .model("PropType")
      .aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(propertyTypeId),
          },
        },
        {
          $lookup: {
            from: "subcategories", // The collection name of the subcategories
            localField: "_id", // The _id of the PropType
            foreignField: "category", // The category field in SubCategory that references PropType _id
            as: "subcategories", // The name of the array where matched documents will be stored
          },
        },
        {
          $project: {
            subcategories: 1, // Include the subcategories array in the final output
          },
        },
      ]);
    const subcategories =
      propertyWithSubcategories.length > 0
        ? propertyWithSubcategories[0].subcategories
        : [];

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subcategories,
          "Subcategories fetched successfully"
        )
      );
  } catch (error) {
    return res.status(500).json(new ApiError(500, ["Internal Server Error"]));
  }
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const { userName, profilePic, userAddress, userPhoneNumber } = req.body;
  // Ensure the user is logged in
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Unauthorized");
  }

  // Prepare update object
  const updateFields = {};
  if (userName) updateFields.userName = userName;
  if (userAddress) updateFields.userAddress = userAddress;
  if (profilePic) updateFields.profilepic = profilePic;
  if (userPhoneNumber) updateFields.userPhoneNumber = userPhoneNumber;
  // Ensure there is at least one field to update
  if (Object.keys(updateFields).length === 0) {
    throw new ApiError(400, "No fields to update");
  }

  // Update the user in the database
  const updatedUser = await User.findByIdAndUpdate(user._id, updateFields, {
    new: true,
  }).select("-password -refreshToken");

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  // Send response with ApiResponse
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: updatedUser },
        "User profile updated successfully"
      )
    );
});

const updateUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // Ensure the user is logged in
  const user = req.user;

  const userdata = await User.findById(user?._id);

  if (!userdata) {
    throw new ApiError(401, "Unauthorized");
  }

  // Validate old password
  const isPasswordValid = await userdata.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) {
    return res
      .status(401)
      .json(
        new ApiError(401, "Invalid user credentials", [
          "Invalid user credentials",
        ])
      );
  }

  // Validate new password
  if (!newPassword || newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters long");
  }

  // Update and hash the new password
  user.password = newPassword;
  await user.save();
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        ["Password updated successfully"],
        "Password updated successfully"
      )
    );
});

const deleteUserAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Check if the user exists
  const user = await User.findById(userId);
  if (!user) {
    return res
      .status(404)
      .json(new ApiError(404, "User not found", ["User not found"]));
  }

  // Log the user data to inspect properties

  // Retrieve and log properties associated with the user
  const userProperties = await PropertyAdd.find({ ownerId: userId });
  // Delete all properties associated with the user
  await PropertyAdd.deleteMany({ ownerId: userId });

  // Delete the user account
  await User.findByIdAndDelete(userId);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "User account and associated data deleted successfully"
      )
    );
});

const updateUserFavorites = asyncHandler(async (req, res) => {
  const { propertyId } = req.body;
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Unauthorized");
  }

  if (!propertyId) {
    throw new ApiError(400, "Property ID is required");
  }

  const property = await PropertyAdd.findById(propertyId);
  if (!property) {
    throw new ApiError(404, "Property not found");
  }

  // Check if the property is already in the favorites list
  const favoriteIndex = user.favorites.findIndex(
    (favId) => favId.toString() === propertyId.toString()
  );

  if (favoriteIndex !== -1) {
    // If the property exists in favorites, remove it
    user.favorites.splice(favoriteIndex, 1);
    await user.save();
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { favorites: user.favorites },
          "Property removed from favorites"
        )
      );
  } else {
    // If the property does not exist, add it to the favorites list
    user.favorites.push(propertyId);
    await user.save();
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { favorites: user.favorites },
          "Property added to favorites"
        )
      );
  }
});

const addPropertyViewAndContacts = asyncHandler(async (req, res) => {
  try {
    const { propertyId, isContract } = req.body;
    const userId = req.user._id;

    // Find property
    const propertyView = await PropertyAdd.findOne({ _id: propertyId });

    if (!propertyView) {
      return res.status(404).json(new ApiError(404, "Property not found"));
    }

    if (isContract) {
      // Handle the isContract logic
      if (!propertyView.contacts) {
        propertyView.contacts = [];
      }

      // Check if the user has already been added to isContract
      if (propertyView.contacts.includes(userId)) {
        return res
          .status(200)
          .json(
            new ApiResponse(
              "User is already marked as contract for this property"
            )
          );
      }

      // Add user ID to the isContract array
      propertyView.contacts.push(userId);
      await propertyView.save();

      return res
        .status(200)
        .json(new ApiResponse("Contract status recorded successfully"));
    } else {
      // Handle the views logic
      if (propertyView.views.includes(userId)) {
        return res
          .status(200)
          .json(new ApiResponse("User has already viewed this property"));
      }

      // Add user ID to the views array
      propertyView.views.push(userId);
      await propertyView.save();

      return res
        .status(200)
        .json(new ApiResponse("View recorded successfully"));
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiError(500, "Error recording view or contract status"));
  }
});

const customerServiceRequest = asyncHandler(async (req, res) => {
  try {
    const { _id: userId, email } = req.user;
    const { subject, message } = req.body;

    // Validate input
    if (!subject || !message) {
      return res
        .status(400)
        .json(new ApiError(400, "Subject and message are required"));
    }

    // Save the user's contact details to the database
    const newContact = new Contact({
      userId,
      userEnquiry: message,
    });

    await newContact.save();

    // Send email using the email service
    await sendEmail(
      email,
      `Customer Service Request: ${subject}`,
      `Message from ${email}:\n\n${message}`
    );

    res.status(200).json(
      new ApiResponse("Your request has been received and is being processed")
    );
  } catch (error) {
    console.error("Error processing customer service request:", error);
    return res.status(500).json(new ApiError(500, "Error processing request"));
  }
});

const enquireNow = asyncHandler(async (req, res) => {
  const { propertyId, userEnquiry } = req.body;
  const userId = req.user._id;
  // Fetch the property details
  const property = await PropertyAdd.findById(propertyId).populate('ownerId');
  console.log(property)
  if (!property) {
      return res.status(404).json({ message: 'Property not found' });
  }

  // Fetch the user details
  const user = await User.findById(userId);
  if (!user) {
      return res.status(404).json({ message: 'User not found' });
  }
  // Prepare the email content
  const emailSubject = `New Enquiry for Your Property: ${property.propertyName}`;
  const emailText = `
      Hello ${property.ownerId.userName},

      You have received a new enquiry for your property: ${property.propertyName}.

      User Details:
      Name: ${user.userName}
      Email: ${user.email}
      Phone: ${user.userPhoneNumber}

      Enquiry:
      ${userEnquiry}

      Please contact the user for further information.

      Regards,
      Your Company Name
  `;
  console.log(emailText)

  // Create a new enquiry document
  const newEnquiry = new Enquiry({
    userId,
    propertyId,
    propertyType: property.propertyType,
    propertySubCategory: property.propertySubCategory,
    userEnquiry
  });

  try {
    // Save the enquiry to the database
    await newEnquiry.save();

    // Send the email
    await sendEmail(property.ownerId.email, emailSubject, emailText);
    res.status(200).json({ message: 'Enquiry saved and sent successfully' });
  } catch (error) {
    console.log(error)
    res.status(500).json(new ApiError(500,"Error processing enquiry",error));
    // res.status(500).json({ message: 'Error processing enquiry' });
  }
});

const userForgotPassword = async (req, res) => {
  try {
    const {email} = req.body; ;

    // Check if the email exists in the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }


    // Generate a password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // Token expires in 1 hour
    await user.save();

    // Prepare email variables
    const resetUrl = `http://${req.headers.host}/reset/${resetToken}`;
    const emailVariables = {
      emailTitle: 'Password Reset Request',
      emailGreeting: `Hello, ${user.userName}`, //${user.userName}
      emailBody: `You requested a password reset. Please click the link below to reset your password:<br><br><a href="${resetUrl}">Reset Password</a><br><br>If you did not request this, please ignore this email.`,
      emailFooter: 'Thank you.'
    };

    // Send email with the reset token
    await sendEmail(email, 'Password Reset Request', emailVariables);
    return res.status(200).json(new ApiResponse(200,"Password reset email sent"));
  } catch (error) {
    console.error(error);
    return res.status(500).json(new ApiError("An error occurred"));
  }
};


export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  uploadImage,
  uploadVideos,
  getCurrentUser,
  addProperty,
  getAllProperties,
  getPropertyType,
  getSubcategories,
  updateUserProfile,
  updateUserPassword,
  deleteUserAccount,
  updateUserFavorites,
  addPropertyViewAndContacts,
  customerServiceRequest,
  enquireNow,
  userForgotPassword
};
