import Product from "../models/product.js"

export const createProduct = async(req,res)=>{

 const product = await Product.create(req.body)

 res.json(product)

}

export const getProducts = async(req,res)=>{

 const products = await Product.find()

 res.json(products)

}

export const updateProduct = async(req,res)=>{

 const product = await Product.findByIdAndUpdate(
  req.params.id,
  req.body,
  {new:true}
 )

 res.json(product)

}

export const deleteProduct = async(req,res)=>{

 await Product.findByIdAndDelete(req.params.id)

 res.json({message:"Product deleted"})

}