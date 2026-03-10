import Lead from "../models/Lead.js"
import Customer from "../models/customer.js"
import FollowUp from "../models/FollowUp.js"

export const getDashboardStats = async(req,res)=>{

 const totalLeads = await Lead.countDocuments()

 const totalCustomers = await Customer.countDocuments()

 const todayFollowups = await FollowUp.countDocuments({
  followUpDate:{
   $gte:new Date().setHours(0,0,0,0)
  }
 })

 res.json({
  totalLeads,
  totalCustomers,
  todayFollowups
 })

}