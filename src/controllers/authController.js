import User from "../models/User.js"
import jwt from "jsonwebtoken"

export const register = async(req,res)=>{

 try{

  const user = await User.create(req.body)

  res.json({
   success:true,
   user
  })

 }catch(error){

  res.status(500).json({
   success:false,
   message:error.message
  })

 }

}

export const login = async(req,res)=>{

 try{

  const {email,password} = req.body

  const user = await User.findOne({email})

  if(!user){
   return res.status(401).json({message:"Invalid credentials"})
  }

  const match = await user.comparePassword(password)

  if(!match){
   return res.status(401).json({message:"Invalid credentials"})
  }

  const token = jwt.sign(
   {id:user._id,role:user.role},
   process.env.JWT_SECRET,
   {expiresIn:"7d"}
  )

  res.json({
   success:true,
   token,
   user
  })

 }catch(error){

  res.status(500).json({message:error.message})

 }

}

export const getProfile = async(req,res)=>{

 const user = await User.findById(req.user.id).select("-password")

 res.json(user)

}