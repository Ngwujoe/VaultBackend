import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./Models/User.js";
import { sendEmail } from "./Utils/Email.js";

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    const { firstName, lastName, phone, email, password } = req.body;

    if (!firstName || !lastName || !phone || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      phone,
      email,
      password: hashedPassword,
      role: "user",
      accountNumber: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
    });

    // Send account number email
    await sendEmail(
      newUser.email,
      "Welcome to VoltaBancad'italia!",
      `Hello ${newUser.firstName},\n\nWelcome to Vault Bank! 🎉
      
Your account has been successfully created.
Here are your details:
      
Account Number: ${newUser.accountNumber}
Email: ${newUser.email}

Please keep your account number safe and secure.

Thank you for joining VoltaBancad'italia!!
- The VoltaBancad'italia Team 
copyright @VoltaBancad'italia 2025`

    );

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET || "default_secret", {
      expiresIn: "7d",
    });

    res.status(201).json({
      _id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      accountNumber: newUser.accountNumber,
      balance: newUser.balance,
      token,
    });
  } catch (err) {
    console.error("❌ Register Error:", err);
    next(err);
  }
});

export default router;
