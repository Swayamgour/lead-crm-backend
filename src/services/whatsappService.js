import axios from "axios"

export const sendWhatsappMessage = async (phone, message) => {

    try {

        await axios.post(
            `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: phone,
                type: "text",
                text: {
                    body: message
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        )

    } catch (error) {

        console.log("WhatsApp error:", error.message)

    }

}