import User from "../models/User.js"
import Lead from "../models/Lead.js";


export const getUsers = async (req, res) => {
    try {

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
            }

        ]);

        res.json(users);

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


export const updateUser = async (req, res) => {

    const user = await User.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    )

    res.json(user)

}

export const deleteUser = async (req, res) => {

    await User.findByIdAndDelete(req.params.id)

    res.json({ message: "User deleted" })

}