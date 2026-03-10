import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import morgan from "morgan"

import { connectDB } from "./src/config/db.js"

import authRoutes from "./src/routes/authRoutes.js"
import userRoutes from "./src/routes/userRoutes.js"
import leadRoutes from "./src/routes/leadRoutes.js"
import followUpRoutes from "./src/routes/followUpRoutes.js"
import customerRoutes from "./src/routes/customerRoutes.js"
import productRoutes from "./src/routes/productRoutes.js"
import quotationRoutes from "./src/routes/quotationRoutes.js"
import dashboardRoutes from "./src/routes/dashboardRoutes.js"
import timelineRoutes from "./src/routes/timelineRoutes.js"

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())
app.use(morgan("dev"))

connectDB()

app.use("/uploads", express.static("uploads"))

app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/leads", leadRoutes)
app.use("/api/followups", followUpRoutes)
app.use("/api/customers", customerRoutes)
app.use("/api/products", productRoutes)
app.use("/api/quotations", quotationRoutes)
app.use("/api/TimeLine", timelineRoutes)
app.use("/api/dashboard", dashboardRoutes)

app.listen(5000, () => {
    console.log("Server running on port 5000")
})