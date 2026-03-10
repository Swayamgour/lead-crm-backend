import mongoose from "mongoose"

const schema = new mongoose.Schema({

 customer:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Customer"
 },

 products:[{

  product:{
   type:mongoose.Schema.Types.ObjectId,
   ref:"Product"
  },

  qty:Number,

  price:Number

 }],

 total:Number,

 status:{
  type:String,
  enum:["draft","sent","accepted","rejected"],
  default:"draft"
 }

},{timestamps:true})

export default mongoose.model("Quotation",schema)