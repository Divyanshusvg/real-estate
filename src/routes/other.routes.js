import { Router } from "express";
import { getPropertyList,getAllSubscriptions } from "../controllers/other.controller.js";


const router = Router()

router.route("/getOtherPropertyList").get(getPropertyList)
router.route("/getAllSubscriptions").get(getAllSubscriptions) 
export default router