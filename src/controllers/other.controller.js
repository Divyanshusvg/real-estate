import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"

import { ApiResponse } from "../utils/ApiResponse.js";
import PropertyAdd from "../models/propertyAdd.modal.js";
import { PropType } from "../models/propertyType.modal.js";
import subscriptionManagement from "../models/subscriptionManagement.modal.js";

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
      const aggregate = PropType.aggregate([
      ]);
  
      // Check if there are properties available
      const prop = await PropType.aggregatePaginate(aggregate, options);
  
      
      return res.status(200).json(new ApiResponse(200,prop,"Properties fetched successfully"))
    } catch (error) {
      // Log the error for debugging
      console.error("Error fetching property list:", error);
  
      // Handle errors
      return new ApiError(500, "Internal Server Error");
    }
  });

  const getAllSubscriptions = asyncHandler(async (req, res) => {
    try {
      // Fetch all subscription plans with the specified fields using $match and $project
      const subscriptionPlans = await subscriptionManagement.aggregate([
        {
          $match: {}, // Match all documents
        },
      ]);
  
      if (subscriptionPlans.length === 0) {
        return res
          .status(404)
          .json(
            new ApiResponse(404, null, "No subscription plans found.")
          );
      }
  
      return res
        .status(200)
        .json(
          new ApiResponse(200, subscriptionPlans, "Subscription plans fetched successfully")
        );
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      return res
        .status(500)
        .json(
          new ApiResponse(500, null, "Server error.")
        );
    }
  });
export {
    getPropertyList,
    getAllSubscriptions
}