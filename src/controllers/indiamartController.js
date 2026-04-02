import Lead from "../models/Lead.js";

export const receiveLead = async (req, res) => {
    try {
        console.log("IndiaMART Lead:", req.body);

        // 👇 mapping karna (important)
        const leadData = {
            name: req.body.SENDER_NAME || req.body.name,
            mobile: req.body.SENDER_MOBILE || req.body.mobile,
            email: req.body.SENDER_EMAIL || "",
            product: req.body.QUERY_PRODUCT_NAME || "",
            message: req.body.QUERY_MESSAGE || "",
            city: req.body.SENDER_CITY || "",
            source: "IndiaMART"
        };

        // 👇 DB me save
        await Lead.create(leadData);

        res.status(200).send("Lead received");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error");
    }
};