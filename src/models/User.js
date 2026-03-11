// src/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';



const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["admin", "executive"],
    default: "executive"
  },
  avatar: String,
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

schema.pre("save", async function (next) {

  if (!this.isModified("password")) return next()

  this.password = await bcrypt.hash(this.password, 10)

  next()

})

schema.methods.comparePassword = function (p) {

  return bcrypt.compare(p, this.password)

}

export default mongoose.model("User", schema)

