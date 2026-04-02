import Lead from "../models/Lead.js";
import Executive from "../models/Executive.js";
import User from "../models/User.js";

export const receiveLead = async (req, res) => {
    try {
        // console.log("IndiaMART Lead:", req.body);

        const data = req.body?.RESPONSE || {};

        const leadData = {
            name: data.SENDER_NAME || "",
            mobile: data.SENDER_MOBILE || "",
            email: data.SENDER_EMAIL || "",
            product: data.QUERY_PRODUCT_NAME || "",
            message: data.QUERY_MESSAGE || "",
            city: data.SENDER_CITY || "",
            state: data.SENDER_STATE || "",
            company: data.SENDER_COMPANY || "",
            address: data.SENDER_ADDRESS || "",
            pincode: data.SENDER_PINCODE || "",
            queryType: data.QUERY_TYPE || "",
            queryTime: data.QUERY_TIME || "",
            uniqueId: data.UNIQUE_QUERY_ID || "",
            subject: data.SUBJECT || "",
            source: "IndiaMART"
        };

        // ✅ duplicate avoid
        const exists = await Lead.findOne({ uniqueId: leadData.uniqueId });

        if (!exists) {

            // 🔥 1. Active executives nikaal
            const executives = await User.find({ isActive: true  , role: "executive" }).sort({ createdAt: 1 });

            // console.log("executives", executives)

            if (executives.length > 0) {

                // 🔥 2. Last assigned lead find kar
                const lastLead = await Lead.findOne({ assignedTo: { $ne: null } })
                    .sort({ createdAt: -1 });

                let nextExecutive;

                if (!lastLead) {
                    // first lead
                    nextExecutive = executives[0];
                } else {
                    const lastIndex = executives.findIndex(
                        (e) => e._id.toString() === lastLead.assignedTo?.toString()
                    );

                    const nextIndex = (lastIndex + 1) % executives.length;
                    nextExecutive = executives[nextIndex];
                }

                // ✅ assign kar
                leadData.assignedTo = nextExecutive._id;

                console.log(leadData.assignedTo, 'kjhgfd')
            }

            await Lead.create(leadData);
        }

        res.status(200).send("Lead received");

    } catch (error) {
        console.error("ERROR:", error);
        res.status(200).send("Handled");
    }
};