import Lead from "../models/Lead.js";
import User from "../models/User.js";


// ================= LEAD REPORT =================

export const getLeadReport = async (req, res) => {
    try {

        let filter = {};

        // non-admin → only own leads
        if (req.user.role !== "admin") {
            filter.assignedTo = req.user.id;
        }

        const totalLeads = await Lead.countDocuments(filter);

        const statusReport = await Lead.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const sourceReport = await Lead.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$source",
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            totalLeads,
            statusReport,
            sourceReport
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};



// ================= SALES REPORT =================

export const getSalesReport = async (req, res) => {
    try {

        let filter = {};

        if (req.user.role !== "admin") {
            filter.assignedTo = req.user.id;
        }

        const totalLeads = await Lead.countDocuments(filter);

        const convertedLeads = await Lead.countDocuments({
            ...filter,
            status: "Won"
        });

        const lostLeads = await Lead.countDocuments({
            ...filter,
            status: "Lost"
        });

        const revenue = await Lead.aggregate([
            {
                $match: {
                    ...filter,
                    status: "Won"
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$expectedValue" }
                }
            }
        ]);

        const conversionRate = totalLeads
            ? ((convertedLeads / totalLeads) * 100).toFixed(2)
            : 0;

        res.json({
            success: true,
            totalLeads,
            convertedLeads,
            lostLeads,
            conversionRate: conversionRate + "%",
            revenue: revenue[0]?.totalRevenue || 0
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};



// ================= CONVERSION REPORT =================

export const getConversionReport = async (req, res) => {
    try {

        const result = await Lead.aggregate([
            {
                $group: {
                    _id: null,
                    totalLeads: { $sum: 1 },
                    converted: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "Won"] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        const total = result[0]?.totalLeads || 0;
        const converted = result[0]?.converted || 0;

        const rate = total
            ? ((converted / total) * 100).toFixed(2)
            : 0;

        res.json({
            success: true,
            totalLeads: total,
            convertedLeads: converted,
            conversionRate: rate + "%"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};



// ================= SALES PERFORMANCE =================

export const getSalesPerformance = async (req, res) => {
    try {

        const executives = await User.find({ role: "executive" });

        const report = [];

        for (const exec of executives) {

            const totalLeads = await Lead.countDocuments({
                assignedTo: exec._id
            });

            const closedLeads = await Lead.countDocuments({
                assignedTo: exec._id,
                status: "Won"
            });

            const pendingLeads = await Lead.countDocuments({
                assignedTo: exec._id,
                status: { $ne: "Won" }
            });

            const revenue = await Lead.aggregate([
                {
                    $match: {
                        assignedTo: exec._id,
                        status: "Won"
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$expectedValue" }
                    }
                }
            ]);

            report.push({
                executiveId: exec._id,
                name: exec.name,
                totalLeads,
                closedLeads,
                pendingLeads,
                conversionRate: totalLeads
                    ? ((closedLeads / totalLeads) * 100).toFixed(2) + "%"
                    : "0%",
                revenue: revenue[0]?.totalRevenue || 0
            });

        }

        res.json({
            success: true,
            report
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};



// ================= EXECUTIVE SALES REPORT =================

export const executiveSalesReport = async (req, res) => {
    try {

        const report = await Lead.aggregate([
            {
                $group: {
                    _id: "$assignedTo",
                    totalLeads: { $sum: 1 },

                    converted: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "Won"] }, 1, 0]
                        }
                    },

                    revenue: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", "Won"] },
                                "$expectedValue",
                                0
                            ]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "executive"
                }
            },
            { $unwind: "$executive" }
        ]);

        res.json({
            success: true,
            report
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};