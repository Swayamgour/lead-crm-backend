import axios from "axios"

export const sendWhatsAppMessage = async(phone,message)=>{

 await axios.post(process.env.WHATSAPP_API,{
  phone,
  message
 })

}