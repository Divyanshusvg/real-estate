import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../../models/user.model.js";
import jwt from "jsonwebtoken";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { PropType } from "../../models/propertyType.modal.js";
import mongoose from "mongoose";
import PropertyAdd from "../../models/propertyAdd.modal.js";
import { SubCategory } from "../../models/propSubCategory.modal.js";
import {SubscriptionModel} from "../../models/subscription.modal.js";
import {subscriptionManagement} from "../../models/subscriptionManagement.modal.js";
import { Enquiry } from "../../models/propertyEnquiry.modal.js";
import { Contact } from "../../models/contact.modal.js";
import { City } from "../../models/city.modal.js";
import { sendEmail } from "../../utils/emailService.js";
import moment from "moment";
import crypto from "crypto"
import bcrypt from "bcrypt"
import { Console, error } from "console";

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

const dashboredAdmin = asyncHandler(async (req, res) => {
  const count = await User.countDocuments();
  const PropertyAddCount = await PropertyAdd.countDocuments();
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );

  const propertiesAddedTodayCount = await PropertyAdd.countDocuments({
    createdAt: { $gte: startOfDay, $lt: endOfDay },
  });
  return res.render("pages/dashbored", {
    count,
    PropertyAddCount,
    propertiesAddedTodayCount,
    currentPage: "dashboard",
  });
});

const getLoginAdmin = async (req, res) => {
  try {
    let { accessToken } = req.cookies;
    try {
      let decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      req.user = await User.findOne({ _id: decoded });
      if (req.user.userType == 3) {
        return res.redirect("/");
      } else {
        return res.render("pages/login", { error: null });
      }
    } catch (error) {
      return res.render("pages/login", { error: null });
    }
  } catch (error) {
    return res.render("pages/login", { error: null });
  }
};

const getForgotPassword = async (req, res) => {
  try {
    return res.render("pages/forgotpassword", { error: null,success: null });
  } catch (error) {
    return res.render("pages/login", { error: null,success: null });
  }
};

const adminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the email exists in the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('pages/forgotpassword', { error: 'Email not found',success:false });
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
      emailGreeting: `Hello, Admin`, //${user.userName}
      emailBody: `You requested a password reset. Please click the link below to reset your password:<br><br><a href="${resetUrl}">Reset Password</a><br><br>If you did not request this, please ignore this email.`,
      emailFooter: 'Thank you.'
    };

    // Send email with the reset token
    await sendEmail(email, 'Password Reset Request', emailVariables);

    return res.render('pages/forgotpassword', { success: 'Password reset email sent' ,error:false });
  } catch (error) {
    console.error(error);
    return res.render('pages/forgotpassword', { error: 'An error occurred' ,success :false });
  }
};

const getResetPage = async (req, res) => {
  try {
    const { token } = req.params;

    // Find the user with the matching reset token and ensure it hasn't expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() } // Check if token has not expired
    });

    if (!user) {
      return res.status(400).render('pages/errors', { error: 'Password reset token is invalid or has expired.',success:false });
    }

    // Render the reset.ejs page, passing the email and token to the view
    res.render('pages/reset', { email: user.email, token,success: null, error: null });
  } catch (error) {
    console.error(error);
    res.status(500).render('pages/errors', { error: 'An error occurred while processing your request.',success:false });
  }
};

// const resetPasswordHandler = async (req, res) => {
//   try {
//     const { token } = req.params; // Extract token from path params
//     const { password, confirmPassword } = req.body; // Extract password fields from the body
//     console.log(token)
//     // Check if the password and confirm password fields match
//     if (password !== confirmPassword) {
//       return res.render('pages/reset', { error: "Passwords do not match",success:false });
//     }

//     // Find the user with the matching reset token and ensure it hasn't expired
//     const user = await User.findOne({
//       resetPasswordToken: token,
//       resetPasswordExpires: { $gt: Date.now() } // Check if the token is still valid
//     });

//     if (!user) {
//       return res.render('pages/reset', { error: "User not found",success:false });
//     }

//     // Update user's password
//     user.password = password;
//     await user.save();
//     if(user.userType==3){

//       res.render('pages/login', { success: "Password reset successfully",error:false });
//     }
//     return res.redirect('http://83.136.219.131/login?success=Password reset successfully');
//   } catch (error) {
//     console.error("Error resetting password:", error);
//     res.render('pages/reset', { error: "Server error",success:false });
//   }
// };

const resetPasswordHandler = async (req, res) => {
  try {
    const { token } = req.params; // Extract token from path params
    const { password, confirmPassword } = req.body; // Extract password fields from the body

    // Check if the password and confirm password fields match
    if (password !== confirmPassword) {
      return res.render('pages/reset', { error: "Passwords do not match", success: false, token }); // Pass token to the render
    }

    // Find the user with the matching reset token and ensure it hasn't expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() } // Check if the token is still valid
    });

    if (!user) {
      return res.render('pages/reset', { error: "Invalid or expired token", success: false, token }); // Pass token
    }

    user.password = password;
    await user.save();

    // Redirect or render login page based on user type
    if (user.userType == 3) {
      return res.render('pages/login', { success: "Password reset successfully", error: false });
    } else {
      return res.redirect('http://83.136.219.131/login?success=Password reset successfully');
    }
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.render('pages/reset', { error: "Server error", success: false, token }); // Pass token
  }
};


const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return new ApiError(400, "email is required");
  }

  const user = await User.findOne({
    $or: [{ email }],
  });

  if (!user || user?.userType != 3) {
    return res.render("pages/login", { error: { email: "Invalid email" } });
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    return res.render("pages/login", {
      error: { password: "Invalid password" },
      old: { email },
    });
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: false,
  };
  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options);

  return res.redirect("/");
});

const logoutAdmin = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.admin._id,
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
    .redirect("/login");
});

const propertyTypeCreate = asyncHandler(async (req, res) => {
  const { name, status, editId, del } = req.body;
  if (del == 1 || del == "1") {
    const propertyType = await PropType.findOneAndDelete({ _id: editId });
    return res
      .status(200)
      .json(
        new ApiResponse(200, propertyType, "PropertyType Deleted successfully")
      );
  } else if (editId) {
    const propertyType = await PropType.findOne({ _id: editId });
    if (!propertyType) {
      return res
        .status(404)
        .json(new ApiError(404, null, "PropertyType Not Found"));
    }
    if (name !== undefined) {
      propertyType.name = name;
    }
    if (status !== undefined) {
      propertyType.status = status;
    }
    await propertyType.save();
    return res
      .status(200)
      .json(
        new ApiResponse(200, propertyType, "PropertyType Updated successfully")
      );
  } else {
    const propertyType = await PropType.create({ name, status });
    return res
      .status(201)
      .json(
        new ApiResponse(201, propertyType, "PropertyType Created successfully")
      );
  }
});

const propTypeList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, name } = req.query;

  // Build the match stage of the aggregation pipeline dynamically
  const matchStage = {};
  if (status !== undefined) {
    matchStage.status = status !== null ? status : { $ne: 0 };
  }
  if (name !== undefined) {
    matchStage.name = { $regex: new RegExp(name, "i") }; // Case-insensitive regex match
  }

  const aggregate = PropType.aggregate([
    {
      $match: matchStage,
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const propertyType = await PropType.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .render("pages/mangeProp", { propertyType, currentPage: "mangeProp" });
});

const userList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, name } = req.query;

  // Build the match stage of the aggregation pipeline dynamically
  const matchStage = {
    userType: { $ne: 3 }, // Exclude users with userType 3 (Admin)
  };

  if (status !== undefined) {
    matchStage.status = status !== null ? status : { $ne: 0 };
  }
  if (name !== undefined) {
    matchStage.name = { $regex: new RegExp(name, "i") }; // Case-insensitive regex match
  }

  const aggregate = User.aggregate([
    {
      $match: matchStage,
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        password: 0, // Exclude password field
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const users = await User.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .render("pages/userList", { users, currentPage: "userList" });
});

const userDetails = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.query;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).render("404", { message: "User not found" });
    }
    // Adjust the path to your view file
    res.render("pages/userList/show", { user });
  } catch (error) {
    res.status(500).render("500", { message: "Server error" });
  }
});

const editDelUser = asyncHandler(async (req, res) => {
  const { userName, email, userType, editId, del } = req.body;
  if (del) {
    // Delete user
    try {
      const user = await User.findByIdAndDelete(editId);
      if (!user) {
        throw new ApiError(404, "User not found");
      }
      return res
        .status(200)
        .json(new ApiResponse(200, null, "User deleted successfully"));
    } catch (error) {
      throw new ApiError(500, "Server error");
    }
  } else if (editId) {
    // Edit user
    try {
      const updatedUser = await User.findByIdAndUpdate(
        editId,
        {
          $set: {
            userName: userName,
            email: email,
            userType: userType,
          },
        },
        { new: true } // Return the updated document
      ).select("-password -isAdmin -isVerified");
      if (!updatedUser) {
        return new ApiError(404, "User not found");
      }

      return res.status(200).json(
        new ApiResponse(200, {
          message: "User updated successfully",
          user: updatedUser,
        })
      );
    } catch (error) {
      return res.status(500).json({ message: "Server error", error });
    }
  } else {
    return res.status(400).json({ message: "Invalid request" });
  }
});

const filterUsersByVerification = asyncHandler(async (req, res) => {
  const { isVerified } = req.query; // "true" or "false"
  // Validate the isVerified parameter
  if (isVerified !== "true" && isVerified !== "false") {
    return res.status(400).json({ message: "Invalid isVerified value" });
  }

  // Construct the filter query based on isVerified
  const filterQuery = { isVerified: isVerified === "true" };

  try {
    const users = await User.find(filterQuery).select("-password");
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});

const updateVerificationStatus = asyncHandler(async (req, res) => {
  const { userId, isVerified } = req.body;
  try {
    // Find user by ID and update verification status
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.isVerified = isVerified;
    await user.save();

    res.json({
      success: true,
      message: "Verification status updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const updateFeatureStatus = asyncHandler(async (req, res) => {
  const { propertyId, isfeatured } = req.body;
  try {
    // Find property by ID and update feature status
    const property = await PropertyAdd.findById(propertyId);
    if (!property) {
      return res
      .status(404)
      .json({ success: false, message: "Property not found" });
    }
    
    property.isfeatured = isfeatured;
    await property.save();

    res.json({
      success: true,
      message: "Feature status updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const updateUser = asyncHandler(async (req, res) => {
  try {
    const { userName, email, userType, _id } = req.body;
    // Validate input
    if (!userName || !email || !userType || !_id) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    // Find user and update their information
    const user = await User.findOne({ _id });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Update user details
    user.userName = userName;
    user.email = email;
    user.userType = userType;
    await user.save();

    res.json({
      success: true,
      message: "User information updated successfully!",
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

const getUserActivity = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  try {
    // Define the date format
    const formatDate = "YYYY-MM-DD";

    // Initialize variables for date range
    const startOfWeek = moment().startOf("week");
    const endOfWeek = moment().endOf("week");
    console.log("Start of Week:", startOfWeek.format(formatDate));
    console.log("End of Week:", endOfWeek.format(formatDate));

    // Generate a list of all required periods (days of the current week)
    const periodsOfTime = [];
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    for (let i = 0; i < 7; i++) {
      const date = startOfWeek.clone().add(i, "days").format(formatDate);
      periodsOfTime.push({
        _id: date,
        day: daysOfWeek[i],
        totalProperties: 0, // Initialize with 0
      });
    }
    // Aggregation pipeline to count properties listed by the user daily
    const aggregationPipeline = [
      {
        $match: {
          ownerId: new mongoose.Types.ObjectId(userId),
          createdAt: {
            $gte: startOfWeek.toDate(),
            $lte: endOfWeek.toDate(),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          totalProperties: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 }, // Sorting by date in ascending order
      },
    ];

    const aggregatedData = await PropertyAdd.aggregate(aggregationPipeline);

    // Convert aggregated data into a map for easy lookup
    const dataMap = aggregatedData.reduce((map, item) => {
      map[item._id] = item.totalProperties;
      return map;
    }, {});

    // Update periodsOfTime with actual data from aggregatedData
    periodsOfTime.forEach((period) => {
      if (dataMap[period._id] !== undefined) {
        period.totalProperties = dataMap[period._id];
      }
    });

    res.json(periodsOfTime);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error fetching data", error });
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const adminId = req.admin._id;
  // Validate input
  if (!adminId || !newPassword) {
    return res
      .status(400)
      .json(
        new ApiError(400, null, ["Admin ID and new password are required"])
      );
  }

  try {
    // Find user by admin ID
    const user = await User.findById(adminId);
    if (!user) {
      return res.status(404).json(new ApiError(404, null, ["User not found"]));
    }
    // Update user's password
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    // Return success response
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password reset successfully"));
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json(new ApiError(500, null, ["Server error"]));
  }
});

const getPropertyList = asyncHandler(async (req, res) => {
  let { page, limit } = req.query;

  // Set default values if page or limit is not provided or is invalid
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);
  if (isNaN(page) || page <= 0) {
    page = 1;
  }
  if (isNaN(limit) || limit <= 0) {
    limit = 10;
  }

  try {
    // Fetch properties for listing
    const options = {
      page,
      limit,
    };
    const aggregate = PropertyAdd.aggregate([
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $lookup: {
          from: "users", // Collection name
          localField: "ownerId", // Field in the property document
          foreignField: "_id", // Field in the users collection
          as: "owner_info", // New field to store the owner information
        },
      },
      {
        $lookup: {
          from: "subcategories", // Collection name
          localField: "propertySubCategory", // Field in the property document
          foreignField: "_id", // Field in the subcategories collection
          as: "category_info", // New field to store the category information
        },
      },
    ]);

    // Check if there are properties available
    const prop = await PropertyAdd.aggregatePaginate(aggregate, options);

    return res.status(200).render("pages/propertyList", { prop });
  } catch (error) {
    // Log the error for debugging
    console.error("Error fetching property list:", error);

    // Handle errors
    return new ApiError(500, "Internal Server Error");
  }
});

const editdelProperty = asyncHandler(async (req, res) => {
  try {
    const { id, propertyName, del } = req.body;
    if (del) {
    
      const propdeleted = await PropertyAdd.findById({ _id: id });
      await User.updateOne({ _id: propdeleted.ownerId }, { $pull: { properties: id } });
      const propdeleted1 = await PropertyAdd.deleteOne({ _id: id });
      return res
        .status(200)
        .json(
          new ApiResponse(200, propdeleted1, "Property Deleted successfully")
        );
    }
    const updatedProperty = await PropertyAdd.findByIdAndUpdate(
      id,
      { propertyName },
      { new: true }
    );

    if (!updatedProperty) {
      return res
        .status(404)
        .json(new ApiResponse(404, [], "Property not found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedProperty, "Property updated successfully")
      );
  } catch (error) {
    console.error("Error updating property:", error);
    return new ApiError(500, "Internal Server Error");
  }
});

const subPropertyTypeCreate = asyncHandler(async (req, res) => {
  const { name, status, catId, editId, del } = req.body;
  if (del == 1 || del == "1") {
    const subPropertyType = await SubCategory.findOneAndDelete({ _id: editId });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subPropertyType,
          "Property Category Deleted successfully"
        )
      );
  } else if (editId) {
    const subPropertyType = await SubCategory.findOne({ _id: editId });
    if (!subPropertyType) {
      return res
        .status(404)
        .json(new ApiError(404, null, "Property Category Not Found"));
    }
    if (name !== undefined) {
      subPropertyType.name = name;
    }
    if (status !== undefined) {
      subPropertyType.status = status;
    }
    if (catId !== undefined) {
      subPropertyType.category = catId;
    }
    await subPropertyType.save();
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subPropertyType,
          "Property Category Updated successfully"
        )
      );
  } else {
    const subPropertyType = await SubCategory.create({
      name,
      status,
      category: catId,
    });
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          subPropertyType,
          "Property Category Created successfully"
        )
      );
  }
});

const subPropCategoryTypeList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, name } = req.query;

  // Build the match stage of the aggregation pipeline dynamically
  const matchStage = {};
  if (status !== undefined) {
    matchStage.status = status !== null ? status : { $ne: 0 };
  }
  if (name !== undefined) {
    matchStage.name = { $regex: new RegExp(name, "i") }; // Case-insensitive regex match
  }

  const aggregate = SubCategory.aggregate([
    {
      $match: matchStage,
    },
    {
      $lookup: {
        from: "proptypes",
        localField: "category",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const subPropertyType = await SubCategory.aggregatePaginate(
    aggregate,
    options
  );
  return res
    .status(200)
    .render("pages/subCategory", {
      subPropertyType,
      currentPage: "subCategory",
    });
});

const subscription = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, name } = req.query;

  // Build the match stage of the aggregation pipeline dynamically
  const matchStage = {};
  if (status !== undefined) {
    matchStage.status = status !== null ? status : { $ne: 0 };
  }
  if (name !== undefined) {
    matchStage.name = { $regex: new RegExp(name, "i") }; // Case-insensitive regex match
  }

  const aggregate = SubscriptionModel.aggregate([
    {
      $match: matchStage,
    },
    {
      $lookup: {
        from: "users",
        localField: "ownerId",
        foreignField: "_id",
        as: "userDetails",
      }
    },
    {
      $lookup: {
        from: "subscriptionplans",
        localField: "subscriptionType",
        foreignField: "_id",
        as: "subscriptionplans_details"
        }
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const subscription = await SubscriptionModel.aggregatePaginate(aggregate, options);
  return res
    .status(200)
    .render("pages/subscription", {
      subscription,
      currentPage: "subscription",
    });
});

const adminsubscriptionManagement = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, name } = req.query;

  // Build the match stage of the aggregation pipeline dynamically
  const matchStage = {};
  if (status !== undefined) {
    matchStage.status = status !== null ? status : { $ne: 0 };
  }
  if (name !== undefined) {
    matchStage.name = { $regex: new RegExp(name, "i") }; // Case-insensitive regex match
  }

  const aggregate = subscriptionManagement.aggregate([
    {
      $match: matchStage,
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const adminsubscription = await subscriptionManagement.aggregatePaginate(aggregate, options);
  return res
    .status(200)
    .render("pages/subscriptionManagement", {
      adminsubscription,
      currentPage: "adminsubscription",
    });
});

// const addEditSubscription = asyncHandler(async (req, res) => {
//   try {
//     const { editId, ownerId, subscriptionType, months } = req.body;

//     if (editId) {
//       // Edit existing subscription
//       const updatedSubscription = await SubscriptionModel.findByIdAndUpdate(
//         editId,
//         { subscriptionType, months },
//         { new: true }
//       );

//       if (!updatedSubscription) {
//         return res
//           .status(404)
//           .json(new ApiResponse(404, [], "Subscription not found"));
//       }

//       return res
//         .status(200)
//         .json(
//           new ApiResponse(200, updatedSubscription, "Subscription updated successfully")
//         );
//     } else {
//       // Add new subscription
//       const newSubscription = new SubscriptionModel({
//         ownerId,
//         subscriptionType,
//         months,
//       });

//       await newSubscription.save();

//       return res
//         .status(201)
//         .json(new ApiResponse(201, newSubscription, "Subscription created successfully"));
//     }
//   } catch (error) {
//     console.error("Error processing subscription:", error);
//     return res
//       .status(500)
//       .json(new ApiError(500, "Internal Server Error"));
//   }
// });
const addEditSubscription = asyncHandler(async (req, res) => {
  try {
    const { editId, ownerId, subscriptionType, months } = req.body;

    let subscription;

    if (editId) {
      // Edit existing subscription
      subscription = await SubscriptionModel.findByIdAndUpdate(
        editId,
        { subscriptionType, months },
        { new: true }
      );

      if (!subscription) {
        return res
          .status(404)
          .json(new ApiResponse(404, [], "Subscription not found"));
      }
    } else {
      // Add new subscription
      subscription = new SubscriptionModel({
        ownerId,
        subscriptionType,
        months,
      });

      await subscription.save();
    }

    // Update user's subscriptionPlan field
    const updatedUser = await User.findByIdAndUpdate(
      ownerId,
      { subscriptionPlan: subscriptionType },
      { new: true }
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json(new ApiResponse(404, [], "User not found"));
    }

    return res
      .status(editId ? 200 : 201)
      .json(new ApiResponse(editId ? 200 : 201, subscription, `Subscription ${editId ? 'updated' : 'created'} successfully`));

  } catch (error) {
    console.error("Error processing subscription:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error"));
  }
});

const addEditSubscriptionPlan = asyncHandler(async (req, res) => {
  try {
    const { editId, planName, planPrice, anualDiscount, planDurationInMonths,propertyAddLimit} = req.body;
    if (editId) {
      // Edit existing subscription plan
      const updatedSubscriptionPlan = await subscriptionManagement.findByIdAndUpdate(
        editId,
        { planName, planPrice, anualDiscount, planDurationInMonths,propertyAddLimit },
        { new: true }
      );

      if (!updatedSubscriptionPlan) {
        return res
          .status(404)
          .json(new ApiResponse(404, [], "Subscription plan not found"));
      }

      return res
        .status(200)
        .json(
          new ApiResponse(200, updatedSubscriptionPlan, "Subscription plan updated successfully")
        );
    } else {
      // Add new subscription plan
      const newSubscriptionPlan = new subscriptionManagement({
        planName,
        planPrice,
        anualDiscount,
        planDurationInMonths,
        propertyAddLimit,
      });

      await newSubscriptionPlan.save();

      return res
        .status(201)
        .json(new ApiResponse(201, newSubscriptionPlan, "Subscription plan created successfully"));
    }
  } catch (error) {
    console.error("Error processing subscription plan:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error"));
  }
});


const editSubscription = asyncHandler(async (req, res) => {
  const { editId, planName } = req.body;

  try {
    const subscription = await SubscriptionModel.findById(editId);
    if (!subscription) {
      return res.status(404).json(new ApiResponse(404, null, "Subscription not found."));
    }

    // Update the planName field only
    subscription.subscriptionType = planName;

    // Save the updated subscription
    await subscription.save();

    return res.status(200).json(new ApiResponse(200, subscription, "Subscription updated successfully."));
  } catch (error) {
    console.error("Error updating subscription:", error);
    return res.status(500).json(new ApiResponse(500, null, "Server error."));
  }
});

const adminenquiryManagement = asyncHandler(async (req, res) => {
  let { page,limit} = req.query;

  // Validate and convert page and limit to integers
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  if (isNaN(page) || page <= 0) {
    page = 1;
  }
  if (isNaN(limit) || limit <= 0) {
    limit = 10;
  }

  // Convert to integers for use in the aggregation query
  try{
    const options = {
      page,
      limit,
    };
    // Perform the aggregation query
    const aggregate = Enquiry.aggregate([
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $lookup: {
          from: "propertyadds",
          localField: "propertyId",
          foreignField: "_id",
          as: "propertyDetails",
        },
      },
      { $unwind: "$propertyDetails" },
      {
        $lookup: {
          from: "users",
          localField: "propertyDetails.ownerId",
          foreignField: "_id",
          as: "ownerDetails",
        },
      },
      { $unwind: "$ownerDetails" },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      {
        $unwind: "$userDetails"
      },
    ]);

  const enquiries  = await Enquiry.aggregatePaginate(aggregate, options);
  return res.status(200).render("pages/enquiryManagement", {enquiries});
  }catch(error){
    console.error("Error fetching property list:", error);

    // Handle errors
    return new ApiError(500, "Internal Server Error");
  }
});

const adminContactManagement = asyncHandler(async (req, res) => {
  let { page , limit } = req.query;
  page = Number(page);
  limit = Number(limit);
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  if (isNaN(page) || page <= 0) {
    page = 1;
  }
  if (isNaN(limit) || limit <= 0) {
    limit = 10;
  }
  // Convert page and limit to integers
  try{
    const options = {
      page,
      limit,
    };
    const aggregate = Contact.aggregate([
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $lookup: {
          from: "users",             
          localField: "userId",      
          foreignField: "_id",       
          as: "userDetails"          
        }
      },
    ])

    // Execute the aggregation
    const contactDetails = await Contact.aggregatePaginate(aggregate,options)
    // Pass the result to the template
    return res.status(200).render("pages/contactManagement", {contactDetails});
  }catch(error){
    console.error("Error fetching property list:", error);

    // Handle errors
    return new ApiError(500, "Internal Server Error");
  }
});

const replyToEnquiry = asyncHandler(async (req, res) => {
  const { enquiryId, replyMessage, contactFlag } = req.body;
  
  if (!enquiryId || !replyMessage) {
      return res.status(400).json({ message: 'Enquiry ID and reply message are required.' });
  }

  let enquiry;
  if (contactFlag) {
    enquiry = await Contact.findById(enquiryId).populate('userId');
  } else {
    enquiry = await Enquiry.findById(enquiryId).populate('userId');
  }

  if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found.' });
  }

  enquiry.adminReply = replyMessage;
  await enquiry.save();

  // Define the variables for the template
  const emailVariables = {
    emailTitle: 'Reply to Your Enquiry',
    emailGreeting: `Hello, ${enquiry.userId.userName}`,
    emailBody: `Admin has replied to your enquiry:<br><br>"${replyMessage}"<br><br>Thank you.`,
    emailFooter: 'Best regards, Real Estate'
  };


  console.log(emailVariables)
  // Send email to user
  try {
      await sendEmail(
          enquiry.userId.email, 
          'Reply to Your Enquiry', 
          emailVariables // Pass the variables to be replaced in the template
      );
  } catch (error) {
      return res.status(500).json({ message: 'Failed to send email.' });
  }

  res.status(200).json({ message: 'Email sent successfully.' });
});

const adminContentManagement = asyncHandler(async (req, res) => {
  let { page , limit } = req.query;
  page = Number(page);
  limit = Number(limit);
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  if (isNaN(page) || page <= 0) {
    page = 1;
  }
  if (isNaN(limit) || limit <= 0) {
    limit = 10;
  }
  // Convert page and limit to integers
  try{
    const options = {
      page,
      limit,
    };
    const aggregate = City.aggregate([
      {
        $sort: {
          createdAt: -1,
        },
      },
    ])

    // Execute the aggregation
    const contentDetails = await City.aggregatePaginate(aggregate,options)
    // Pass theresult to the template
    return res.status(200).render("pages/FrontendFeaturedProperty", {contentDetails});
  }catch(error){
    console.error("Error fetching property list:", error);

    // Handle errors
    return new ApiError(500, "Internal Server Error");
  }
});

const addEditCity = asyncHandler(async (req, res) => {
  const { locationName, isfeatured, del, editId } = req.body;
  let image;
  let newloca;
  
  console.log("isfeatured", isfeatured);
  
  if (locationName) {
    newloca = JSON.parse(locationName);
  }
  
  if (req.file) {
    image = `/temp/${req.file.filename}`; // Path to the uploaded image within the temp folder
    console.log(image)
  }

  if (del) {
    // Handle deletion
    const cityToDelete = await City.findByIdAndDelete(editId);
    if (!cityToDelete) {
      return res.status(404).json(new ApiResponse(404, null, "City not found"));
    }
    return res.status(200).json(new ApiResponse(200, null, "City deleted successfully"));
  }

  if (editId) {
    // Handle editing
    const city = await City.findById(editId);
    if (!city) {
      return res.status(404).json(new ApiResponse(404, null, "City not found"));
    }

    // Only update the image if a new one is provided
    const updatedCity = await City.findByIdAndUpdate(
      editId,
      {
        image: image || city.image, // Preserve the old image if no new image is provided
        locationName: newloca,
        isfeatured,
      },
      { new: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedCity, "City updated successfully"));
  }

  // Handle creation if neither del nor editId
  const newCity = await City.create({
    image,
    locationName: newloca,
    isfeatured,
  });

  return res.status(201).json(new ApiResponse(201, newCity, "City added successfully"));
});

// const getUserStatistics = asyncHandler(async (req, res, next) => {
//   try {
//     const { userType, period } = req.body;
//     console.log(req.body)

//     // Start and end dates for monthly or yearly aggregation
//     const startDate = period === 'monthly'
//       ? moment().startOf('month').toDate()
//       : moment().startOf('year').toDate();

//     const matchConditions = {
//       createdAt: { $gte: startDate },
//     };

//     // If a userType is provided, add it to the match conditions
//     if (userType) {
//       matchConditions.userType = userType;
//     }
//     console.log(matchConditions)

//     const userStats = await User.aggregate([
//       { $match: matchConditions },
//       {
//         $group: {
//           _id: {
//             year: { $year: "$createdAt" },
//             month: { $month: "$createdAt" },
//             userType: "$userType",
//           },
//           count: { $sum: 1 },
//         },
//       },
//       {
//         $group: {
//           _id: { year: "$_id.year", month: "$_id.month" },
//           userTypes: {
//             $push: { type: "$_id.userType", count: "$count" },
//           },
//           total: { $sum: "$count" },
//         },
//       },
//       {
//         $group: {
//           _id: "$_id.year",
//           monthlyStats: {
//             $push: {
//               month: "$_id.month",
//               userTypes: "$userTypes",
//               total: "$total",
//             },
//           },
//           yearly: {
//             $push: {
//               month: "$_id.month",
//               userTypes: "$userTypes",
//               total: "$total",
//             },
//           },
//           total: { $sum: "$total" },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           year: "$_id",
//           total: 1,
//           monthlyStats: 1,
//         },
//       },
//       {
//         $sort: { year: 1 },
//       },
//     ]);

//     res.status(200).json({
//       success: true,
//       data: userStats,
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// const getUserStatistics = asyncHandler(async (req, res, next) => {
//   try {
//     const { userType } = req.body;

//     // Start and end dates for monthly or yearly aggregation
//     const startDate = moment().startOf('year').toDate(); // Use year for aggregation

//     const matchConditions = {};

//     // If a userType is provided, add it to the match conditions
//     if (userType) {
//       matchConditions.userType = userType;
//     }

//     const userStats = await User.aggregate([
//       { $match: matchConditions },
//       {
//         $group: {
//           _id: {
//             year: { $year: "$createdAt" },
//             month: { $month: "$createdAt" },
//             userType: "$userType",
//           },
//           count: { $sum: 1 },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             year: "$_id.year",
//             month: "$_id.month",
//           },
//           userTypes: {
//             $push: { type: "$_id.userType", count: "$count" },
//           },
//           total: { $sum: "$count" },
//         },
//       },
//       {
//         $group: {
//           _id: "$_id.year",
//           months: {
//             $push: {
//               month: "$_id.month",
//               userTypes: "$userTypes",
//               total: "$total",
//             },
//           },
//           yearlyTotal: { $sum: "$total" },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           year: "$_id",
//           total: "$yearlyTotal",
//           months: 1,
//         },
//       },
//       {
//         $sort: { year: 1 },
//       },
//     ]);

//     // Transform the data into the desired format
//     const formattedStats = userStats.map(yearlyData => {
//       const months = yearlyData.months.map(monthData => {
//         // Convert month number to month name
//         const monthName = moment().month(monthData.month - 1).format('MMMM');
        
//         // Create user type breakdown
//         const userTypes = monthData.userTypes.reduce((acc, type) => {
//           acc[type.type] = type.count;
//           return acc;
//         }, {});
//         userTypes["total"] = monthData.total;

//         return {
//           month: monthName,
//           users: userTypes,
//         };
//       });

//       return {
//         year: yearlyData.year,
//         totalUser: yearlyData.total,
//         months,
//       };
//     });

//     // Format the response based on the presence of userType
//     const response = userType
//       ? {
//           success: true,
//           data: formattedStats,
//         }
//       : {
//           success: true,
//           data: {
//             totalUsersByMonth: formattedStats,
//             totalUsersByYear: formattedStats.reduce((acc, yearData) => {
//               acc[yearData.year] = yearData.totalUser;
//               return acc;
//             }, {}),
//           },
//         };

//     res.status(200).json(response);
//   } catch (error) {
//     next(error);
//   }
// });

const getUserStatistics = asyncHandler(async (req, res, next) => {
  try {
    const { type, userType } = req.body;

    // Initialize match conditions, group field, and date format based on type
    let matchCondition, groupField, formatDate;
    let aggregationPipeline = [];

    if (type == 1) {
      // Weekly Data (Day-wise)
      const startOfWeek = moment().startOf('week').toDate();
      const endOfWeek = moment().endOf('week').toDate();

      matchCondition = {
        createdAt: {
          $gte: startOfWeek,
          $lte: endOfWeek,
        },
      };
      groupField = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
      };
      formatDate = 'YYYY-MM-DD';
    } else if (type == 2) {
      // Monthly Data (Month-wise)
      const startOfYear = moment().startOf('year').toDate();
      const endOfYear = moment().endOf('year').toDate();

      matchCondition = {
        createdAt: {
          $gte: startOfYear,
          $lte: endOfYear,
        },
      };
      groupField = {
        $dateToString: { format: "%Y-%m", date: "$createdAt" },
      };
      formatDate = 'YYYY-MM';
    } else {
      return res.status(400).json(new ApiResponse(400, null, "Invalid type"));
    }

    // If userType is provided, add it to the match condition
    if (userType) {
      matchCondition.userType = userType;
    }

    // Aggregate users based on type (weekly/monthly) and group by date and userType
    aggregationPipeline = [
      { $match: matchCondition },
      {
        $group: {
          _id: {
            period: groupField,
            userType: "$userType",
          },
          totalUsers: { $sum: 1 },
        },
      },
      { $sort: { "_id.period": 1 } },
    ];

    const userStats = await User.aggregate(aggregationPipeline);

    // Create a list of all required periods (days or months)
    let periodsOfTime = [];
    if (type == 1) {
      // Weekly Data (Day-wise)
      const startOfWeek = moment().startOf('week');
      for (let i = 0; i < 7; i++) {
        periodsOfTime.push(startOfWeek.clone().add(i, 'days').format(formatDate));
      }
    } else if (type == 2) {
      // Monthly Data (Month-wise)
      const startOfYear = moment().startOf('year');
      for (let i = 0; i < 12; i++) {
        periodsOfTime.push(startOfYear.clone().add(i, 'months').format(formatDate));
      }
    }

    // Initialize default statistics for each period
    let defaultStats = periodsOfTime.map(period => {
      const periodDate = moment(period, formatDate);
      return {
        period: periodDate.format('MMMM YYYY'), // Month name and year
        totalUsers: 0,
        UserType1: 0,
        UserType2: 0,
        UserType3: 0
      };
    });

    // Map the user statistics to each period and userType
    userStats.forEach(stat => {
      const periodIndex = defaultStats.findIndex(item => moment(item.period, 'MMMM YYYY').isSame(moment(stat._id.period, 'YYYY-MM'), 'month'));
      if (periodIndex !== -1) {
        defaultStats[periodIndex].totalUsers += stat.totalUsers;
        if (stat._id.userType === "1") defaultStats[periodIndex].UserType1 = stat.totalUsers;
        if (stat._id.userType === "2") defaultStats[periodIndex].UserType2 = stat.totalUsers;
        if (stat._id.userType === "3") defaultStats[periodIndex].UserType3 = stat.totalUsers;
      }
    });

    // Calculate the total users across all periods
    const totalUserSum = defaultStats.reduce((acc, period) => acc + period.totalUsers, 0);

    const response = {
      totals: defaultStats,
      totalSum: totalUserSum,
    };

    return res.status(200).json(new ApiResponse(200, response, "User statistics successfully retrieved"));
  } catch (error) {
    next(error);
  }
});

const getWeeklyUserStatistics = asyncHandler(async (req, res, next) => {
  try {
    const { userType } = req.body;

    // Calculate the start and end of the current week
    const startOfWeek = moment().startOf('week').toDate();
    const endOfWeek = moment().endOf('week').toDate();

    let matchCondition = {
      createdAt: {
        $gte: startOfWeek,
        $lte: endOfWeek,
      },
    };

    if (userType) {
      matchCondition.userType = userType;
    }

    const aggregationPipeline = [
      { $match: matchCondition },
      {
        $group: {
          _id: {
            day: { $dayOfWeek: "$createdAt" }, // Group by day of the week
            userType: "$userType",
          },
          totalUsers: { $sum: 1 },
        },
      },
      { $sort: { "_id.day": 1 } },
    ];

    const userStats = await User.aggregate(aggregationPipeline);

    // Create an array for all days of the week
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let defaultStats = daysOfWeek.map(day => ({
      day: day,
      totalUsers: 0,
      UserType1: 0,
      UserType2: 0,
      UserType3: 0,
    }));

    // Map the user statistics to each day
    userStats.forEach(stat => {
      const dayIndex = stat._id.day - 1; // MongoDB dayOfWeek starts with 1 (Sunday)
      defaultStats[dayIndex].totalUsers += stat.totalUsers;
      if (stat._id.userType === "1") defaultStats[dayIndex].UserType1 = stat.totalUsers;
      if (stat._id.userType === "2") defaultStats[dayIndex].UserType2 = stat.totalUsers;
      if (stat._id.userType === "3") defaultStats[dayIndex].UserType3 = stat.totalUsers;
    });

    const totalUserSum = defaultStats.reduce((acc, day) => acc + day.totalUsers, 0);

    const response = {
      totals: defaultStats,
      totalSum: totalUserSum,
    };

    return res.status(200).json(new ApiResponse(200, response, "Weekly user statistics successfully retrieved"));
  } catch (error) {
    next(error);
  }
});

const getMonthlyUserStatistics = asyncHandler(async (req, res, next) => {
  try {
    const { userType } = req.body;

    // Calculate the start and end of the current year
    const startOfYear = moment().startOf('year').toDate();
    const endOfYear = moment().endOf('year').toDate();

    let matchCondition = {
      createdAt: {
        $gte: startOfYear,
        $lte: endOfYear,
      },
    };

    if (userType) {
      matchCondition.userType = userType;
    }

    const aggregationPipeline = [
      { $match: matchCondition },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" }, // Group by month
            userType: "$userType",
          },
          totalUsers: { $sum: 1 },
        },
      },
      { $sort: { "_id.month": 1 } },
    ];

    const userStats = await User.aggregate(aggregationPipeline);

    // Create an array for all months of the year
    const monthsOfYear = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    let defaultStats = monthsOfYear.map(month => ({
      month: month,
      totalUsers: 0,
      UserType1: 0,
      UserType2: 0,
      UserType3: 0,
    }));

    // Map the user statistics to each month
    userStats.forEach(stat => {
      const monthIndex = stat._id.month - 1; // MongoDB month starts with 1 (January)
      defaultStats[monthIndex].totalUsers += stat.totalUsers;
      if (stat._id.userType === "1") defaultStats[monthIndex].UserType1 = stat.totalUsers;
      if (stat._id.userType === "2") defaultStats[monthIndex].UserType2 = stat.totalUsers;
      if (stat._id.userType === "3") defaultStats[monthIndex].UserType3 = stat.totalUsers;
    });

    const totalUserSum = defaultStats.reduce((acc, month) => acc + month.totalUsers, 0);

    const response = {
      totals: defaultStats,
      totalSum: totalUserSum,
    };

    return res.status(200).json(new ApiResponse(200, response, "Monthly user statistics successfully retrieved"));
  } catch (error) {
    next(error);
  }
});





export {
  loginAdmin,
  logoutAdmin,
  getLoginAdmin,
  dashboredAdmin,
  updateVerificationStatus,
  propertyTypeCreate,
  propTypeList,
  userList,
  userDetails,
  editDelUser,
  filterUsersByVerification,
  updateUser,
  getUserActivity,
  resetPassword,
  getPropertyList,
  editdelProperty,
  subPropertyTypeCreate,
  subPropCategoryTypeList,
  subscription,
  addEditSubscription,
  adminsubscriptionManagement,
  addEditSubscriptionPlan,
  editSubscription,
  updateFeatureStatus,
  adminenquiryManagement,
  adminContactManagement,
  replyToEnquiry,
  getForgotPassword,
  adminForgotPassword,
  getResetPage,
  resetPasswordHandler,
  adminContentManagement,
  addEditCity,
  getUserStatistics,
  getWeeklyUserStatistics,
  getMonthlyUserStatistics
};
