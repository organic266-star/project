// routes/profileRoutes.js
import express from "express";
import { getUserProfile, updateUserProfile } from "../routControler/profileController.js";
import isLogin from "../middleware/isLogin.js";

const router = express.Router();

// Protected routes
router.get("/me", isLogin, getUserProfile);
router.put("/me", isLogin, updateUserProfile);

export default router;
