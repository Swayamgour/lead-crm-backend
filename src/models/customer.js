import mongoose from "mongoose"

const schema = new mongoose.Schema({

 name:String,

 phone:String,

 email:String,

 company:String,

 products:[{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Product"
 }]

},{timestamps:true})

export default mongoose.model("Customer",schema)