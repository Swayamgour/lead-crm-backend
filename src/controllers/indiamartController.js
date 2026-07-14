import Lead from "../models/Lead.js";
import Executive from "../models/Executive.js";
import User from "../models/User.js";

export const receiveLead = async (req, res) => {
    try {
        console.log("IndiaMART Lead:", req.body);

        const data = req.body?.RESPONSE || {};

        const leadData = {
            // Buyer Details
            name: data.SENDER_NAME || "",
            phone: data.SENDER_MOBILE || "",
            alternatePhone: data.SENDER_PHONE_ALT || "",
            email: data.SENDER_EMAIL || "",
            company: data.SENDER_COMPANY || "",

            // Address
            address: data.SENDER_ADDRESS || "",
            city: data.SENDER_CITY || "",
            district: data.SENDER_DISTRICT || "",
            state: data.SENDER_STATE || "",
            country: data.SENDER_COUNTRY || "",
            countryIso: data.SENDER_COUNTRY_ISO || "",
            pincode: data.SENDER_PINCODE || "",

            // GST
            gstNumber: data.SENDER_GSTIN || "",

            // Product Details
            product: data.QUERY_PRODUCT_NAME || "",
            productId: data.QUERY_PRODUCT_ID || "",
            category: data.CATEGORY_NAME || "",
            categoryId: data.CATEGORY_ID || "",
            subCategory: data.SUBCATEGORY_NAME || "",

            // Requirement
            message: data.QUERY_MESSAGE || "",
            subject: data.SUBJECT || "",
            queryType: data.QUERY_TYPE || "",
            queryTime: data.QUERY_TIME || "",
            uniqueId: data.UNIQUE_QUERY_ID || "",

            // Quantity
            quantity: data.QUANTITY || "",
            quantityUnit: data.QUANTITY_UNIT || "",

            // Price
            price: data.PRICE || "",
            priceUnit: data.PRICE_UNIT || "",
            currency: data.CURRENCY || "INR",

            // Specifications
            material: data.MATERIAL || "",
            size: data.SIZE || "",
            color: data.COLOR || "",
            brand: data.BRAND || "",
            storageRequired: data.STORAGE_REQUIRED || "",
            thickness: data.THICKNESS || "",
            finish: data.FINISH || "",

            // Enquiry
            enquiryId: data.ENQ_ID || "",
            enquiryMessage: data.ENQ_MESSAGE || "",
            enquiryType: data.ENQ_TYPE || "",

            // Seller
            receiverMobile: data.RECEIVER_MOBILE || "",
            receiverEmail: data.RECEIVER_EMAIL || "",

            // Source
            source: "IndiaMART",
            sourceId: data.SOURCE_ID || "",
            sourceName: data.SOURCE_NAME || "",
            querySource: data.QUERY_SOURCE || "",

            // Call Details
            callDuration: data.CALL_DURATION || "",
            callStatus: data.CALL_STATUS || "",

            // Misc
            ipAddress: data.IP_ADDRESS || "",
            device: data.DEVICE || "",
            browser: data.BROWSER || "",
            latitude: data.LATITUDE || "",
            longitude: data.LONGITUDE || "",

            rawResponse: req.body,

            assignedTo: null
        };

        // ✅ duplicate avoid
        const exists = await Lead.findOne({ uniqueId: leadData.uniqueId });

        if (!exists) {

            // 🔥 1. Active executives nikaal
            const executives = await User.find({ isActive: true, role: "executive" }).sort({ createdAt: 1 });

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