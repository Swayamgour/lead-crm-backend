import Lead from "../models/Lead.js";

export const receiveLead = async (req, res) => {
    try {
        console.log("IndiaMART Lead:", req.body);

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
            await Lead.create(leadData);
        }

        res.status(200).send("Lead received");

    } catch (error) {
        console.error("ERROR:", error);
        res.status(200).send("Handled"); // ❗ IndiaMART ke liye 200 hi bhejna
    }
};