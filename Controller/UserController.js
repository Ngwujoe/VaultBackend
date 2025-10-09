// controllers/userController.js
import User from "../Models/User.js";
import jwt from "jsonwebtoken";

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// @desc    Login user & get token
// @route   POST /users/login
// @access  Public
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`❌ Login failed: User with email ${email} not found`);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log(`User found: ${user.email}`);
    console.log(`Stored hashed password: ${user.password}`);
    console.log(`Entered password: ${password}`);

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      console.log("❌ Password does not match");
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("✅ Password match, login successful");

    // Record login activity
    user.loginActivities.push({ action: "Login into dashboard" });
    await user.save();

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      accountNumber: user.accountNumber,
      balance: user.balance,
      token: generateToken(user._id),
      loginActivities: user.loginActivities, // ✅ include activities
    });
  } catch (error) {
    console.error("❌ Server error during login:", error);
    res.status(500).json({ message: "Server error", error });
  }

};
