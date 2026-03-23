import User from "../models/User.js";
import bcrypt from "bcryptjs";

export const seedAdmin = async () => {
    try {
        const existingAdmin = await User.findOne({ role: "admin" });

        if (existingAdmin) {
            console.log("✅ Admin already exists");
            return;
        }

        const hashedPassword = await bcrypt.hash("Admin@123", 10);

        await User.create({
            name: "Admin",
            email: "admin@daryoo.com",
            password: 'Admin@123',
            phone:'9090909090',
            role: "admin"
        });

        console.log("🔥 Admin created successfully");

    } catch (error) {
        console.error("❌ Admin seeding error:", error.message);
    }
};