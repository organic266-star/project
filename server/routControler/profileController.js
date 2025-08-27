// routController/profileController.js
import User from "../schema/userSchema.js";  // adjust path if needed

// ✅ Get user profile
export const getUserProfile = async (req, res) => {
  try {
    // req.user is already populated by isLogin middleware
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const { fullname, profilepic, role, skills, lookingFor } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,   // comes from isLogin
      { fullname, profilepic, role, skills, lookingFor },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};