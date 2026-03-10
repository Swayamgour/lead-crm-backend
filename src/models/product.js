import mongoose from "mongoose"

const schema = new mongoose.Schema({

 name:String,

 category:{
  type:String,
  enum:["RM","FM"]
 },

 price:Number

},{timestamps:true})

export default mongoose.model("Product",schema)