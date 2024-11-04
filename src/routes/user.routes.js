import { Router } from "express";
import { 
    loginUser, 
    logoutUser, 
    registerUser,
    refreshAccessToken, 
    getCurrentUser, 
    uploadImage, 
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
    uploadVideos,
    userForgotPassword
} from "../controllers/user.controller.js";

import {upload,uploadVideo,handleMulterErrors} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";



const router = Router()
router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route('/uploadimages').post(upload.array('files', 10),handleMulterErrors, uploadImage); 
router.route('/uploadvideos').post(uploadVideo.array('files', 5),handleMulterErrors, uploadVideos); 
router.route("/getAllProperties").post(getAllProperties )
router.route("/getPropertyType").post(getPropertyType )

//secured routes
router.route("/logout").post(verifyJWT,  logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/me").get(verifyJWT, getCurrentUser)
router.route("/addProperty").post(verifyJWT, addProperty)
router.route("/getSubcategories").post(getSubcategories)
router.route("/updateUserProfile").post(verifyJWT, updateUserProfile)
router.route("/updateUserPassword").post(verifyJWT, updateUserPassword)
router.route("/deleteUserAccount").post(verifyJWT, deleteUserAccount)
router.route("/updateUserFavorites").post(verifyJWT, updateUserFavorites)
router.route("/addPropertyViewAndContacts").post(verifyJWT, addPropertyViewAndContacts)
router.route("/customerServiceRequest").post(verifyJWT,customerServiceRequest)                         
router.route("/enquireNow").post(verifyJWT,enquireNow)                         
router.route("/userForgotPassword").post(userForgotPassword)                         
export default router