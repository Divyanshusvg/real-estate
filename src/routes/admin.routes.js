import { Router } from "express";
import { loginAdmin,
    getLoginAdmin,
    logoutAdmin,
    dashboredAdmin,
    propertyTypeCreate,
    propTypeList,
    userList,userDetails,
    editDelUser,
    filterUsersByVerification,
    updateVerificationStatus,
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

} from "../controllers/admin/admin.controller.js";
import {upload,uploadVideo,handleMulterErrors} from "../middlewares/multer.middleware.js"
import { isAdmin } from "../middlewares/auth.middleware.js";
const router = Router()



router.route("/").get(isAdmin , dashboredAdmin)
router.route("/login").post(loginAdmin)
router.route("/login").get(getLoginAdmin)
router.route("/forgotPassword").get(getForgotPassword)
router.route("/adminforgotPassword").post(adminForgotPassword)
router.route("/resetPasswordHandler/:token").post(resetPasswordHandler)
router.route("/reset/:token").get(getResetPage)
router.route("/logout").get(isAdmin ,logoutAdmin)
router.route("/proptype").post(isAdmin , propertyTypeCreate)
router.route("/mangeProp").get(isAdmin , propTypeList)
router.route("/userlist").get(isAdmin , userList)
router.route('/details').get(isAdmin, userDetails);
router.route('/editdel').post(isAdmin, editDelUser);
router.get('/verify', filterUsersByVerification);
router.post('/updateVerificationStatus', updateVerificationStatus);
router.post('/updateFeatureStatus', updateFeatureStatus);
router.post('/updateUser',isAdmin,updateUser)     
router.post('/getUserActivity',isAdmin,getUserActivity)     
router.post('/resetPassword',isAdmin,resetPassword);
router.get('/propertyList', isAdmin, getPropertyList);
router.post('/editProperty',isAdmin,editdelProperty);
router.route("/subPropertyTypeCreate").post(isAdmin , subPropertyTypeCreate)
router.route("/subCategory").get(isAdmin , subPropCategoryTypeList)
router.route("/subscription").get(isAdmin , subscription)
router.route("/subscriptionManagement").get(isAdmin , adminsubscriptionManagement)
router.route("/addEditSubscription").post(isAdmin , addEditSubscription) 
router.route("/addEditSubscriptionPlan").post(isAdmin , addEditSubscriptionPlan) 

router.route("/editSubscription").post(isAdmin , editSubscription) 
router.route("/enquiryManagement").get(isAdmin , adminenquiryManagement) 
router.route("/contactManagement").get(isAdmin , adminContactManagement) 
router.route("/contentManagement").get(isAdmin , adminContentManagement) 
router.route("/replyToEnquiry").post(isAdmin , replyToEnquiry) 
router.route("/addEditCity").post(upload.single('image'),handleMulterErrors, addEditCity)
router.route("/getUserStatistics").post(isAdmin , getUserStatistics) 
router.route("/getWeeklyUserStatistics").post(isAdmin , getWeeklyUserStatistics) 
router.route("/getMonthlyUserStatistics").post(isAdmin , getMonthlyUserStatistics) 


export default router