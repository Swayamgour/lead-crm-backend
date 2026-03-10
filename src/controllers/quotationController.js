import Quotation from "../models/Quotation.js"

export const createQuotation = async(req,res)=>{

 const quotation = await Quotation.create(req.body)

 res.json(quotation)

}

export const getQuotations = async(req,res)=>{

 const data = await Quotation.find()
 .populate("customer")
 .populate("products.product")

 res.json(data)

}

export const getQuotationById = async(req,res)=>{

 const data = await Quotation.findById(req.params.id)

 res.json(data)

}

export const updateQuotation = async(req,res)=>{

 const data = await Quotation.findByIdAndUpdate(
  req.params.id,
  req.body,
  {new:true}
 )

 res.json(data)

}

export const deleteQuotation = async(req,res)=>{

 await Quotation.findByIdAndDelete(req.params.id)

 res.json({message:"Quotation deleted"})

}