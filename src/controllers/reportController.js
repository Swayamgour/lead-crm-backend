import Lead from "../models/Lead.js"

export const getLeadReport = async (req, res) => {

    try {

        let filter = {}

        // if not admin → only own leads
        if (req.user.role !== "admin") {
            filter.assignedTo = req.user.id
        }

        const totalLeads = await Lead.countDocuments(filter)

        const statusReport = await Lead.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ])

        const sourceReport = await Lead.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$source",
                    count: { $sum: 1 }
                }
            }
        ])

        res.json({
            totalLeads,
            statusReport,
            sourceReport
        })

    } catch (err) {

        res.status(500).json({ message: err.message })

    }

}


export const getSalesReport = async (req, res) => {

    try {

        let filter = {}

        if (req.user.role !== "admin") {
            filter.assignedTo = req.user.id
        }

        const report = await Lead.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$assignedTo",
                    totalLeads: { $sum: 1 },
                    totalValue: { $sum: "$expectedValue" }
                }
            }
        ])

        res.json(report)

    } catch (err) {

        res.status(500).json({ message: err.message })

    }

}