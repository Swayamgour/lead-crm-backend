import User from "../models/User.js"
import Lead from "../models/Lead.js";
import bcrypt from "bcryptjs";


export const getUsers = async (req, res) => {
    try {
        // Get pagination parameters from query string
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get total count for pagination info
        const totalUsers = await User.countDocuments({ role: { $ne: "admin" } });

        const users = await User.aggregate([
            {
                $match: { role: { $ne: "admin" } }
            },
            {
                $lookup: {
                    from: "leads",
                    localField: "_id",
                    foreignField: "assignedTo",
                    as: "leads"
                }
            },
            {
                $addFields: {
                    totalLeads: { $size: "$leads" },
                    wonLeads: {
                        $size: {
                            $filter: {
                                input: "$leads",
                                as: "lead",
                                cond: { $eq: ["$$lead.status", "Won"] }
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    accuracy: {
                        $cond: [
                            { $eq: ["$totalLeads", 0] },
                            0,
                            {
                                $multiply: [
                                    { $divide: ["$wonLeads", "$totalLeads"] },
                                    100
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $project: {
                    password: 0,
                    leads: 0
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ]);

        // Return paginated response
        res.json({
            success: true,
            data: users,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalUsers / limit),
                totalItems: totalUsers,
                itemsPerPage: limit,
                hasNextPage: page < Math.ceil(totalUsers / limit),
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const createUser = async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;

        const user = await User.create({
            name,
            phone,
            email,
            password,
            avatar: req.file ? `/uploads/${req.file.filename}` : null
        });

        res.json({
            success: true,
            user
        });

    } catch (error) {

        // 🔥 Duplicate error handle
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];

            let message = "Duplicate field";

            if (field === "email") {
                message = "Email already exists";
            } else if (field === "phone") {
                message = "Phone number already exists";
            }

            return res.status(400).json({
                success: false,
                field,
                message
            });
        }

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updateUser = async (req, res) => {
    console.log("BODY:", req.body);
    try {
        const user = await User.findById(req.params.id).select("+password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const { password, ...rest } = req.body;

        // 🧠 normal fields update
        Object.assign(user, rest);

        // 🔐 password update (IMPORTANT)
        if (password && password.trim() !== "") {
            user.password = password; // 👉 plain assign
        }

        await user.save(); // 🔥 middleware run hoga

        const updatedUser = await User.findById(user._id).select("-password");

        res.json({
            success: true,
            user: updatedUser
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


export const getUserById = async (req, res) => {
    try {

        const user = await User.findById(req.params.id)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        res.status(200).json(user)

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        })

    }
}








export const deleteUser = async (req, res) => {

    await User.findByIdAndDelete(req.params.id)

    res.json({ message: "User deleted" })

}