import express from "express";
import { adminLogin, adminLogout } from "../controllers/adminController.js";

const router = express.Router();

router.post("/admin-login", adminLogin);
router.post("/admin-logout", adminLogout); // logout route

export default router;