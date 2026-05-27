import axios from "axios";

import Lead from "../models/Lead.js";
import User from "../models/User.js";




// ======================================
// VERIFY WEBHOOK
// ======================================

export const verifyWebhook = (req, res) => {

    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token === VERIFY_TOKEN) {

        console.log("META WEBHOOK VERIFIED");

        return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
};



// ======================================
// RECEIVE META LEADS
// ======================================

export const receiveMetaLead = async (req, res) => {

    try {

        console.log(
            "META WEBHOOK:",
            JSON.stringify(req.body, null, 2)
        );

        const changes = req.body?.entry?.[0]?.changes?.[0];

        // only leadgen
        if (
            changes &&
            changes.field === "leadgen"
        ) {

            const leadgenId = changes.value.leadgen_id;

            console.log("LEAD ID:", leadgenId);

            // ======================================
            // FETCH FULL LEAD FROM META API
            // ======================================

            const response = await axios.get(
                `https://graph.facebook.com/v22.0/${leadgenId}`,
                {
                    params: {
                        access_token: process.env.META_ACCESS_TOKEN
                    }
                }
            );

            const metaLead = response.data;

            console.log("FULL LEAD:", metaLead);

            // ======================================
            // CONVERT FIELD ARRAY TO OBJECT
            // ======================================

            const fields = {};

            metaLead.field_data.forEach((item) => {

                fields[item.name] = item.values[0];

            });

            // ======================================
            // CREATE LEAD DATA
            // ======================================

            const leadData = {

                name: fields.full_name || "",
                phone: fields.phone_number || "",
                email: fields.email || "",
                city: fields.city || "",
                state: fields.state || "",
                company: fields.company_name || "",
                message: fields.message || "",
                source: "Meta",

                uniqueId: metaLead.id
            };

            // ======================================
            // DUPLICATE CHECK
            // ======================================

            const exists = await Lead.findOne({
                uniqueId: leadData.uniqueId
            });

            if (!exists) {

                // ======================================
                // ACTIVE EXECUTIVES
                // ======================================

                const executives = await User.find({
                    isActive: true,
                    role: "executive"
                }).sort({ createdAt: 1 });

                if (executives.length > 0) {

                    // ======================================
                    // LAST ASSIGNED LEAD
                    // ======================================

                    const lastLead = await Lead.findOne({
                        assignedTo: { $ne: null }
                    }).sort({ createdAt: -1 });

                    let nextExecutive;

                    if (!lastLead) {

                        nextExecutive = executives[0];

                    } else {

                        const lastIndex = executives.findIndex(
                            (e) =>
                                e._id.toString() ===
                                lastLead.assignedTo?.toString()
                        );

                        const nextIndex =
                            (lastIndex + 1) % executives.length;

                        nextExecutive = executives[nextIndex];
                    }

                    // ======================================
                    // ASSIGN EXECUTIVE
                    // ======================================

                    leadData.assignedTo = nextExecutive._id;

                    console.log(
                        "ASSIGNED TO:",
                        leadData.assignedTo
                    );
                }

                // ======================================
                // SAVE LEAD
                // ======================================

                await Lead.create(leadData);

                console.log("META LEAD SAVED");
            }
        }

        res.status(200).send("EVENT_RECEIVED");

    } catch (error) {

        console.error("META ERROR:", error);

        res.status(200).send("Handled");
    }
};