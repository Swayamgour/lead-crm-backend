import cron from "node-cron"
import axios from "axios"
import Lead from "../models/Lead.js"
import User from "../models/User.js"
import { sendWhatsappMessage } from "../services/whatsappService.js"

export const startIndiaMartCron = () => {

    cron.schedule("*/5 * * * *", async () => {

        console.log("Fetching IndiaMART leads...")

        try {

            // get active executives
            const executives = await User.find({
                role: "executive",
                isActive: true
            })

            if (!executives.length) {
                console.log("No executives found")
                return
            }

            let index = 0

            // call indiamart api
            const response = await axios.get(
                "https://mapi.indiamart.com/wservce/crm/crmListing/v2/",
                {
                    params: {
                        glusr_crm_key: process.env.INDIAMART_API_KEY
                    }
                }
            )

            const leads = response.data

            for (let item of leads) {

                const phone = item.SENDER_MOBILE

                const existingLead = await Lead.findOne({ phone })

                if (!existingLead) {

                    const assignedExecutive = executives[index % executives.length]

                    // create lead
                    const newLead = await Lead.create({
                        name: item.SENDER_NAME,
                        phone: phone,
                        email: item.SENDER_EMAIL,
                        product: item.QUERY_PRODUCT_NAME,
                        remarks: item.QUERY_MESSAGE,
                        source: "indiamart",
                        assignedTo: assignedExecutive._id
                    })

                    // send whatsapp message
                    const message = `Hello ${item.SENDER_NAME} 👋

                        Thank you for your enquiry for *${item.QUERY_PRODUCT_NAME}*.
                                        
                        Our sales executive will contact you shortly.
                                        
                        Team Daryoo Furniture`

                    await sendWhatsappMessage(phone, message)

                    console.log("Lead created and WhatsApp message sent:", newLead._id)

                    index++

                }

            }

            console.log("IndiaMART leads synced")

        } catch (err) {

            console.log("IndiaMART error:", err.message)

        }

    })

}