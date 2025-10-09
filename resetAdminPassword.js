import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./Models/User.js"; // make sure the path is correct

mongoose.connect("mongodb://127.0.0.1:27017/vaultDB")
  .then(async () => {
    const user = await User.findOne({ email: "admin@vault.com" });
    if (!user) return console.log("Admin not found");

    const newPassword = "Admin123"; // your new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    console.log("✅ Admin password reset to:", newPassword);
    process.exit(0);
  })
  .catch(err => console.error(err));
