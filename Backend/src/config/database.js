const mongoose = require("mongoose")

async function connectToDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("MongoDB Connected Successfully")
    } catch (err) {
        console.error("MongoDB Connection Error:", err)
        process.exit(1)
    }
}

module.exports = connectToDB