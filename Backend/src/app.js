const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const multer = require("multer")

const app = express()

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))
app.use(cookieParser())

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
            callback(null, true)
        } else {
            callback(new Error("Not allowed by CORS"))
        }
    },
    credentials: true
}))

/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")

/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

/* Centralized Error Middleware */
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                message: "Resume file is too large. Max size is 10MB."
            })
        }
        return res.status(400).json({ message: err.message })
    }

    if (err && err.code === "UNSUPPORTED_FILE_TYPE") {
        return res.status(400).json({ message: err.message })
    }

    if (err) {
        console.error("Unhandled Error:", err)
        return res.status(500).json({
            message: err.message || "An unexpected server error occurred."
        })
    }

    next()
})

module.exports = app