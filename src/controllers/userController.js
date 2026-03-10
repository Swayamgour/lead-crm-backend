import User from "../models/User.js"

export const getUsers = async (req, res) => {

    try {

        const users = await User
            .find({ role: { $ne: "admin" } })   // admin exclude
            .select("-password");

        res.json(
            users
        );

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